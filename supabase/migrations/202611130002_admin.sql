-- =============================================================================
-- KidsFlix administrator role, bootstrap completion and admin read models.
--
-- Security model:
--   * admin_users is server-owned. Clients may only read their own row.
--   * There is no INSERT/UPDATE/DELETE policy for clients, so nobody can
--     promote themselves by calling the REST API.
--   * Every admin RPC re-checks public.is_admin() using auth.uid(). A browser
--     supplied role is never trusted.
--   * auth.users emails are only exposed through admin-authorized RPCs.
-- =============================================================================

create table if not exists public.admin_users (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  username               text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  role                   text not null default 'admin' check (role = 'admin'),
  must_change_password   boolean not null default true,
  bootstrap_used         boolean not null default false,
  created_at             timestamptz not null default now(),
  last_admin_login_at    timestamptz
);

alter table public.admin_users enable row level security;

drop policy if exists "admin may read own role" on public.admin_users;
create policy "admin may read own role" on public.admin_users
  for select using (auth.uid() = user_id);

-- Deliberately no client insert/update/delete policies.

create table if not exists public.admin_actions (
  id          bigserial primary key,
  admin_id    uuid not null references auth.users (id) on delete cascade,
  action      text not null,
  target_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

-- is_admin() is security definer so RLS policies and other definer functions can
-- use it without needing a SELECT policy on admin_users for the current user.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin may read audit log" on public.admin_actions;
create policy "admin may read audit log" on public.admin_actions
  for select using (public.is_admin());

-- Server-side username lookup. It only returns the email for a registered
-- administrator; password verification still happens inside Supabase Auth.
create or replace function public.resolve_admin_login(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from public.admin_users a
  join auth.users u on u.id = a.user_id
  where a.role = 'admin'
    and lower(a.username) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_admin_login(text) from public;
grant execute on function public.resolve_admin_login(text) to anon, authenticated;

-- Called after Supabase Auth has changed the password. It can only complete the
-- bootstrap for the signed-in administrator and only once.
create or replace function public.complete_admin_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.admin_users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_role from public.admin_users where user_id = auth.uid();
  if not found or v_role.role <> 'admin' then
    raise exception 'not an administrator';
  end if;

  update public.admin_users
     set must_change_password = false,
         bootstrap_used = true,
         last_admin_login_at = now()
   where user_id = auth.uid();

  insert into public.admin_actions (admin_id, action, detail)
  values (auth.uid(), 'bootstrap_completed', jsonb_build_object('username', v_role.username));

  return jsonb_build_object(
    'ok', true,
    'mustChangePassword', false,
    'bootstrapUsed', true
  );
end;
$$;

revoke all on function public.complete_admin_bootstrap() from public, anon;
grant execute on function public.complete_admin_bootstrap() to authenticated;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_parents bigint;
  v_total_admins bigint;
  v_total_kids bigint;
  v_active_users bigint;
  v_watch_entries bigint;
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  select count(*) into v_total_admins from public.admin_users;
  select count(*) into v_total_parents
    from auth.users u
   where not exists (select 1 from public.admin_users a where a.user_id = u.id);
  select count(*) into v_total_kids from public.kid_profiles;
  select count(*) into v_active_users
    from auth.users
   where last_sign_in_at >= now() - interval '30 days';
  select count(*) into v_watch_entries from public.watch_history;

  return jsonb_build_object(
    'totalParents', v_total_parents,
    'totalAdmins', v_total_admins,
    'totalKids', v_total_kids,
    'activeUsers30d', v_active_users,
    'watchHistoryEntries', v_watch_entries,
    'databaseOk', true,
    'generatedAt', now()
  );
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_list_users(p_search text default '')
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  suspended boolean,
  is_admin boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      (u.banned_until is not null and u.banned_until > now()),
      exists (select 1 from public.admin_users a where a.user_id = u.id)
    from auth.users u
    where coalesce(trim(p_search), '') = ''
       or u.email ilike '%' || trim(p_search) || '%'
    order by u.created_at desc
    limit 100;
end;
$$;

revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot suspend your own account';
  end if;
  if exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'administrator accounts cannot be suspended here';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found';
  end if;

  update auth.users
     set banned_until = case when p_suspended then now() + interval '100 years' else null end
   where id = p_user_id;

  insert into public.admin_actions (admin_id, action, target_id, detail)
  values (
    auth.uid(),
    case when p_suspended then 'user_suspended' else 'user_reactivated' end,
    p_user_id,
    jsonb_build_object('suspended', p_suspended)
  );

  return jsonb_build_object('ok', true, 'userId', p_user_id, 'suspended', p_suspended);
end;
$$;

revoke all on function public.admin_set_user_suspended(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;

create or replace function public.admin_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  return jsonb_build_object(
    'databaseOk', true,
    'authReachable', true,
    'kidProfiles', (select count(*) from public.kid_profiles),
    'watchRows', (select count(*) from public.watch_history),
    'emailDelivery', 'not_checked',
    'checkedAt', now()
  );
end;
$$;

revoke all on function public.admin_health() from public, anon;
grant execute on function public.admin_health() to authenticated;
