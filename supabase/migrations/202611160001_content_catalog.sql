-- =============================================================================
-- SproutScreen managed catalogue
--
-- Titles and episodes live in Supabase instead of being rebuilt into the app.
-- * Public clients may select published rows only.
-- * Drafts are visible only through the admin_list_content RPC.
-- * All writes go through admin security-definer RPCs and are audit logged.
-- * The payload is the existing Title shape, so the player and catalogue
--   screens do not need a second content model.
-- =============================================================================

create table if not exists public.content_titles (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  payload       jsonb not null check (jsonb_typeof(payload) = 'object'),
  draft_payload jsonb check (draft_payload is null or jsonb_typeof(draft_payload) = 'object'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  updated_by    uuid references auth.users (id) on delete set null,
  constraint content_titles_payload_id_matches check (payload ->> 'id' = id),
  constraint content_titles_draft_id_matches check (draft_payload is null or draft_payload ->> 'id' = id)
);

create index if not exists content_titles_status_idx on public.content_titles (status, updated_at desc);
create index if not exists content_titles_updated_idx on public.content_titles (updated_at desc);

create or replace function public.touch_content_title()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists content_titles_touch on public.content_titles;
create trigger content_titles_touch
before update on public.content_titles
for each row execute function public.touch_content_title();

alter table public.content_titles enable row level security;

-- The app reads published content with the public anon key. Drafts stay private.
drop policy if exists "published catalogue is publicly readable" on public.content_titles;
create policy "published catalogue is publicly readable" on public.content_titles
  for select to anon, authenticated
  using (status = 'published');

-- No client insert/update/delete policies: writes must use the admin RPCs below.
-- Column grants keep draft_payload private even on published rows.
revoke all on public.content_titles from anon, authenticated;
grant select (id, status, payload, updated_at, published_at) on public.content_titles to anon, authenticated;

-- Validate the shared Title payload before it is stored. Publishing additionally
-- requires at least one playable episode, so a draft can be incomplete but a
-- live card can never point at an empty player.
create or replace function public.admin_validate_content(p_payload jsonb, p_publish boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode jsonb;
  v_category text;
  v_subcategory text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'content payload must be an object';
  end if;
  if coalesce(p_payload ->> 'id', '') !~ '^[a-z0-9][a-z0-9-]{2,63}$' then
    raise exception 'invalid content id';
  end if;
  if p_publish and nullif(trim(coalesce(p_payload ->> 'name', '')), '') is null then
    raise exception 'title name is required before publishing';
  end if;

  v_category := coalesce(p_payload ->> 'category', '');
  if v_category not in ('cartoons', 'learning', 'movies', 'music', 'bedtime') then
    raise exception 'invalid category: %', coalesce(nullif(v_category, ''), '(missing)');
  end if;

  v_subcategory := coalesce(p_payload ->> 'subcategory', '');
  if v_subcategory not in (
    'funny', 'animals', 'fantasy', 'superhero', 'comedy', 'originals',
    'alphabet', 'numbers', 'science', 'reading', 'geography', 'quizzes',
    'animated', 'family', 'adventure', 'movie-comedy', 'movie-fantasy',
    'rhymes', 'singalong', 'dancing', 'music', 'musicals',
    'stories', 'relaxing', 'sleep', 'calm', 'nighttime'
  ) then
    raise exception 'invalid subcategory: %', coalesce(nullif(v_subcategory, ''), '(missing)');
  end if;

  if coalesce(p_payload ->> 'rating', '') not in ('G', 'PG', 'Y7') then
    raise exception 'invalid rating: %', coalesce(nullif(p_payload ->> 'rating', ''), '(missing)');
  end if;
  if coalesce(p_payload ->> 'minutes', '') !~ '^[0-9]+$' or (p_payload ->> 'minutes')::int < 1 then
    raise exception 'minutes must be a positive integer';
  end if;
  if coalesce(p_payload ->> 'year', '') !~ '^[0-9]{4}$' then
    raise exception 'year must be four digits';
  end if;
  if coalesce(p_payload ->> 'popularity', '') !~ '^[0-9]+$' then
    raise exception 'popularity must be a non-negative integer';
  end if;
  if coalesce(p_payload ->> 'addedDaysAgo', '') !~ '^[0-9]+$' then
    raise exception 'addedDaysAgo must be a non-negative integer';
  end if;
  if coalesce(p_payload ->> 'palette', '') !~ '^[0-9]+$'
     or (p_payload ->> 'palette')::int not between 0 and 11 then
    raise exception 'palette must be between 0 and 11';
  end if;
  if p_publish and nullif(trim(coalesce(p_payload ->> 'description', '')), '') is null then
    raise exception 'description is required before publishing';
  end if;
  if jsonb_typeof(p_payload -> 'tags') <> 'array' then
    raise exception 'tags must be an array';
  end if;
  if jsonb_typeof(p_payload -> 'episodes') <> 'array' then
    raise exception 'episodes must be an array';
  end if;
  if p_publish and jsonb_array_length(p_payload -> 'episodes') = 0 then
    raise exception 'at least one episode is required before publishing';
  end if;

  for v_episode in select value from jsonb_array_elements(p_payload -> 'episodes') loop
    if jsonb_typeof(v_episode) <> 'object' then
      raise exception 'every episode must be an object';
    end if;
    if nullif(trim(coalesce(v_episode ->> 'id', '')), '') is null then
      raise exception 'every episode needs an id';
    end if;
    if v_episode ->> 'titleId' is distinct from p_payload ->> 'id' then
      raise exception 'episode % has a mismatched titleId', v_episode ->> 'id';
    end if;
    if p_publish and nullif(trim(coalesce(v_episode ->> 'name', '')), '') is null then
      raise exception 'episode % needs a name before publishing', v_episode ->> 'id';
    end if;
    if p_publish
       and nullif(trim(coalesce(v_episode ->> 'mp4Url', '')), '') is null
       and nullif(trim(coalesce(v_episode ->> 'hlsUrl', '')), '') is null then
      raise exception 'episode % needs a playback URL before publishing', v_episode ->> 'id';
    end if;
  end loop;
end;
$$;

revoke all on function public.admin_validate_content(jsonb, boolean) from public, anon, authenticated;

create or replace function public.admin_list_content()
returns table (
  id text,
  status text,
  payload jsonb,
  draft_payload jsonb,
  updated_at timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  return query
    select c.id, c.status, c.payload, c.draft_payload, c.updated_at, c.published_at
    from public.content_titles c
    order by c.updated_at desc;
end;
$$;

revoke all on function public.admin_list_content() from public, anon;
grant execute on function public.admin_list_content() to authenticated;

create or replace function public.admin_save_content(p_id text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;

  p_id := lower(trim(p_id));
  if p_payload ->> 'id' is distinct from p_id then
    raise exception 'payload id must match content id';
  end if;
  perform public.admin_validate_content(p_payload, false);

  insert into public.content_titles (id, status, payload, draft_payload, created_by, updated_by)
  values (p_id, 'draft', p_payload, p_payload, auth.uid(), auth.uid())
  on conflict (id) do update
    set draft_payload = excluded.draft_payload,
        updated_by = auth.uid()
  returning status into v_status;

  insert into public.admin_actions (admin_id, action, detail)
  values (auth.uid(), 'content_saved', jsonb_build_object('content_id', p_id, 'status', v_status));

  return jsonb_build_object('ok', true, 'id', p_id, 'status', v_status);
end;
$$;

revoke all on function public.admin_save_content(text, jsonb) from public, anon;
grant execute on function public.admin_save_content(text, jsonb) to authenticated;

create or replace function public.admin_set_content_status(p_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.content_titles%rowtype;
  v_payload jsonb;
  v_published_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'not an administrator';
  end if;
  if coalesce(p_status, '') not in ('draft', 'published') then
    raise exception 'invalid content status: %', coalesce(p_status, '(missing)');
  end if;

  select * into v_current
  from public.content_titles
  where id = lower(trim(p_id))
  for update;

  if not found then
    raise exception 'content not found';
  end if;

  if p_status = 'published' then
    v_payload := coalesce(v_current.draft_payload, v_current.payload);
    perform public.admin_validate_content(v_payload, true);
    v_published_at := now();
  else
    v_published_at := null;
  end if;

  update public.content_titles
  set status = p_status,
      payload = case when p_status = 'published' then v_payload else payload end,
      draft_payload = case when p_status = 'published' then null else draft_payload end,
      published_at = v_published_at,
      updated_by = auth.uid()
  where id = v_current.id;

  insert into public.admin_actions (admin_id, action, detail)
  values (
    auth.uid(),
    case when p_status = 'published' then 'content_published' else 'content_unpublished' end,
    jsonb_build_object('content_id', v_current.id)
  );

  return jsonb_build_object('ok', true, 'id', v_current.id, 'status', p_status);
end;
$$;

revoke all on function public.admin_set_content_status(text, text) from public, anon;
grant execute on function public.admin_set_content_status(text, text) to authenticated;
