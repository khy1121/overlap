-- Overlap: 회의(meetings)와 참여자(participants)
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null default '우리 회의 언제?' check (char_length(title) <= 60),
  start_date date not null,
  from_hour smallint not null default 9 check (from_hour between 0 and 23),
  to_hour smallint not null default 21 check (to_hour between 1 and 24),
  dur smallint not null default 2 check (dur between 1 and 12),
  expected smallint not null default 4 check (expected between 1 and 50),
  picked jsonb,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_hour < to_hour)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 30),
  avatar_url text,
  cells jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);
create index participants_meeting_idx on public.participants(meeting_id);
create index participants_user_idx on public.participants(user_id);
create index meetings_owner_idx on public.meetings(owner);

alter table public.meetings enable row level security;
alter table public.participants enable row level security;

-- 회의 멤버(만든 사람 또는 참여자)인지
create or replace function public.is_member(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meetings m where m.id = mid and m.owner = (select auth.uid()))
      or exists (select 1 from public.participants p where p.meeting_id = mid and p.user_id = (select auth.uid()));
$$;
create or replace function public.is_owner(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meetings m where m.id = mid and m.owner = (select auth.uid()));
$$;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;

-- meetings
create policy "members read meetings" on public.meetings for select to authenticated using (public.is_member(id));
create policy "users create own meetings" on public.meetings for insert to authenticated with check (owner = (select auth.uid()));
create policy "members update meetings" on public.meetings for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy "owner deletes meetings" on public.meetings for delete to authenticated using (owner = (select auth.uid()));

-- participants
create policy "members read participants" on public.participants for select to authenticated using (public.is_member(meeting_id));
create policy "members add guests" on public.participants for insert to authenticated
  with check (public.is_member(meeting_id) and (user_id is null or user_id = (select auth.uid())));
create policy "edit self, guests, or as owner" on public.participants for update to authenticated
  using (user_id = (select auth.uid()) or (user_id is null and public.is_member(meeting_id)) or public.is_owner(meeting_id))
  with check (public.is_member(meeting_id) and (user_id is null or user_id = (select auth.uid()) or public.is_owner(meeting_id)));
create policy "delete self, guests, or as owner" on public.participants for delete to authenticated
  using (user_id = (select auth.uid()) or (user_id is null and public.is_member(meeting_id)) or public.is_owner(meeting_id));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger participants_touch before update on public.participants for each row execute function public.touch_updated_at();

-- 링크만 가진 사람(로그인 전)에게 보여줄 제목
create or replace function public.meeting_preview(mid uuid)
returns table(title text, start_date date, joined int)
language sql stable security definer set search_path = '' as $$
  select m.title, m.start_date, (select count(*)::int from public.participants p where p.meeting_id = m.id)
  from public.meetings m where m.id = mid;
$$;
grant execute on function public.meeting_preview(uuid) to anon, authenticated;

-- 링크로 들어온 로그인 사용자를 참여자로 등록
create or replace function public.join_meeting(mid uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; meta jsonb;
begin
  if uid is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.meetings where id = mid) then raise exception 'meeting not found'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = uid;
  if pid is not null then return pid; end if;
  select raw_user_meta_data into meta from auth.users where id = uid;
  insert into public.participants(meeting_id, user_id, name, avatar_url)
  values (mid, uid, left(coalesce(meta->>'full_name', meta->>'name', split_part(meta->>'email','@',1), ''), 30), meta->>'avatar_url')
  returning id into pid;
  return pid;
end $$;
revoke execute on function public.join_meeting(uuid) from public, anon;
grant execute on function public.join_meeting(uuid) to authenticated;

alter publication supabase_realtime add table public.meetings, public.participants;
alter table public.participants replica identity full;
