-- 참석자 꼭/선택/불참과 '모두 되면 자동으로 확정'
--
-- participants.role: 'required'(꼭, 기본) | 'optional'(선택: 추천에 반만 반영, 확정 조건에서 빠짐) | 'absent'(불참: 계산에서 빠짐)
--   약속 만든 사람이 정해요. 기존 정책("edit self, guests, or as owner")으로 만든 사람이 다른 참여자 행을 바꿀 수 있어요.
-- meetings.auto_confirm: 켜면 꼭 와야 하는 사람이 모두 가능한 시간이 생기는 순간 그 시간으로 확정해요(앱에서 처리).
--   확정되면 기존 notify_confirmed 트리거가 알림을 보내요.
-- 둘 다 기본값이 있는 '추가'라서 예전 화면·예전 앱도 그대로 동작해요.

alter table public.participants
  add column if not exists role text not null default 'required'
  check (role in ('required', 'optional', 'absent'));

alter table public.meetings
  add column if not exists auto_confirm boolean not null default false;
