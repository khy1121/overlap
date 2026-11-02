-- 약속 기간을 시작일~종료일로(1~14일), 만나는 시간을 최대 12시간(30분 단위 24칸)까지.
alter table public.meetings add column if not exists days smallint not null default 7;
alter table public.meetings drop constraint if exists meetings_days_check;
alter table public.meetings add constraint meetings_days_check check (days between 1 and 14);

alter table public.meetings drop constraint if exists meetings_dur_check;
alter table public.meetings add constraint meetings_dur_check check (dur between 1 and 24);

-- create_meeting에 기간(p_days) 추가. 기본값 7이라 예전 화면(6개 인자)에서 불러도 그대로 동작해요.
drop function if exists public.create_meeting(text, date, smallint, smallint, smallint, smallint);
create or replace function public.create_meeting(p_title text, p_start date, p_from smallint, p_to smallint, p_dur smallint, p_expected smallint, p_days smallint default 7)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'login required'; end if;
  insert into public.meetings(title, start_date, from_hour, to_hour, dur, expected, days, owner)
  values (coalesce(nullif(trim(p_title),''),'우리 언제 만나?'), p_start, p_from, p_to, p_dur, p_expected, p_days, uid)
  returning id into mid;
  perform public.join_meeting(mid);
  return mid;
end $$;
revoke execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint,smallint) from public, anon;
grant execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint,smallint) to authenticated;
