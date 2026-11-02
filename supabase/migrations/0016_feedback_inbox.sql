-- 관리자 의견함: 관리자(app_admins)만 의견 목록을 보고 상태를 바꿀 수 있어요.
-- 테이블에 직접 읽기 규칙을 열지 않고, 관리자인지 확인하는 함수로만 접근해요.

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;

-- 의견 목록 (최신순). p_status: null이면 전체
create or replace function public.admin_feedback_list(p_status text default null, p_limit int default 100)
returns table(id uuid, kind text, message text, sender text, anonymous boolean, page text, app_version text, user_agent text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'admin only'; end if;
  return query
  select f.id, f.kind, f.message, coalesce(nullif(p.name, ''), case when f.user_id is null then null else '이름 없음' end),
         f.user_id is null, f.page, f.app_version, f.user_agent, f.status, f.created_at
  from public.feedback f left join public.profiles p on p.id = f.user_id
  where p_status is null or f.status = p_status
  order by f.created_at desc
  limit greatest(1, least(p_limit, 300));
end $$;

-- 상태별 개수 (의견함 배지용)
create or replace function public.admin_feedback_counts()
returns table(status text, n bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'admin only'; end if;
  return query select f.status, count(*) from public.feedback f group by f.status;
end $$;

create or replace function public.admin_set_feedback_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'admin only'; end if;
  if p_status not in ('new', 'checked', 'done') then raise exception 'bad status'; end if;
  update public.feedback set status = p_status where id = p_id;
end $$;

-- 새 의견 알림을 누르면 의견함이 열리게
create or replace function public.submit_feedback(p_kind text, p_message text, p_anonymous boolean, p_page text default null, p_version text default null, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); msg text := btrim(coalesce(p_message, '')); admins uuid[];
begin
  if me is null then raise exception 'login required'; end if;
  if p_kind not in ('bug', 'idea', 'etc') then raise exception 'bad kind'; end if;
  if char_length(msg) < 5 then raise exception 'too short'; end if;
  if char_length(msg) > 2000 then raise exception 'too long'; end if;
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
    left(msg, 120), '/?page=inbox');
end $$;

do $$
declare f text;
begin
  foreach f in array array['is_app_admin()', 'admin_feedback_list(text, int)', 'admin_feedback_counts()', 'admin_set_feedback_status(uuid, text)',
                           'submit_feedback(text, text, boolean, text, text, text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
