-- 일정(participants 행)은 각자 본인 것만 추가·수정·삭제할 수 있게 좁혀요.
-- 이전: 계정 없는 사람(게스트) 추가, 게스트 일정 수정, 회의 만든 사람이 다른 참여자 일정 수정·삭제 가능.
-- 친구 초대(invite_friend)와 링크 참여(join_meeting)는 security definer 함수라 영향 없어요.

drop policy if exists "members add guests" on public.participants;
drop policy if exists "edit self, guests, or as owner" on public.participants;
drop policy if exists "delete self, guests, or as owner" on public.participants;

create policy "members add self" on public.participants for insert to authenticated
  with check (public.is_member(meeting_id) and user_id = (select auth.uid()));

create policy "edit own schedule" on public.participants for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own row" on public.participants for delete to authenticated
  using (user_id = (select auth.uid()));
