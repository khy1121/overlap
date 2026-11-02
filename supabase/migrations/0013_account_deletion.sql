-- 회원 탈퇴 준비: 내가 만든 약속은 다른 참여자에게 넘기고, 혼자인 약속은 삭제해요.
-- 그다음 서버 함수(delete-account)가 계정을 지우면 나머지(프로필·참여 기록·친구·신청·알림 기기·설정)는
-- 외래 키 on delete cascade로 함께 지워져요.
create or replace function public.prepare_account_deletion(me uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m record; heir uuid;
begin
  for m in select id from public.meetings where owner = me loop
    select user_id into heir from public.participants
    where meeting_id = m.id and user_id is not null and user_id <> me
    order by created_at limit 1;
    if heir is null then
      delete from public.meetings where id = m.id;
    else
      update public.meetings set owner = heir where id = m.id;
    end if;
  end loop;
end $$;
revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
