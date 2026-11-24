-- 보안 재점검 후속 (#64). 기존 데이터·동작은 그대로예요 (적용 전에 모두 통과 확인).

-- ── 1. 중간 지점: 각 출발지를 먼저 반올림한 뒤 평균 ─────────────────────
-- 0022는 결과만 반올림해서, 출발지를 조금씩 바꿔 넣으며 반올림이 바뀌는 지점을 찾으면
-- 2명 약속에서 상대 위치를 미터 단위로 알아낼 수 있었어요.
-- 각 좌표를 소수 둘째 자리(약 1km)로 반올림한 값만 평균에 쓰면, 넣는 값을 바꿔도 상대 좌표는 1km 단위까지만 드러나요.
-- (내 정확한 좌표는 origins에 그대로 있고 본인만 읽어요 — 내 출발지에서 역까지 거리 계산용)
create or replace function public.meeting_midpoint(mid uuid)
returns table(lat double precision, lng double precision, n int) language sql security definer set search_path = '' as $$
  select case when count(*) >= 2 then round(avg(round(o.lat::numeric, 2)), 3)::double precision end,
         case when count(*) >= 2 then round(avg(round(o.lng::numeric, 2)), 3)::double precision end,
         count(*)::int
  from public.origins o join public.participants p on p.id = o.participant_id
  where p.meeting_id = mid and public.is_member(mid)
$$;
revoke execute on function public.meeting_midpoint(uuid) from public, anon;
grant execute on function public.meeting_midpoint(uuid) to authenticated;

-- ── 2. 웹 푸시 주소: 알려진 푸시 서비스만 (0022 전에 들어온 주소도 막기) ───────
delete from public.push_subscriptions
where endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com)/';
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_check2;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_check2
  check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com)/');

-- ── 3. 참여자 프로필 사진: 카카오·Google 이미지 주소만 ─────────────────────
-- 아무 주소나 넣을 수 있으면, 약속을 연 다른 사람의 IP·브라우저 정보가 그 주소로 새요(추적 이미지).
update public.participants set avatar_url = regexp_replace(avatar_url, '^http://', 'https://')
  where avatar_url ~ '^http://';
update public.participants set avatar_url = null
  where avatar_url is not null and avatar_url !~ '^https://([a-z0-9-]+\.)*(kakaocdn\.net|kakao\.com|googleusercontent\.com)/';
alter table public.participants drop constraint if exists participants_avatar_url_check;
alter table public.participants add constraint participants_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://([a-z0-9-]+\.)*(kakaocdn\.net|kakao\.com|googleusercontent\.com)/');

-- 참여할 때 넣는 사진 주소도 같은 규칙으로 (사용자 메타데이터는 본인이 바꿀 수 있어서, 허용 밖이면 비워요 — 참여는 그대로 돼요)
create or replace function public._safe_avatar(url text)
returns text language sql immutable set search_path = '' as $$
  select case when u ~ '^https://([a-z0-9-]+\.)*(kakaocdn\.net|kakao\.com|googleusercontent\.com)/' then u end
  from (select regexp_replace(coalesce(url, ''), '^http://', 'https://') as u) s
$$;
revoke execute on function public._safe_avatar(text) from public, anon, authenticated;

create or replace function public.join_meeting(mid uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; meta jsonb;
begin
  if uid is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.meetings where id = mid) then raise exception 'meeting not found'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = uid;
  if pid is not null then return pid; end if;
  select coalesce(raw_user_meta_data, '{}'::jsonb) into meta from auth.users where id = uid;
  insert into public.participants(meeting_id, user_id, name, avatar_url)
  values (
    mid, uid,
    left(coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), nullif(meta->>'nickname', ''),
                  nullif(meta->>'preferred_username', ''), nullif(meta->>'user_name', ''), ''), 30),
    public._safe_avatar(coalesce(meta->>'avatar_url', meta->>'picture'))
  )
  returning id into pid;
  return pid;
end $$;
revoke execute on function public.join_meeting(uuid) from public, anon;
grant execute on function public.join_meeting(uuid) to authenticated;
