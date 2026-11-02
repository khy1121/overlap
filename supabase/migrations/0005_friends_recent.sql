-- 친구 목록: 가장 최근에 같은 회의(일정)가 잡힌 순서로, 페이지 단위(lim, off)로 읽어요.
-- 회의 날짜 = 확정됐으면 확정된 날, 아니면 회의 시작일. 함께한 회의가 없으면 맨 뒤(이름순).
create or replace function public.my_friends_recent(lim int default 10, off int default 0)
returns table(user_id uuid, name text, last_title text, last_date date, total bigint)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  shared as (
    select distinct on (fp.user_id)
           fp.user_id as friend_id, m.title,
           coalesce(m.start_date + (m.picked->>'d')::int, m.start_date) as d
    from public.participants mine
    join public.participants fp on fp.meeting_id = mine.meeting_id and fp.user_id <> mine.user_id
    join public.meetings m on m.id = mine.meeting_id
    where mine.user_id = (select id from me) and fp.user_id is not null
    order by fp.user_id, coalesce(m.start_date + (m.picked->>'d')::int, m.start_date) desc, m.created_at desc
  )
  select f.friend_id, p.name, s.title, s.d, count(*) over ()
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  left join shared s on s.friend_id = f.friend_id
  where f.user_id = (select id from me)
  order by s.d desc nulls last, p.name
  limit greatest(1, least(lim, 50)) offset greatest(0, off);
$$;

revoke execute on function public.my_friends_recent(int, int) from public, anon;
grant execute on function public.my_friends_recent(int, int) to authenticated;
