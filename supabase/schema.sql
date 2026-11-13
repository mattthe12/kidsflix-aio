-- =============================================================================
-- KidsFlix — Supabase schema
-- Run in the Supabase SQL editor, or: supabase db push
--
-- Design notes
--  * One auth user = one parent/guardian account. Kids never get auth accounts,
--    email addresses or passwords, which keeps the app COPPA-friendly.
--  * Every row is scoped to account_id and protected by RLS.
--  * Content approval rows override the age rating: 'approved' widens access,
--    'blocked' hides a title for that kid profile.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ── Kid profiles ─────────────────────────────────────────────────────────────
create table if not exists public.kid_profiles (
  id          text primary key,
  account_id  uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 24),
  avatar      text not null default 'fox',
  age_group   text not null check (age_group in ('toddler', 'kid', 'tween')),
  age_limit   text not null check (age_limit in ('G', 'PG', 'Y7')),
  created_at  timestamptz not null default now()
);
create index if not exists kid_profiles_account_idx on public.kid_profiles (account_id);

-- ── Parent settings & subscription state ─────────────────────────────────────
create table if not exists public.parent_settings (
  account_id            uuid primary key references auth.users (id) on delete cascade,
  daily_limit_minutes   integer not null default 60 check (daily_limit_minutes between 0 and 600),
  downloads_allowed     boolean not null default true,
  notifications_enabled boolean not null default true,
  auto_play_next        boolean not null default true,
  language              text not null default 'en' check (language in ('en', 'es', 'fr')),
  captions_always       boolean not null default false,
  reduce_motion         boolean not null default false,
  big_text              boolean not null default false,
  pin_hash              text,
  plan                  text not null default 'trial' check (plan in ('trial', 'monthly', 'yearly')),
  subscription_status   text not null default 'trialing' check (subscription_status in ('trialing', 'active', 'inactive', 'past_due', 'canceled')),
  trial_ends_at         timestamptz not null default now() + interval '7 days',
  stripe_customer_id    text,
  updated_at            timestamptz not null default now()
);

-- Create settings automatically for every new parent account.
create or replace function public.handle_new_parent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.parent_settings (account_id) values (new.id)
  on conflict (account_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_parent();

-- ── Watch progress (continue watching) ───────────────────────────────────────
create table if not exists public.watch_progress (
  account_id       uuid not null references auth.users (id) on delete cascade,
  profile_id       text not null references public.kid_profiles (id) on delete cascade,
  title_id         text not null,
  episode_id       text not null,
  position_seconds numeric not null default 0 check (position_seconds >= 0),
  duration_seconds numeric not null default 0 check (duration_seconds >= 0),
  completed        boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (profile_id, episode_id)
);
create index if not exists watch_progress_account_idx on public.watch_progress (account_id, updated_at desc);

-- ── Favorites, watchlist, approvals ──────────────────────────────────────────
create table if not exists public.favorites (
  account_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.kid_profiles (id) on delete cascade,
  title_id   text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, title_id)
);

create table if not exists public.watchlist (
  account_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.kid_profiles (id) on delete cascade,
  title_id   text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, title_id)
);

