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
