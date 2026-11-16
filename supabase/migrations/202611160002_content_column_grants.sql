-- The first catalogue migration initially granted table-level SELECT. RLS hides
-- draft rows, but a published row would still expose draft_payload to the anon
-- key. Public readers only need the live payload, so use column grants.
revoke all on public.content_titles from anon, authenticated;
grant select (id, status, payload, updated_at, published_at)
  on public.content_titles to anon, authenticated;
