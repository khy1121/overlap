-- 보안 점검 결과 수정 (#58). 기존 데이터·기존 앱 동작은 그대로예요.

-- ── 1. 약속 주인·id·만든 시각은 사용자가 바꿀 수 없어요 ─────────────────
-- 'members update meetings' 정책 때문에 멤버 누구나 owner를 바꾼 뒤 삭제할 수 있었어요.
-- 사용자 요청(authenticated/anon 역할)일 때만 막고, 서버 함수(탈퇴 때 주인 넘기기 등, 함수 주인 권한으로 실행)는 그대로 둬요.
create or replace function public._guard_meeting_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.owner is distinct from old.owner then raise exception 'owner cannot be changed' using errcode = '42501'; end if;
    if new.id is distinct from old.id then raise exception 'id cannot be changed' using errcode = '42501'; end if;
    if new.created_at is distinct from old.created_at then raise exception 'created_at cannot be changed' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_meeting_update on public.meetings;
create trigger guard_meeting_update before update on public.meetings
  for each row execute function public._guard_meeting_update();
revoke execute on function public._guard_meeting_update() from public, anon, authenticated;

-- ── 2. 장소 주소는 http/https만 (javascript: 같은 주소 저장 막기) ─────────
-- 카카오 장소 주소가 http://place.map.kakao.com/… 이라 http도 허용해요. 앱·웹은 열 때 https로 바꿔 열어요.
alter table public.meetings drop constraint if exists meetings_place_url_check;
alter table public.meetings add constraint meetings_place_url_check
  check (place is null or place->>'url' is null or place->>'url' ~ '^https?://[^\s]+$');

-- ── 3. 중간 지점은 약 1km 단위로 반올림 ─────────────────────────────
-- 정확한 평균이면 내 출발지를 일부러 넣어 다른 사람 출발지를 거꾸로 계산할 수 있어요.
-- 소수 둘째 자리(위도 약 1.1km)로 반올림해서 돌려줘요. 근처 역 찾기(반경 3km)에는 충분해요.
create or replace function public.meeting_midpoint(mid uuid)
returns table(lat double precision, lng double precision, n int) language sql security definer set search_path = '' as $$
  select case when count(*) >= 2 then round(avg(o.lat)::numeric, 2)::double precision end,
         case when count(*) >= 2 then round(avg(o.lng)::numeric, 2)::double precision end,
         count(*)::int
  from public.origins o join public.participants p on p.id = o.participant_id
  where p.meeting_id = mid and public.is_member(mid)
$$;
revoke execute on function public.meeting_midpoint(uuid) from public, anon;
grant execute on function public.meeting_midpoint(uuid) to authenticated;

-- ── 4. 웹 푸시 등록 주소는 알려진 푸시 서비스만 ─────────────────────
-- https면 아무 주소나 받아서, 테스트 알림으로 서버가 임의 주소에 요청을 보낼 수 있었어요.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'login required'; end if;
  if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com)/' then
    raise exception 'bad endpoint';
  end if;
  -- 이 기기(endpoint)는 이제 나에게 알림을 받아요 (이전 계정 연결은 해제)
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, left(p_ua, 300));
end $$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
