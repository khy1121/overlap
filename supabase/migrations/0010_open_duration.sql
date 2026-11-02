-- 만나는 시간 '미정': dur를 비워 두면(null) 길이 없이 시작 시각만 정해요.
-- 기존 범위 검사(1~24칸)는 null이면 통과해서 그대로 둬요.
alter table public.meetings alter column dur drop not null;
