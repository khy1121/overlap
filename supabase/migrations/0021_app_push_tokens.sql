-- 앱(네이티브) 알림: Expo 푸시 토큰. 웹 푸시(push_subscriptions)는 그대로 두고 '추가'만 해요.
-- 발송은 같은 push-send 함수가 웹 구독과 앱 토큰 둘 다로 보내요 (알림 종류별 설정도 같이 따라요)

create table if not exists public.app_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) <= 200),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now()
);
create index if not exists app_push_tokens_user_idx on public.app_push_tokens(user_id);
alter table public.app_push_tokens enable row level security;
drop policy if exists "read own app tokens" on public.app_push_tokens;
create policy "read own app tokens" on public.app_push_tokens for select to authenticated using (user_id = (select auth.uid()));
-- 쓰기는 아래 함수로만 (같은 기기를 다른 계정으로 다시 쓰는 경우까지 처리)

create or replace function public.save_app_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'login required'; end if;
  if p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'bad token'; end if;
  if p_platform not in ('android', 'ios') then raise exception 'bad platform'; end if;
  -- 이 기기는 이제 나에게 알림을 받아요 (이전 계정 연결은 해제)
  delete from public.app_push_tokens where token = p_token;
  insert into public.app_push_tokens(user_id, token, platform) values (me, p_token, p_platform);
end $$;

create or replace function public.remove_app_push_token(p_token text)
returns void language sql security definer set search_path = '' as $$
  delete from public.app_push_tokens where token = p_token and user_id = (select auth.uid());
$$;

revoke execute on function public.save_app_push_token(text, text) from public, anon;
revoke execute on function public.remove_app_push_token(text) from public, anon;
grant execute on function public.save_app_push_token(text, text) to authenticated;
grant execute on function public.remove_app_push_token(text) to authenticated;
