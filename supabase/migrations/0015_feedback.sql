-- 의견 보내기(버그·개선 아이디어). 로그인한 사용자만 보낼 수 있고, '익명'이면 계정 정보를 저장하지 않아요.
-- 새 의견이 오면 관리자에게 푸시 알림. 내용은 대시보드의 feedback 테이블에서 확인해요.

-- 관리자 (의견 알림을 받을 계정)
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security; -- 정책 없음: 일반 사용자 접근 불가
insert into public.app_admins(user_id) values ('fa5aaa1f-12de-4983-a3bf-f1ed5f09a1cf') on conflict do nothing;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null, -- 익명이면 null (탈퇴해도 의견은 익명으로 남음)
  kind text not null check (kind in ('bug', 'idea', 'etc')),
  message text not null check (char_length(message) between 5 and 2000),
  page text check (char_length(page) <= 200),
  app_version text check (char_length(app_version) <= 80),
  user_agent text check (char_length(user_agent) <= 300),
  status text not null default 'new' check (status in ('new', 'checked', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
alter table public.feedback enable row level security; -- 정책 없음: 쓰기는 아래 함수로만, 읽기는 관리자(대시보드)만

create or replace function public.submit_feedback(p_kind text, p_message text, p_anonymous boolean, p_page text default null, p_version text default null, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); msg text := btrim(coalesce(p_message, '')); admins uuid[];
begin
  if me is null then raise exception 'login required'; end if;
  if p_kind not in ('bug', 'idea', 'etc') then raise exception 'bad kind'; end if;
  if char_length(msg) < 5 then raise exception 'too short'; end if;
  if char_length(msg) > 2000 then raise exception 'too long'; end if;
  -- 도배 방지: 실명 의견은 한 사람당 시간당 5건, 익명 의견은 전체 시간당 30건
  if not p_anonymous and (select count(*) from public.feedback where user_id = me and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limited';
  end if;
  if p_anonymous and (select count(*) from public.feedback where user_id is null and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limited';
  end if;

  insert into public.feedback(user_id, kind, message, page, app_version, user_agent)
  values (case when p_anonymous then null else me end, p_kind, msg, left(p_page, 200), left(p_version, 80), left(p_ua, 300));

  select array_agg(user_id) into admins from public.app_admins;
  perform public._push(admins, 'feedback',
    case p_kind when 'bug' then '🐞 새 버그 신고' when 'idea' then '💡 새 개선 아이디어' else '💬 새 의견' end,
    left(msg, 120), '/');
end $$;
revoke execute on function public.submit_feedback(text, text, boolean, text, text, text) from public, anon;
grant execute on function public.submit_feedback(text, text, boolean, text, text, text) to authenticated;