create table if not exists public.content_approvals (
  account_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.kid_profiles (id) on delete cascade,
  title_id   text not null,
  status     text not null check (status in ('approved', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (profile_id, title_id)
);

-- ── Watch history ────────────────────────────────────────────────────────────
create table if not exists public.watch_history (
  id              text primary key,
  account_id      uuid not null references auth.users (id) on delete cascade,
  profile_id      text not null references public.kid_profiles (id) on delete cascade,
  title_id        text not null,
  episode_id      text not null,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  watched_at      timestamptz not null default now()
);
create index if not exists watch_history_profile_idx on public.watch_history (profile_id, watched_at desc);

-- ── Device downloads (metadata only; files stay on the device) ────────────────
create table if not exists public.downloads (
  account_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.kid_profiles (id) on delete cascade,
  title_id   text not null,
  episode_id text not null,
  status     text not null default 'ready' check (status in ('downloading', 'ready', 'error')),
  created_at timestamptz not null default now(),
  primary key (profile_id, title_id)
);

-- ── Parent PIN lockout and security-alert state ──────────────────────────
-- One row per parent account. Clients can read their own row, but only the
-- security-definer RPCs below can change it. That keeps the lockout enforced
-- even if a client is restarted, reloaded, or edits its local storage.
create table if not exists public.parent_pin_security (
  account_id       uuid primary key references auth.users (id) on delete cascade,
  failed_attempts  integer not null default 0 check (failed_attempts >= 0),
  lockout_until    timestamptz,
  last_failure_at  timestamptz,
  last_alert_at    timestamptz,
  updated_at       timestamptz not null default now()
);

-- 5 s at 3 failures, then 10, 20, 40… every additional 3 failures.
create or replace function public.pin_lockout_seconds(p_attempts integer)
returns integer
language sql
immutable
as $$
  select case
    when p_attempts >= 3 and p_attempts % 3 = 0
      then (5 * power(2, (p_attempts / 3) - 1))::integer
    else 0
  end;
$$;

-- Verify a PIN hash, enforce the lockout, and return the new state. The raw
-- PIN never reaches the database: the client sends only its salted SHA-256 hash.
create or replace function public.record_pin_attempt(p_pin_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_expected text;
  v_attempts integer;
  v_lockout_until timestamptz;
  v_last_failure timestamptz;
  v_last_alert timestamptz;
  v_now timestamptz := clock_timestamp();
  v_seconds integer := 0;
  v_alert_due boolean := false;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select pin_hash into v_expected
  from public.parent_settings
  where account_id = v_uid;

  if v_expected is null then
    return jsonb_build_object('ok', false, 'noPin', true, 'failedAttempts', 0,
      'locked', false, 'lockoutSeconds', 0, 'remainingSeconds', 0, 'alertDue', false);
  end if;

  insert into public.parent_pin_security (account_id)
  values (v_uid)
  on conflict (account_id) do nothing;

  select failed_attempts, lockout_until, last_failure_at, last_alert_at
  into v_attempts, v_lockout_until, v_last_failure, v_last_alert
  from public.parent_pin_security
  where account_id = v_uid
  for update;

  if v_lockout_until is not null and v_lockout_until > v_now then
    return jsonb_build_object(
      'ok', false,
      'locked', true,
      'failedAttempts', v_attempts,
      'lockoutSeconds', public.pin_lockout_seconds(v_attempts),
      'lockedUntil', v_lockout_until,
      'lastFailureAt', v_last_failure,
      'remainingSeconds', greatest(1, ceil(extract(epoch from (v_lockout_until - v_now)))::integer),
      'alertDue', false
    );
  end if;

  if p_pin_hash is not null and p_pin_hash = v_expected then
    update public.parent_pin_security
    set failed_attempts = 0,
        lockout_until = null,
        last_failure_at = null,
        updated_at = v_now
    where account_id = v_uid;

    return jsonb_build_object('ok', true, 'locked', false, 'failedAttempts', 0,
      'lockoutSeconds', 0, 'remainingSeconds', 0, 'alertDue', false);
  end if;

  v_attempts := v_attempts + 1;
  if v_attempts % 3 = 0 then
    v_seconds := public.pin_lockout_seconds(v_attempts);
    v_lockout_until := v_now + make_interval(secs => v_seconds);
    v_alert_due := v_last_alert is null or v_now - v_last_alert >= interval '15 minutes';
  else
    v_lockout_until := null;
  end if;

  update public.parent_pin_security
  set failed_attempts = v_attempts,
      lockout_until = v_lockout_until,
      last_failure_at = v_now,
      updated_at = v_now
  where account_id = v_uid;

  return jsonb_build_object(
    'ok', false,
    'locked', v_seconds > 0,
    'failedAttempts', v_attempts,
    'lockoutSeconds', v_seconds,
    'lockedUntil', v_lockout_until,
    'lastFailureAt', v_now,
    'remainingSeconds', v_seconds,
    'alertDue', v_alert_due
  );
end;
$$;

create or replace function public.pin_security_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_attempts integer := 0;
  v_lockout_until timestamptz;
  v_last_failure timestamptz;
  v_now timestamptz := clock_timestamp();
  v_remaining integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select failed_attempts, lockout_until, last_failure_at
  into v_attempts, v_lockout_until, v_last_failure
  from public.parent_pin_security
  where account_id = v_uid;

  if v_lockout_until is not null and v_lockout_until > v_now then
    v_remaining := greatest(1, ceil(extract(epoch from (v_lockout_until - v_now)))::integer);
  end if;

  return jsonb_build_object(
    'locked', v_remaining > 0,
    'failedAttempts', coalesce(v_attempts, 0),
    'lockoutSeconds', case when v_remaining > 0 then public.pin_lockout_seconds(v_attempts) else 0 end,
    'lockedUntil', case when v_remaining > 0 then v_lockout_until else null end,
    'lastFailureAt', v_last_failure,
    'remainingSeconds', v_remaining
  );
end;
$$;

-- Atomically claim one alert. The Edge Function calls this before sending so
-- concurrent taps cannot produce duplicate emails. One alert per 15 minutes.
create or replace function public.claim_pin_security_alert()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_attempts integer;
  v_lockout_until timestamptz;
  v_last_failure timestamptz;
  v_last_alert timestamptz;
  v_now timestamptz := clock_timestamp();
  v_seconds integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select failed_attempts, lockout_until, last_failure_at, last_alert_at
  into v_attempts, v_lockout_until, v_last_failure, v_last_alert
  from public.parent_pin_security
  where account_id = v_uid
  for update;

  if v_attempts is null or v_attempts < 3 or v_attempts % 3 <> 0 then
    return jsonb_build_object('allowed', false, 'reason', 'not_locked');
  end if;
  if v_last_failure is null or v_last_failure < v_now - interval '5 minutes' then
    return jsonb_build_object('allowed', false, 'reason', 'not_recent');
  end if;
  if v_last_alert is not null and v_last_alert > v_now - interval '15 minutes' then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited');
  end if;

  v_seconds := public.pin_lockout_seconds(v_attempts);
  update public.parent_pin_security
  set last_alert_at = v_now,
      updated_at = v_now
  where account_id = v_uid;

  return jsonb_build_object(
    'allowed', true,
    'failedAttempts', v_attempts,
    'lockoutSeconds', v_seconds,
    'lockedUntil', coalesce(v_lockout_until, v_last_failure + make_interval(secs => v_seconds)),
    'lastFailureAt', v_last_failure,
    'alertAt', v_now
  );
end;
$$;

-- Only these RPCs are callable by a signed-in parent. There is deliberately no
-- client-callable "clear lockout" function: a successful PIN attempt is the only
-- way to reset the counter, so a client cannot skip an active lockout.
revoke all on function public.record_pin_attempt(text) from public, anon;
revoke all on function public.pin_security_status() from public, anon;
revoke all on function public.claim_pin_security_alert() from public, anon;
grant execute on function public.record_pin_attempt(text) to authenticated;
grant execute on function public.pin_security_status() to authenticated;
grant execute on function public.claim_pin_security_alert() to authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.kid_profiles      enable row level security;
alter table public.parent_settings   enable row level security;
alter table public.watch_progress    enable row level security;
alter table public.favorites         enable row level security;
alter table public.watchlist         enable row level security;
alter table public.content_approvals enable row level security;
alter table public.watch_history     enable row level security;
alter table public.downloads         enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kid_profiles', 'parent_settings', 'watch_progress', 'favorites',
    'watchlist', 'content_approvals', 'watch_history', 'downloads'
  ]
  loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = account_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = account_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = account_id) with check (auth.uid() = account_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = account_id)', t);
  end loop;
end;
$$;

-- PIN security rows are read-only to their owner. Writes go through the
-- security-definer RPCs above, so clients cannot clear their own lockout.
alter table public.parent_pin_security enable row level security;
drop policy if exists "own pin security select" on public.parent_pin_security;
create policy "own pin security select" on public.parent_pin_security
  for select using (auth.uid() = account_id);

-- A kid profile can only be created for the signed-in parent's own account.
-- (The policies above already enforce account_id = auth.uid().)

-- ── Convenience view for the parent dashboard ───────────────────────────────
create or replace view public.family_watch_summary
with (security_invoker = true) as
select
  p.account_id,
  p.id            as profile_id,
  p.name,
  coalesce(sum(h.watched_seconds), 0) / 60 as total_minutes,
  count(h.id)                              as sessions
from public.kid_profiles p
left join public.watch_history h on h.profile_id = p.id
group by p.account_id, p.id, p.name;

-- ── Optional: tighten auth settings ─────────────────────────────────────────
-- Dashboard → Authentication → Providers → Email:
--   * Enable "Confirm email" for real deployments.
--   * Set a minimum password length of 8.
-- Dashboard → Authentication → URL Configuration:
--   * Add the kidsflixaio:// deep link for password recovery.


-- =============================================================================
-- Parent security email delivery (v2)
-- Fresh installs run this section after the original lockout section above.
-- =============================================================================

-- =============================================================================
-- Parent security alert delivery — event-level records and retries
--
-- The old flow claimed a global 15-minute alert slot *before* calling the email service.
-- A failed provider request therefore suppressed retries and no delivery status
-- was persisted. This migration makes the lockout event itself the idempotency
-- key: one row per lockout, claimed only while it is safe to send, and marked
-- accepted only after the email service returns a message id.
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.pin_security_alert_events (
  id                   uuid primary key default gen_random_uuid(),
  account_id           uuid not null references auth.users (id) on delete cascade,
  kind                 text not null default 'lockout' check (kind in ('lockout', 'test')),
  status               text not null default 'pending'
                         check (status in ('pending', 'sending', 'accepted', 'delivered', 'failed', 'bounced', 'complained')),
  failed_attempts      integer not null default 0 check (failed_attempts >= 0),
  lockout_seconds      integer not null default 0 check (lockout_seconds >= 0),
  locked_until         timestamptz,
  event_at             timestamptz not null default clock_timestamp(),
  recipient_masked     text not null default '',
  attempt_count        integer not null default 0 check (attempt_count >= 0),
  claimed_at           timestamptz,
  next_retry_at        timestamptz,
  provider_message_id  text,
  provider_response    jsonb,
  error_code           text,
  error_message        text,
  accepted_at          timestamptz,
  delivered_at         timestamptz,
  created_at           timestamptz not null default clock_timestamp(),
  updated_at           timestamptz not null default clock_timestamp()
);

create index if not exists pin_security_alert_events_account_idx
  on public.pin_security_alert_events (account_id, event_at desc);
create index if not exists pin_security_alert_events_provider_idx
  on public.pin_security_alert_events (provider_message_id)
  where provider_message_id is not null;
create index if not exists pin_security_alert_events_pending_idx
  on public.pin_security_alert_events (account_id, status, next_retry_at)
  where status in ('pending', 'failed');

create or replace function public.mask_pin_alert_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then ''
    else left(split_part(p_email, '@', 1), 1) || '***@' || split_part(p_email, '@', 2)
  end;
$$;

revoke all on function public.mask_pin_alert_email(text) from public, anon, authenticated;

-- Replace the original counter RPC. It now creates exactly one pending alert
-- event when a new lockout begins and returns that event id to the client.
create or replace function public.record_pin_attempt(p_pin_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_expected text;
  v_attempts integer;
  v_lockout_until timestamptz;
  v_last_failure timestamptz;
  v_now timestamptz := clock_timestamp();
  v_seconds integer := 0;
  v_event_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select pin_hash into v_expected
  from public.parent_settings
  where account_id = v_uid;

  if v_expected is null then
    return jsonb_build_object('ok', false, 'noPin', true, 'failedAttempts', 0,
      'locked', false, 'lockoutSeconds', 0, 'remainingSeconds', 0,
      'alertDue', false, 'alertEventId', null);
  end if;

  insert into public.parent_pin_security (account_id)
  values (v_uid)
  on conflict (account_id) do nothing;

  select failed_attempts, lockout_until, last_failure_at
  into v_attempts, v_lockout_until, v_last_failure
  from public.parent_pin_security
  where account_id = v_uid
  for update;

  if v_lockout_until is not null and v_lockout_until > v_now then
    return jsonb_build_object(
      'ok', false,
      'locked', true,
      'failedAttempts', v_attempts,
      'lockoutSeconds', public.pin_lockout_seconds(v_attempts),
      'lockedUntil', v_lockout_until,
      'lastFailureAt', v_last_failure,
      'remainingSeconds', greatest(1, ceil(extract(epoch from (v_lockout_until - v_now)))::integer),
      'alertDue', false,
      'alertEventId', null
    );
  end if;

  if p_pin_hash is not null and p_pin_hash = v_expected then
    update public.parent_pin_security
    set failed_attempts = 0,
        lockout_until = null,
        last_failure_at = null,
        updated_at = v_now
    where account_id = v_uid;

    return jsonb_build_object('ok', true, 'locked', false, 'failedAttempts', 0,
      'lockoutSeconds', 0, 'remainingSeconds', 0, 'alertDue', false,
      'alertEventId', null);
  end if;

  v_attempts := v_attempts + 1;
  if v_attempts % 3 = 0 then
    v_seconds := public.pin_lockout_seconds(v_attempts);
    v_lockout_until := v_now + make_interval(secs => v_seconds);

    select email into v_email from auth.users where id = v_uid;

    insert into public.pin_security_alert_events (
      account_id, kind, status, failed_attempts, lockout_seconds,
      locked_until, event_at, recipient_masked
    ) values (
      v_uid, 'lockout', 'pending', v_attempts, v_seconds,
      v_lockout_until, v_now, public.mask_pin_alert_email(v_email)
    )
    returning id into v_event_id;
  else
    v_lockout_until := null;
  end if;

  update public.parent_pin_security
  set failed_attempts = v_attempts,
      lockout_until = v_lockout_until,
      last_failure_at = v_now,
      last_alert_at = case when v_event_id is null then last_alert_at else v_now end,
      updated_at = v_now
  where account_id = v_uid;

  return jsonb_build_object(
    'ok', false,
    'locked', v_seconds > 0,
    'failedAttempts', v_attempts,
    'lockoutSeconds', v_seconds,
    'lockedUntil', v_lockout_until,
    'lastFailureAt', v_now,
    'remainingSeconds', v_seconds,
    'alertDue', v_event_id is not null,
    'alertEventId', v_event_id
  );
end;
$$;

-- Claim a specific lockout event (or the newest retryable event). The row is
-- marked "sending", never "accepted". A failed provider call moves it back to
-- "failed" with a retry time; the same event id is reused in the Message-ID so
-- retries are less likely to create duplicate messages.
drop function if exists public.claim_pin_security_alert();

create or replace function public.claim_pin_security_alert(p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.pin_security_alert_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_retry integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_event_id is not null then
    select * into v_event
    from public.pin_security_alert_events
    where id = p_event_id and account_id = v_uid
    for update;
  else
    select * into v_event
    from public.pin_security_alert_events
    where account_id = v_uid
      and kind = 'lockout'
      and event_at > v_now - interval '24 hours'
      and status in ('pending', 'failed')
    order by event_at desc
    limit 1
    for update;
  end if;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'not_found');
  end if;

  if v_event.kind <> 'lockout' then
    return jsonb_build_object('allowed', false, 'reason', 'not_locked');
  end if;
  if v_event.event_at < v_now - interval '24 hours' then
    return jsonb_build_object('allowed', false, 'reason', 'expired');
  end if;
  if v_event.status in ('accepted', 'delivered') then
    return jsonb_build_object('allowed', false, 'reason', 'already_sent',
      'eventId', v_event.id);
  end if;
  if v_event.status = 'sending' and v_event.claimed_at is not null
     and v_event.claimed_at > v_now - interval '2 minutes' then
    return jsonb_build_object('allowed', false, 'reason', 'in_progress',
      'eventId', v_event.id);
  end if;
  if v_event.attempt_count >= 5 then
    return jsonb_build_object('allowed', false, 'reason', 'retry_exhausted',
      'eventId', v_event.id);
  end if;
  if v_event.next_retry_at is not null and v_event.next_retry_at > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_event.next_retry_at - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'retry_wait',
      'eventId', v_event.id, 'retryAfterSeconds', v_retry);
  end if;

  update public.pin_security_alert_events
  set status = 'sending',
      attempt_count = attempt_count + 1,
      claimed_at = v_now,
      next_retry_at = null,
      error_code = null,
      error_message = null,
      updated_at = v_now
  where id = v_event.id
  returning * into v_event;

  return jsonb_build_object(
    'allowed', true,
    'eventId', v_event.id,
    'failedAttempts', v_event.failed_attempts,
    'lockoutSeconds', v_event.lockout_seconds,
    'lockedUntil', v_event.locked_until,
    'eventAt', v_event.event_at,
    'recipientMasked', v_event.recipient_masked,
    'attemptCount', v_event.attempt_count
  );
end;
$$;

-- Persist the provider's result. "accepted" means the email service returned a
-- message id; it does not mean the recipient's mailbox accepted the message.
-- Delivered, bounced and complained are only filled in by a provider webhook;
-- Gmail SMTP does not provide one.
create or replace function public.complete_pin_security_alert(
  p_event_id uuid,
  p_accepted boolean,
  p_provider_message_id text default null,
  p_provider_response jsonb default null,
  p_error_code text default null,
  p_error_message text default null,
  p_retry_after_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.pin_security_alert_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_retry_seconds integer;
  v_retry_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_event
  from public.pin_security_alert_events
  where id = p_event_id and account_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_event.status <> 'sending' then
    return jsonb_build_object('ok', false, 'reason', 'not_claimed', 'status', v_event.status);
  end if;

  if p_accepted then
    update public.pin_security_alert_events
    set status = 'accepted',
        provider_message_id = nullif(left(p_provider_message_id, 200), ''),
        provider_response = p_provider_response,
        accepted_at = v_now,
        error_code = null,
        error_message = null,
        next_retry_at = null,
        updated_at = v_now
    where id = v_event.id
    returning * into v_event;

    return jsonb_build_object('ok', true, 'status', v_event.status,
      'attemptCount', v_event.attempt_count, 'acceptedAt', v_event.accepted_at);
  end if;

  if v_event.attempt_count >= 5 then
    v_retry_at := null;
  else
    v_retry_seconds := (array[30, 120, 600, 3600, 21600])[least(v_event.attempt_count, 5)];
    v_retry_at := v_now + make_interval(secs => greatest(v_retry_seconds, coalesce(p_retry_after_seconds, 0)));
  end if;

  update public.pin_security_alert_events
  set status = 'failed',
      provider_response = p_provider_response,
      error_code = nullif(left(p_error_code, 100), ''),
      error_message = nullif(left(coalesce(p_error_message, 'Email provider rejected the message.'), 2000), ''),
      next_retry_at = v_retry_at,
      updated_at = v_now
  where id = v_event.id
  returning * into v_event;

  return jsonb_build_object('ok', true, 'status', v_event.status,
    'attemptCount', v_event.attempt_count, 'retryAt', v_event.next_retry_at,
    'retryExhausted', v_event.attempt_count >= 5);
end;
$$;

-- Test emails are separate rows and never change the lockout counter. Limit
-- them server-side to one every 30 seconds and five per 15 minutes.
create or replace function public.create_pin_security_test_alert()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_now timestamptz := clock_timestamp();
  v_recent integer;
  v_last timestamptz;
  v_event_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return jsonb_build_object('allowed', false, 'reason', 'no_email');
  end if;

  select max(created_at), count(*) filter (where created_at > v_now - interval '15 minutes')
  into v_last, v_recent
  from public.pin_security_alert_events
  where account_id = v_uid and kind = 'test';

  if v_last is not null and v_last > v_now - interval '30 seconds' then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retryAfterSeconds', 30);
  end if;
  if v_recent >= 5 then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retryAfterSeconds', 900);
  end if;

  insert into public.pin_security_alert_events (
    account_id, kind, status, failed_attempts, lockout_seconds,
    event_at, recipient_masked, attempt_count, claimed_at
  ) values (
    v_uid, 'test', 'sending', 0, 0, v_now, public.mask_pin_alert_email(v_email), 1, v_now
  )
  returning id into v_event_id;

  return jsonb_build_object('allowed', true, 'eventId', v_event_id,
    'eventAt', v_now, 'recipientMasked', public.mask_pin_alert_email(v_email));
end;
$$;

create or replace function public.pin_security_alert_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'kind', e.kind,
    'status', e.status,
    'failedAttempts', e.failed_attempts,
    'lockoutSeconds', e.lockout_seconds,
    'eventAt', e.event_at,
    'recipientMasked', e.recipient_masked,
    'attemptCount', e.attempt_count,
    'providerMessageId', e.provider_message_id,
    'errorCode', e.error_code,
    'errorMessage', e.error_message,
    'acceptedAt', e.accepted_at,
    'deliveredAt', e.delivered_at
  ) order by e.event_at desc), '[]'::jsonb)
  into v_result
  from (
    select * from public.pin_security_alert_events
    where account_id = v_uid
    order by event_at desc
    limit 8
  ) e;

  return jsonb_build_object('ok', true, 'alerts', v_result);
