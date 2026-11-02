create or replace function public.create_meeting(p_title text, p_start date, p_from smallint, p_to smallint, p_dur smallint, p_expected smallint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'login required'; end if;
  insert into public.meetings(title, start_date, from_hour, to_hour, dur, expected, owner)
  values (coalesce(nullif(trim(p_title),''),'우리 회의 언제?'), p_start, p_from, p_to, p_dur, p_expected, uid)
  returning id into mid;
  perform public.join_meeting(mid);
  return mid;
end $$;
revoke execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint) from public, anon;
grant execute on function public.create_meeting(text,date,smallint,smallint,smallint,smallint) to authenticated;
