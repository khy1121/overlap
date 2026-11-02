-- 친구 신청 → 수락/거절. 코드를 입력하면 바로 친구가 되던 방식을 '신청'으로 바꿔요.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
-- 같은 두 사람 사이에 대기 중인 신청은 한 방향에 하나만
create unique index if not exists friend_requests_pending_uq on public.friend_requests(from_id, to_id) where status = 'pending';
create index if not exists friend_requests_to_idx on public.friend_requests(to_id) where status = 'pending';
alter table public.friend_requests enable row level security;
drop policy if exists "read own requests" on public.friend_requests;
create policy "read own requests" on public.friend_requests for select to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
-- 쓰기는 아래 함수로만

-- 친구 맺기(양방향) + 두 사람 사이 대기 중 신청 정리
create or replace function public._make_friends(a uuid, b uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.friendships(user_id, friend_id) values (a, b), (b, a) on conflict do nothing;
  update public.friend_requests set status = 'accepted', responded_at = now()
  where status = 'pending' and ((from_id = a and to_id = b) or (from_id = b and to_id = a));
$$;
revoke execute on function public._make_friends(uuid, uuid) from public, anon, authenticated;

-- 신청 보내기 (공통). 결과: 'sent' 신청함 | 'friends' 상대도 나에게 신청해 둬서 바로 친구 | 'already' 이미 친구 | 'pending' 이미 신청함
create or replace function public._request_friend(me uuid, target uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if me is null then raise exception 'login required'; end if;
  if target = me then raise exception 'own code'; end if;
  if exists (select 1 from public.friendships where user_id = me and friend_id = target) then return 'already'; end if;
  if exists (select 1 from public.friend_requests where from_id = target and to_id = me and status = 'pending') then
    perform public._make_friends(me, target);
    return 'friends';
  end if;
  if exists (select 1 from public.friend_requests where from_id = me and to_id = target and status = 'pending') then return 'pending'; end if;
  insert into public.friend_requests(from_id, to_id) values (me, target);
  return 'sent';
end $$;
revoke execute on function public._request_friend(uuid, uuid) from public, anon, authenticated;

-- 친구 코드로 신청
create or replace function public.request_friend_by_code(code text)
returns table(friend_id uuid, name text, result text)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); target public.profiles%rowtype;
begin
  if me is null then raise exception 'login required'; end if;
  select * into target from public.profiles where invite_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));
  if target.id is null then raise exception 'code not found'; end if;
  return query select target.id, target.name, public._request_friend(me, target.id);
end $$;

-- 같은 약속에 참여한 사람에게 신청 (모르는 사람에게 마구 보내지 못하게)
create or replace function public.request_friend(target uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'login required'; end if;
  if not exists (
    select 1 from public.participants a join public.participants b on a.meeting_id = b.meeting_id
    where a.user_id = me and b.user_id = target
  ) then raise exception 'not met'; end if;
  return public._request_friend(me, target);
end $$;

-- 받은 신청 수락/거절
create or replace function public.respond_friend_request(req uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.friend_requests%rowtype;
begin
  select * into r from public.friend_requests where id = req and to_id = me and status = 'pending';
  if r.id is null then raise exception 'request not found'; end if;
  if accept then perform public._make_friends(me, r.from_id);
  else update public.friend_requests set status = 'declined', responded_at = now() where id = req;
  end if;
end $$;

-- 보낸 신청 취소
create or replace function public.cancel_friend_request(req uuid)
returns void language sql security definer set search_path = '' as $$
  update public.friend_requests set status = 'canceled', responded_at = now()
  where id = req and from_id = (select auth.uid()) and status = 'pending';
$$;

-- 대기 중인 신청 목록 (받은 것·보낸 것)
create or replace function public.my_friend_requests()
returns table(id uuid, direction text, user_id uuid, name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, case when r.to_id = (select auth.uid()) then 'in' else 'out' end,
         case when r.to_id = (select auth.uid()) then r.from_id else r.to_id end,
         p.name, r.created_at
  from public.friend_requests r
  join public.profiles p on p.id = case when r.to_id = (select auth.uid()) then r.from_id else r.to_id end
  where r.status = 'pending' and (r.to_id = (select auth.uid()) or r.from_id = (select auth.uid()))
  order by r.created_at desc;
$$;

-- 예전 화면이 부르는 add_friend_by_code도 이제 '신청'으로 동작 (바로 친구 X)
create or replace function public.add_friend_by_code(code text)
returns table(friend_id uuid, name text)
language plpgsql security definer set search_path = '' as $$
begin
  return query select r.friend_id, r.name from public.request_friend_by_code(code) r;
end $$;

do $$
declare f text;
begin
  foreach f in array array['request_friend_by_code(text)', 'request_friend(uuid)', 'respond_friend_request(uuid, boolean)',
                           'cancel_friend_request(uuid)', 'my_friend_requests()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
