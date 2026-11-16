-- Ensure every stored payload has the arrays the app expects. The validation
-- function uses `<> 'array'`, which is NULL (not true) when a key is missing;
-- these constraints close that gap for both live and draft payloads.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.content_titles'::regclass
      and conname = 'content_payload_arrays'
  ) then
    alter table public.content_titles
      add constraint content_payload_arrays check (
        coalesce(jsonb_typeof(payload -> 'tags'), '') = 'array'
        and coalesce(jsonb_typeof(payload -> 'episodes'), '') = 'array'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.content_titles'::regclass
      and conname = 'content_draft_arrays'
  ) then
    alter table public.content_titles
      add constraint content_draft_arrays check (
        draft_payload is null
        or (
          coalesce(jsonb_typeof(draft_payload -> 'tags'), '') = 'array'
          and coalesce(jsonb_typeof(draft_payload -> 'episodes'), '') = 'array'
        )
      );
  end if;
end
$$;
