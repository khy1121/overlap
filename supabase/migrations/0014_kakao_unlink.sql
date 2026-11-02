-- 카카오 연결 해제 웹훅 처리 (서버 함수 kakao-unlink 전용, service_role만 실행)
-- 카카오 회원번호로 계정을 찾아서:
--   다른 로그인 수단(이름·생년월일)이 있으면 → 카카오 연결 정보와 카톡 친구 관계만 지우고 'unlinked'
--   카카오로만 가입한 계정이면 → 로그인 수단이 사라지므로 'delete' (서버 함수가 회원 탈퇴와 같게 삭제)
create or replace function public.handle_kakao_unlink(kakao_id text)
returns table(user_id uuid, action text)
language plpgsql security definer set search_path = '' as $$
declare uid uuid; others int;
begin
  select i.user_id into uid from auth.identities i where i.provider = 'kakao' and i.provider_id = kakao_id limit 1;
  if uid is null then
    return query select null::uuid, 'not_found'::text;
    return;
  end if;
  select count(*) into others from auth.identities i where i.user_id = uid and i.provider <> 'kakao';
  if others > 0 then
    delete from auth.identities i where i.user_id = uid and i.provider = 'kakao';
    delete from public.kakao_friend_links k where k.user_id = uid or k.friend_id = uid;
    return query select uid, 'unlinked'::text;
  else
    return query select uid, 'delete'::text;
  end if;
end $$;
revoke execute on function public.handle_kakao_unlink(text) from public, anon, authenticated;
grant execute on function public.handle_kakao_unlink(text) to service_role;
