-- Revoke administrator access without deleting the parent account.
--
-- The target keeps its auth login and family data. Deleting the admin_users
-- row removes every admin RPC permission on the next server check. An admin
-- cannot revoke their own access or leave the project without an administrator.

create or replace function public.admin_remove_admin(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot remove your own administrator access';
  end if;

  select username into v_username
    from public.admin_users
   where user_id = p_user_id and role = 'admin';

  if not found then
    raise exception 'account is not an administrator';
  end if;

  select count(*) into v_admin_count
    from public.admin_users
   where role = 'admin';

  if v_admin_count <= 1 then
    raise exception 'at least one administrator must remain';
  end if;

  delete from public.admin_users
   where user_id = p_user_id and role = 'admin';

  insert into public.admin_actions (admin_id, action, target_id, detail)
  values (
    auth.uid(),
    'admin_removed',
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

revoke all on function public.admin_remove_admin(uuid) from public, anon;
grant execute on function public.admin_remove_admin(uuid) to authenticated;