-- 약속 기간의 양 끝을 시각까지 정해요. 예: 11/5 12:00 ~ 11/7 22:00
-- start_hour: 첫날 시작 시각(0~23), end_hour: 마지막 날 끝 시각(1~24). 비어 있으면 하루 시간대(from_hour~to_hour)를 그대로 써요.
-- 시간표 행은 min(from_hour, start_hour) ~ max(to_hour, end_hour)로 펼치고,
-- 첫날의 시작 전·마지막 날의 끝 후·가운데 날의 하루 시간대 밖 칸은 막아요(화면 계산).
alter table public.meetings add column if not exists start_hour smallint;
alter table public.meetings add column if not exists end_hour smallint;
alter table public.meetings drop constraint if exists meetings_start_hour_check;
alter table public.meetings add constraint meetings_start_hour_check check (start_hour is null or start_hour between 0 and 23);
alter table public.meetings drop constraint if exists meetings_end_hour_check;
alter table public.meetings add constraint meetings_end_hour_check check (end_hour is null or end_hour between 1 and 24);

-- create_meeting에 시작·끝 시각 추가. 기본값 null이라 예전 화면(7개 인자)에서 불러도 그대로 동작해요.
drop function if exists public.create_meeting(text, date, smallint, smallint, smallint, smallint, smallint);
create or replace function public.create_meeting(
  p_title text, p_start date, p_from smallint, p_to smallint, p_dur smallint, p_expected smallint,
  p_days smallint default 7, p_start_hour smallint default null, p_end_hour smallint default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'login required'; end if;
  insert into public.meetings(title, start_date, from_hour, to_hour, dur, expected, days, start_hour, end_hour, owner)
  values (coalesce(nullif(trim(p_title),''),'우리 언제 만나?'), p_start, p_from, p_to, p_dur, p_expected, p_days, p_start_hour, p_end_hour, uid)
  returning id into mid;
  perform public.join_meeting(mid);
  return mid;
end $$;
revoke execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint,smallint,smallint,smallint) from public, anon;
grant execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint,smallint,smallint,smallint) to authenticated;
