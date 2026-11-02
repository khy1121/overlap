-- 이전에 같은 회의에 참여했던 사람(=친구) 목록. mid가 주어지면 그 회의 참여 여부도 함께.
create or replace function public.my_contacts(mid uuid default null)
returns table(user_id uuid, name text, avatar_url text, meetings int, in_meeting boolean)
language sql stable security definer set search_path = '' as $$
  with mine as (select meeting_id from public.participants where user_id = (select auth.uid())),
  others as (
    select p.user_id, p.name, p.avatar_url, p.created_at
    from public.participants p join mine on mine.meeting_id = p.meeting_id
    where p.user_id is not null and p.user_id <> (select auth.uid())
  )
  select o.user_id,
         (array_agg(o.name order by o.created_at desc))[1],
         (array_agg(o.avatar_url order by o.created_at desc))[1],
         count(*)::int,
         coalesce(bool_or(exists(select 1 from public.participants x where x.meeting_id = mid and x.user_id = o.user_id)), false)
  from others o group by o.user_id
  order by count(*) desc, max(o.created_at) desc
  limit 100;
$$;
revoke execute on function public.my_contacts(uuid) from public, anon;
grant execute on function public.my_contacts(uuid) to authenticated;

-- 함께했던 사람을 회의에 바로 추가
create or replace function public.invite_contact(mid uuid, target uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); pid uuid; src record;
begin
  if me is null then raise exception 'login required'; end if;
  if not public.is_member(mid) then raise exception 'not a member'; end if;
  if not exists (
    select 1 from public.participants a join public.participants b on a.meeting_id = b.meeting_id
    where a.user_id = me and b.user_id = target
  ) then raise exception 'not a contact'; end if;
  select id into pid from public.participants where meeting_id = mid and user_id = target;
  if pid is not null then return pid; end if;
  select name, avatar_url into src from public.participants where user_id = target order by created_at desc limit 1;
  insert into public.participants(meeting_id, user_id, name, avatar_url) values (mid, target, coalesce(src.name,''), src.avatar_url)
  returning id into pid;
  return pid;
end $$;
revoke execute on function public.invite_contact(uuid, uuid) from public, anon;
grant execute on function public.invite_contact(uuid, uuid) to authenticated;
