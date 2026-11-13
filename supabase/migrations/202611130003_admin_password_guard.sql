-- =============================================================================
-- Server-side guard for the administrator bootstrap.
--
-- The browser must not be able to clear must_change_password without actually
-- changing the Supabase Auth password. This trigger runs after GoTrue updates
-- auth.users.encrypted_password and is the only place that clears the flag.
-- complete_admin_bootstrap() then refuses to run until that has happened.
-- =============================================================================

create or replace function public.on_admin_password_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.admin_users
       set must_change_password = false,
           bootstrap_used = true,
           last_admin_login_at = now()
     where user_id = new.id
       and role = 'admin';
  end if;
  return new;
end;
$$;

revoke all on function public.on_admin_password_changed() from public, anon, authenticated;

drop trigger if exists on_auth_admin_password_changed on auth.users;
create trigger on_auth_admin_password_changed
  after update of encrypted_password on auth.users
  for each row execute function public.on_admin_password_changed();

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
  if v_role.must_change_password then
    raise exception 'change the administrator password before completing setup';
  end if;

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
