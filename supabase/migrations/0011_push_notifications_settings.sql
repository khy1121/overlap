-- 앱 알림(웹 푸시) + 설정
-- 알림 종류: upcoming(다가오는 약속: 전날 20시·당일 8시), confirmed(시간 확정), friend(친구 신청·수락), invite(약속 초대)
-- 발송: DB 트리거·예약 작업 → pg_net → 서버 함수 push-send (Vault 비밀값으로 인증)

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── 기기 구독 ─────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "read own subscriptions" on public.push_subscriptions;
create policy "read own subscriptions" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
-- 쓰기는 아래 함수로만 (같은 기기를 다른 계정으로 다시 등록하는 경우까지 처리)

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'login required'; end if;
  if p_endpoint !~ '^https://' then raise exception 'bad endpoint'; end if;
  -- 이 기기(endpoint)는 이제 나에게 알림을 받아요 (이전 계정 연결은 해제)
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, left(p_ua, 300));
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = (select auth.uid());
$$;

-- ── 종류별 알림 설정 (행이 없으면 모두 켜짐) ─────────────────
create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  upcoming boolean not null default true,
  confirmed boolean not null default true,
  friend boolean not null default true,
  invite boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "read own prefs" on public.notification_prefs;
drop policy if exists "insert own prefs" on public.notification_prefs;
drop policy if exists "update own prefs" on public.notification_prefs;
create policy "read own prefs" on public.notification_prefs for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own prefs" on public.notification_prefs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own prefs" on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 이미 보낸 예약 알림 기록 (중복 방지). 일반 사용자 접근 불가
create table if not exists public.notification_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;

-- ── 발송 비밀값 (Vault에서 생성, 어디에도 노출하지 않음) ─────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_hook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_hook_secret', '알림 서버 함수(push-send) 호출 인증');
  end if;
end $$;

-- 서버 함수가 비밀값을 확인할 때만 사용 (service_role 전용)
create or replace function public.push_hook_secret()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_secret' limit 1;
$$;

-- 알림 보내기 요청 (비동기). 실패해도 원래 작업(신청·확정 등)은 막지 않아요
create or replace function public._push(user_ids uuid[], kind text, title text, body text, url text)
returns void language plpgsql security definer set search_path = '' as $$
declare secret text;
begin
  if user_ids is null or cardinality(user_ids) = 0 then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_hook_secret' limit 1;
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://ytoqzmggkerwffipbhsu.supabase.co/functions/v1/push-send',
    body := jsonb_build_object('user_ids', to_jsonb(user_ids), 'kind', kind, 'title', title, 'body', body, 'url', url),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret)
  );
exception when others then
  raise warning 'push request failed: %', sqlerrm;
end $$;

-- 약속 시작 시각 (확정 전이면 null). 한국 시간 기준 날짜·시각
create or replace function public._meeting_start(m public.meetings)
returns timestamp language sql immutable set search_path = '' as $$
  select case when m.picked is null then null
    else (m.start_date + (m.picked->>'d')::int)::timestamp
         + make_interval(mins => m.from_hour * 60 + (m.picked->>'s')::int * 30) end;
$$;

create or replace function public._when_text(ts timestamp)
returns text language sql immutable set search_path = '' as $$
  select to_char(ts, 'FMMM/FMDD') || ' (' || (array['일','월','화','수','목','금','토'])[extract(dow from ts)::int + 1] || ') ' || to_char(ts, 'HH24:MI');
$$;

-- ── 트리거: 친구 신청·수락 ────────────────────────────────
create or replace function public._notify_friend_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    select coalesce(nullif(name, ''), '누군가') into nm from public.profiles where id = new.from_id;
    perform public._push(array[new.to_id], 'friend', '친구 신청', nm || '님이 친구 신청을 보냈어요', '/?page=friends');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    select coalesce(nullif(name, ''), '친구') into nm from public.profiles where id = new.to_id;
    perform public._push(array[new.from_id], 'friend', '친구 수락', nm || '님이 친구 신청을 수락했어요', '/?page=friends');
  end if;
  return new;
end $$;
drop trigger if exists notify_friend_request on public.friend_requests;
create trigger notify_friend_request after insert or update of status on public.friend_requests
  for each row execute function public._notify_friend_request();

