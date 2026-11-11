-- 만날 장소 정하기: 각자 출발지를 넣으면 중간 지점 근처 역·가게를 추천하고, 고른 장소를 약속에 붙여요.
--
-- origins: 출발지 좌표(민감). 본인만 읽고 써요. 중간점은 서버 함수(meeting_midpoint)가 안에서만 모아 계산해요.
-- participants.origin_set / origin_label: 다른 참여자에게 보이는 정보.
--   origin_set = 입력했는지, origin_label = 공개를 켰을 때만 동 이름(예: '성북구 삼선동'), 껐으면 null.
-- meetings.place: 확정한 장소 { name, address, lat, lng, kakao_id, url }. 멤버 누구나 바꿀 수 있어요(기존 정책).

create table if not exists public.origins (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  label text not null default '' check (char_length(label) <= 40),
  is_public boolean not null default false,
  set_at timestamptz not null default now()
);
alter table public.origins enable row level security;

-- 내 참여 행에 붙은 출발지만
create policy "own origin" on public.origins for all to authenticated
  using (exists (select 1 from public.participants p where p.id = participant_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.participants p where p.id = participant_id and p.user_id = (select auth.uid())));

alter table public.participants add column if not exists origin_set boolean not null default false;
alter table public.participants add column if not exists origin_label text check (origin_label is null or char_length(origin_label) <= 40);

alter table public.meetings add column if not exists place jsonb;

-- 출발지 저장(덮어쓰기). 공개 여부에 따라 참여자 행의 표시 정보를 함께 맞춰요.
create or replace function public.set_origin(mid uuid, p_lat double precision, p_lng double precision, p_label text, p_public boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; lbl text := left(coalesce(trim(p_label), ''), 40);
begin
  if uid is null then raise exception 'login required'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = uid;
  if pid is null then raise exception 'not a member'; end if;
  insert into public.origins(participant_id, lat, lng, label, is_public, set_at)
  values (pid, p_lat, p_lng, lbl, coalesce(p_public, false), now())
  on conflict (participant_id) do update
    set lat = excluded.lat, lng = excluded.lng, label = excluded.label, is_public = excluded.is_public, set_at = now();
  update public.participants
    set origin_set = true, origin_label = case when coalesce(p_public, false) then nullif(lbl, '') else null end
    where id = pid;
end $$;

-- 공개 여부만 바꾸기
create or replace function public.set_origin_public(mid uuid, p_public boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; lbl text;
begin
  if uid is null then raise exception 'login required'; end if;
  select p.id, o.label into pid, lbl from public.participants p join public.origins o on o.participant_id = p.id
    where p.meeting_id = mid and p.user_id = uid;
  if pid is null then raise exception 'no origin'; end if;
  update public.origins set is_public = coalesce(p_public, false) where participant_id = pid;
  update public.participants set origin_label = case when coalesce(p_public, false) then nullif(lbl, '') else null end where id = pid;
end $$;

-- 내 출발지 지우기
create or replace function public.clear_origin(mid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'login required'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = uid;
  if pid is null then return; end if;
  delete from public.origins where participant_id = pid;
  update public.participants set origin_set = false, origin_label = null where id = pid;
end $$;

-- 출발지들의 중심점. 멤버만, 2명 이상 입력했을 때만 좌표를 돌려줘요(1명이면 그 사람 위치가 드러나니까 null).
-- 호출한 사람 본인의 출발지까지 거리 계산은 클라이언트가 자기 좌표로 해요.
create or replace function public.meeting_midpoint(mid uuid)
returns table(lat double precision, lng double precision, n int) language sql security definer set search_path = '' as $$
  select case when count(*) >= 2 then avg(o.lat) end,
         case when count(*) >= 2 then avg(o.lng) end,
         count(*)::int
  from public.origins o join public.participants p on p.id = o.participant_id
  where p.meeting_id = mid and public.is_member(mid)
$$;

revoke execute on function public.set_origin(uuid,double precision,double precision,text,boolean) from public, anon;
revoke execute on function public.set_origin_public(uuid,boolean) from public, anon;
revoke execute on function public.clear_origin(uuid) from public, anon;
revoke execute on function public.meeting_midpoint(uuid) from public, anon;
grant execute on function public.set_origin(uuid,double precision,double precision,text,boolean) to authenticated;
grant execute on function public.set_origin_public(uuid,boolean) to authenticated;
grant execute on function public.clear_origin(uuid) to authenticated;
grant execute on function public.meeting_midpoint(uuid) to authenticated;
