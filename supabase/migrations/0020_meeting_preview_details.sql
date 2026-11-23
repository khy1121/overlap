-- 초대 링크로 들어온 로그인 전 화면에 보여 줄 정보를 늘려요:
-- 기간(days), 하루 시간대(from_hour~to_hour), 첫날·마지막 날 시각, 만나는 길이(dur), 만든 사람 표시 이름(host_name).
-- host_name은 약속 참여자 목록에 이미 보이는 표시 이름이에요(생년월일·연락처 같은 건 없어요).
-- 돌려주는 칸이 바뀌어 create or replace로는 안 돼서 지웠다가 다시 만들어요.
-- 예전 화면은 title·start_date·joined만 읽으므로 그대로 동작해요.

drop function if exists public.meeting_preview(uuid);

create function public.meeting_preview(mid uuid)
returns table(
  title text,
  start_date date,
  joined int,
  days smallint,
  from_hour smallint,
  to_hour smallint,
  start_hour smallint,
  end_hour smallint,
  dur smallint,
  host_name text
)
language sql stable security definer set search_path = '' as $$
  select
    m.title,
    m.start_date,
    (select count(*)::int from public.participants p where p.meeting_id = m.id),
    m.days,
    m.from_hour,
    m.to_hour,
    m.start_hour,
    m.end_hour,
    m.dur,
    (select p.name from public.participants p where p.meeting_id = m.id and p.user_id = m.owner order by p.created_at limit 1)
  from public.meetings m
  where m.id = mid;
$$;

grant execute on function public.meeting_preview(uuid) to anon, authenticated;
