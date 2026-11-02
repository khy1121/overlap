-- 앱 업데이트 소식 알림: 배포마다가 아니라, 소식을 '발행'할 때만 알림을 켠 모든 사용자에게 보내요.
-- 발행 방법(관리자): insert into public.app_releases(title, body) values ('새 기능: …', '…');

alter table public.notification_prefs add column if not exists updates boolean not null default true;

create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  body text not null default '' check (char_length(body) <= 160),
  created_at timestamptz not null default now()
);
alter table public.app_releases enable row level security;
-- 로그인한 사용자는 소식을 읽을 수 있어요 (앱 안 '새 소식' 등에 쓸 수 있게). 쓰기는 관리자(SQL)만.
drop policy if exists "read releases" on public.app_releases;
create policy "read releases" on public.app_releases for select to authenticated using (true);

-- 소식이 발행되면 알림을 켠 모든 사용자에게 (서버 함수가 한 번에 200명까지 받아서 나눠 보내요)
create or replace function public._notify_release()
returns trigger language plpgsql security definer set search_path = '' as $$
declare batch uuid[];
begin
  for batch in
    select array_agg(user_id) from (
      select user_id, (row_number() over (order by user_id) - 1) / 200 as grp
      from (select distinct user_id from public.push_subscriptions) u
    ) t group by grp
  loop
    perform public._push(batch, 'updates', new.title, new.body, '/');
  end loop;
  return new;
end $$;
revoke execute on function public._notify_release() from public, anon, authenticated;
drop trigger if exists notify_release on public.app_releases;
create trigger notify_release after insert on public.app_releases
  for each row execute function public._notify_release();