end;
$$;

-- A provider webhook can report actual delivery outcomes. Only service_role can call
-- this; recipient addresses and webhook bodies are never logged here.
create or replace function public.update_pin_security_alert_delivery(
  p_provider_message_id text,
  p_status text,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  if p_status not in ('delivered', 'bounced', 'complained', 'failed') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  if p_status = 'delivered' then
    update public.pin_security_alert_events
    set status = 'delivered', delivered_at = coalesce(p_occurred_at, now()), updated_at = now()
    where provider_message_id = p_provider_message_id;
  else
    update public.pin_security_alert_events
    set status = p_status,
        error_code = p_status,
        error_message = 'Email provider reported ' || p_status || '.',
        updated_at = now()
    where provider_message_id = p_provider_message_id;
  end if;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function public.record_pin_attempt(text) from public, anon;
revoke all on function public.claim_pin_security_alert(uuid) from public, anon;
revoke all on function public.complete_pin_security_alert(uuid, boolean, text, jsonb, text, text, integer) from public, anon;
revoke all on function public.create_pin_security_test_alert() from public, anon;
revoke all on function public.pin_security_alert_status() from public, anon;
revoke all on function public.update_pin_security_alert_delivery(text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.record_pin_attempt(text) to authenticated;
grant execute on function public.claim_pin_security_alert(uuid) to authenticated;
grant execute on function public.complete_pin_security_alert(uuid, boolean, text, jsonb, text, text, integer) to authenticated;
grant execute on function public.create_pin_security_test_alert() to authenticated;
grant execute on function public.pin_security_alert_status() to authenticated;
grant execute on function public.update_pin_security_alert_delivery(text, text, timestamptz) to service_role;

alter table public.pin_security_alert_events enable row level security;
drop policy if exists "own security alert events select" on public.pin_security_alert_events;
create policy "own security alert events select" on public.pin_security_alert_events
  for select using (auth.uid() = account_id);

revoke all on table public.pin_security_alert_events from anon, authenticated;
grant select on table public.pin_security_alert_events to authenticated;

revoke all on table public.parent_pin_security from anon, authenticated;
grant select on table public.parent_pin_security to authenticated;
