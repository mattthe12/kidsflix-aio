-- Promote an existing parent account to administrator.
--
-- Admin creation is server-owned: this RPC checks the caller with is_admin(),
-- validates the username against the admin_users constraint, and never touches
-- the target's auth password. The promoted account keeps signing in with its
-- existing credentials.

create or replace function public.admin_add_admin(p_user_id uuid, p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_username text := lower(trim(p_username));
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  if v_username !~ '^[a-z0-9][a-z0-9_]{2,31}$' then
    raise exception 'username must be 3-32 lowercase letters, numbers or underscores';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'account not found';
  end if;

  insert into public.admin_users (user_id, username, role)
  values (p_user_id, v_username, 'admin')
  on conflict (user_id) do update
    set username = excluded.username,
        role = 'admin';

  insert into public.admin_actions (admin_id, action, target_id, detail)
  values (
    auth.uid(),
    'admin_added',
    p_user_id,
    jsonb_build_object('username', v_username)
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'username', v_username
  );
end;
$$;

revoke all on function public.admin_add_admin(uuid, text) from public, anon;
grant execute on function public.admin_add_admin(uuid, text) to authenticated;