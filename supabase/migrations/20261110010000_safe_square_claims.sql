-- Safe square claims (Nov 2026)
--
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Adds two database functions. It does not change any tables or data.
--
-- Why: the app used to save the WHOLE grid every time someone claimed a
-- square. If two people tapped squares at the same moment, the second save
-- overwrote the first and one person's square silently disappeared.
--
-- Now the app asks the database to change ONE square, and the database only
-- does it if that square is still free (and the numbers haven't been drawn).
-- A single UPDATE like this is atomic in Postgres: if two claims for the same
-- square arrive together, the second one re-checks the row after the first
-- finishes, finds the square taken, and changes nothing.
--
-- Both functions run with the caller's own permissions (security invoker), so
-- the boards table's existing row-level security rules still decide who may
-- change a board. Nothing here grants anyone new access.
--
-- Assumes boards.squares is a jsonb array of 100 entries (null = empty), which
-- is how the app has always written it.

create or replace function public.claim_square(
  p_board_id uuid,
  p_index    integer,
  p_name     text,
  p_color    jsonb default null
)
returns setof public.boards
language sql
security invoker
set search_path = ''
as $$
  update public.boards
     set squares = jsonb_set(
           squares,
           array[p_index::text],
           jsonb_build_object('name', btrim(p_name), 'color', p_color)
         ),
         updated_at = now()
   where id = p_board_id
     and p_index between 0 and 99
     and char_length(btrim(p_name)) between 1 and 60
     and row_numbers is null
     and coalesce(squares -> p_index, 'null'::jsonb) = 'null'::jsonb
  returning *;
$$;

create or replace function public.unclaim_square(
  p_board_id      uuid,
  p_index         integer,
  p_expected_name text
)
returns setof public.boards
language sql
security invoker
set search_path = ''
as $$
  update public.boards
     set squares = jsonb_set(squares, array[p_index::text], 'null'::jsonb),
         updated_at = now()
   where id = p_board_id
     and p_index between 0 and 99
     and row_numbers is null
     and squares -> p_index ->> 'name' = p_expected_name
  returning *;
$$;

-- Only signed-in users call these (the app requires sign-in).
revoke execute on function public.claim_square(uuid, integer, text, jsonb) from public, anon;
revoke execute on function public.unclaim_square(uuid, integer, text) from public, anon;
grant execute on function public.claim_square(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.unclaim_square(uuid, integer, text) to authenticated;