-- ── 트리거: 약속 초대 (다른 사람이 나를 참여자로 추가) ───────────
create or replace function public._notify_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inviter uuid := auth.uid(); nm text; ttl text;
begin
  if new.user_id is null or inviter is null or new.user_id = inviter then return new; end if; -- 본인 참여는 알림 X
  select coalesce(nullif(name, ''), '친구') into nm from public.profiles where id = inviter;
  select title into ttl from public.meetings where id = new.meeting_id;
  perform public._push(array[new.user_id], 'invite', '약속 초대', nm || '님이 "' || coalesce(ttl, '약속') || '"에 초대했어요', '/?m=' || new.meeting_id::text);
  return new;
end $$;
drop trigger if exists notify_invite on public.participants;
create trigger notify_invite after insert on public.participants
  for each row execute function public._notify_invite();

-- ── 트리거: 약속 시간 확정 ────────────────────────────────
create or replace function public._notify_confirmed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids uuid[]; ts timestamp;
begin
  if new.picked is null or new.picked is not distinct from old.picked then return new; end if;
  ts := public._meeting_start(new);
  select array_agg(user_id) into ids from public.participants
  where meeting_id = new.id and user_id is not null and user_id is distinct from auth.uid();
  perform public._push(ids, 'confirmed', '약속 시간 확정',
    '"' || new.title || '" ' || public._when_text(ts) || case when (new.picked->>'dur') is null then '부터' else '' end || '로 정해졌어요',
    '/?m=' || new.id::text);
  return new;
end $$;
drop trigger if exists notify_confirmed on public.meetings;
create trigger notify_confirmed after update of picked on public.meetings
  for each row execute function public._notify_confirmed();

-- ── 예약 알림: 다가오는 약속 (전날 20:00, 당일 08:00 · 한국 시간) ─────
create or replace function public._send_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare r public.meetings%rowtype; now_kst timestamp := (now() at time zone 'Asia/Seoul'); ts timestamp; ids uuid[]; k text;
begin
  for r in select * from public.meetings where picked is not null loop
    ts := public._meeting_start(r);
    if ts is null or ts <= now_kst or ts > now_kst + interval '2 days' then continue; end if;
    select array_agg(user_id) into ids from public.participants where meeting_id = r.id and user_id is not null;
    if ids is null then continue; end if;

    -- 전날 저녁 8시 ~ 자정 전
    if now_kst >= (ts::date - 1) + time '20:00' and now_kst < ts::date::timestamp then
      k := r.id::text || ':' || ts::text || ':eve';
      insert into public.notification_log(key) values (k) on conflict do nothing;
      if found then
        perform public._push(ids, 'upcoming', '내일 약속', '"' || r.title || '" 내일 ' || to_char(ts, 'HH24:MI') || '에 만나요', '/?m=' || r.id::text);
      end if;
    end if;

    -- 당일 아침 8시 ~ 약속 전 (8시 이전 약속은 건너뜀)
    if ts > ts::date + time '08:00' and now_kst >= ts::date + time '08:00' then
      k := r.id::text || ':' || ts::text || ':morning';
      insert into public.notification_log(key) values (k) on conflict do nothing;
      if found then
        perform public._push(ids, 'upcoming', '오늘 약속', '"' || r.title || '" 오늘 ' || to_char(ts, 'HH24:MI') || '에 만나요', '/?m=' || r.id::text);
      end if;
    end if;
  end loop;
  delete from public.notification_log where sent_at < now() - interval '30 days';
end $$;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'overlap-reminders';
  perform cron.schedule('overlap-reminders', '*/10 * * * *', 'select public._send_reminders()');
end $$;

-- ── 설정: 표시 이름 바꾸기 (프로필 + 내가 참여한 약속의 이름) ─────
-- 이름+생년월일 로그인은 가입할 때의 이름으로 계속해요 (표시 이름만 바뀜)
create or replace function public.update_my_name(new_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); nm text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if me is null then raise exception 'login required'; end if;
  if char_length(nm) < 1 or char_length(nm) > 20 then raise exception 'invalid name'; end if;
  update public.profiles set name = nm where id = me;
  update public.participants set name = nm where user_id = me;
  return nm;
end $$;

-- ── 권한 정리 ─────────────────────────────────────────────
revoke execute on function public.push_hook_secret() from public, anon, authenticated;
grant execute on function public.push_hook_secret() to service_role;
do $$
declare f text;
begin
  foreach f in array array['_push(uuid[], text, text, text, text)', '_meeting_start(public.meetings)', '_when_text(timestamp)',
                           '_notify_friend_request()', '_notify_invite()', '_notify_confirmed()', '_send_reminders()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['save_push_subscription(text, text, text, text)', 'remove_push_subscription(text)', 'update_my_name(text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
