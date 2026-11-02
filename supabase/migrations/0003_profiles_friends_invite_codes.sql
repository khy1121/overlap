-- 계정별 프로필과 초대 코드
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 30),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));

-- 헷갈리는 글자(0/O, 1/I/L)를 뺀 8자리 코드
create or replace function public.gen_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where invite_code = code);
  end loop;
  return code;
end $$;
revoke execute on function public.gen_invite_code() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name, invite_code)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 30), public.gen_invite_code())
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles(id, name, invite_code)
select u.id, left(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), 30), public.gen_invite_code()
from auth.users u on conflict (id) do nothing;

-- 친구 관계(양방향으로 두 줄 저장)
create table public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index friendships_friend_idx on public.friendships(friend_id);
alter table public.friendships enable row level security;
create policy "read own friendships" on public.friendships for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.my_profile()
returns table(name text, invite_code text)
language sql stable security definer set search_path = '' as $$
  select p.name, p.invite_code from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.add_friend_by_code(code text)
returns table(friend_id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); target public.profiles%rowtype;
begin
  if me is null then raise exception 'login required'; end if;
  select * into target from public.profiles where invite_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));
  if target.id is null then raise exception 'code not found'; end if;
  if target.id = me then raise exception 'own code'; end if;
  insert into public.friendships(user_id, friend_id) values (me, target.id), (target.id, me) on conflict do nothing;
  return query select target.id, target.name;
end $$;

create or replace function public.remove_friend(target uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.friendships
  where (user_id = (select auth.uid()) and friend_id = target) or (user_id = target and friend_id = (select auth.uid()));
$$;

create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = '' as $$
declare c text := public.gen_invite_code();
begin
  update public.profiles set invite_code = c where id = auth.uid();
  return c;
end $$;

create or replace function public.my_friends(mid uuid default null)
returns table(user_id uuid, name text, in_meeting boolean)
language sql stable security definer set search_path = '' as $$
  select f.friend_id, p.name,
         exists(select 1 from public.participants x where x.meeting_id = mid and x.user_id = f.friend_id)
  from public.friendships f join public.profiles p on p.id = f.friend_id
  where f.user_id = (select auth.uid())
  order by p.name;
$$;

create or replace function public.invite_friend(mid uuid, target uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); pid uuid; nm text;
begin
  if me is null then raise exception 'login required'; end if;
  if not public.is_member(mid) then raise exception 'not a member'; end if;
  if not exists (select 1 from public.friendships where user_id = me and friend_id = target) then raise exception 'not a friend'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = target;
  if pid is not null then return pid; end if;
  select name into nm from public.profiles where id = target;
  insert into public.participants(meeting_id, user_id, name) values (mid, target, coalesce(nm, '')) returning id into pid;
  return pid;
end $$;

do $$
declare f text;
begin
  foreach f in array array['my_profile()','add_friend_by_code(text)','remove_friend(uuid)','regenerate_invite_code()','my_friends(uuid)','invite_friend(uuid, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
