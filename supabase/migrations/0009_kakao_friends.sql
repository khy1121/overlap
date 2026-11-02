-- 카톡 친구 중 Overlap 가입자 찾기.
-- 카카오 친구 목록은 서버 함수(kakao-friends)가 카카오에 직접 확인한 결과만 믿어요.
-- 브라우저가 보낸 카카오 ID 목록으로는 조회할 수 없게, 아래 함수는 service_role만 실행할 수 있어요.

-- 서버가 확인한 '카톡 친구' 관계 (이 관계가 있으면 같은 약속이 없어도 친구 신청 가능)
create table if not exists public.kakao_friend_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.kakao_friend_links enable row level security;
-- 정책 없음: 일반 사용자는 읽기·쓰기 모두 불가, 서버(service_role)만 다뤄요.

-- 호출한 사람(me)의 카카오 계정 ID 확인용
create or replace function public.kakao_id_of(me uuid)
returns text language sql stable security definer set search_path = '' as $$
  select provider_id from auth.identities where user_id = me and provider = 'kakao' limit 1;
$$;

-- 카카오가 확인해 준 친구 ID들 중 Overlap 가입자를 찾고, 확인된 관계를 기록해요.
create or replace function public.kakao_match(me uuid, kakao_ids text[])
returns table(user_id uuid, kakao_id text, name text, relation text)
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kakao_friend_links(user_id, friend_id, verified_at)
  select me, i.user_id, now() from auth.identities i
  where i.provider = 'kakao' and i.provider_id = any(kakao_ids) and i.user_id <> me
  on conflict (user_id, friend_id) do update set verified_at = excluded.verified_at;

  return query
  select i.user_id, i.provider_id, p.name,
    case
      when exists (select 1 from public.friendships f where f.user_id = me and f.friend_id = i.user_id) then 'friend'
      when exists (select 1 from public.friend_requests r where r.from_id = me and r.to_id = i.user_id and r.status = 'pending') then 'pending'
      when exists (select 1 from public.friend_requests r where r.from_id = i.user_id and r.to_id = me and r.status = 'pending') then 'incoming'
      else 'none'
    end
  from auth.identities i join public.profiles p on p.id = i.user_id
  where i.provider = 'kakao' and i.provider_id = any(kakao_ids) and i.user_id <> me;
end $$;

revoke execute on function public.kakao_id_of(uuid) from public, anon, authenticated;
revoke execute on function public.kakao_match(uuid, text[]) from public, anon, authenticated;
grant execute on function public.kakao_id_of(uuid) to service_role;
grant execute on function public.kakao_match(uuid, text[]) to service_role;

-- 친구 신청: 같은 약속에 참여했거나, 서버가 확인한 카톡 친구면 허용
create or replace function public.request_friend(target uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'login required'; end if;
  if not exists (
    select 1 from public.participants a join public.participants b on a.meeting_id = b.meeting_id
    where a.user_id = me and b.user_id = target
  ) and not exists (
    select 1 from public.kakao_friend_links k where k.user_id = me and k.friend_id = target
  ) then raise exception 'not met'; end if;
  return public._request_friend(me, target);
end $$;
revoke execute on function public.request_friend(uuid) from public, anon;
grant execute on function public.request_friend(uuid) to authenticated;
