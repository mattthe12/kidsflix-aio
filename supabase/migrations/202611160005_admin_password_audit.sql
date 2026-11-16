-- Record administrator password changes in the audit log.
--
-- This replaces the auth.users password trigger from
-- 202611130003_admin_password_guard.sql. The audit detail deliberately has no
-- password, hash, token or request body; only the administrator identity and
-- username are recorded.

create or replace function public.on_admin_password_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.admin_users
       set must_change_password = false,
           bootstrap_used = true,
           last_admin_login_at = now()
     where user_id = new.id
       and role = 'admin'
    returning username into v_username;

    if v_username is not null then
      insert into public.admin_actions (admin_id, action, detail)
      values (
        new.id,
        'admin_password_changed',
        jsonb_build_object('username', v_username)
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.on_admin_password_changed() from public, anon, authenticated;