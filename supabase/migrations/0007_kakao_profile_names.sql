-- 카카오 로그인 사용자: 이름이 full_name이 아니라 name·nickname 등에 들어올 수 있어서 차례로 확인해요.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles(id, name, invite_code)
  values (
    new.id,
    left(coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), nullif(meta->>'nickname', ''),
                  nullif(meta->>'preferred_username', ''), nullif(meta->>'user_name', ''), ''), 30),
    public.gen_invite_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

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
    coalesce(meta->>'avatar_url', meta->>'picture')
  )
  returning id into pid;
  return pid;
end $$;
revoke execute on function public.join_meeting(uuid) from public, anon;
grant execute on function public.join_meeting(uuid) to authenticated;
