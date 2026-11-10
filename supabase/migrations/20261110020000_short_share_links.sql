-- Short share links (Nov 2026)
--
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Run it AFTER 20261110000000_free_play.sql and 20261110010000_safe_square_claims.sql.
--
-- Gives every board a short code so its share link can be
--   squareboardapp.com/b/k7m2qx
-- instead of
--   squareboardapp.com/board/3f1c2b9e-....-....-....-............
--
-- What it does:
-- 1. Adds a function that makes a random 6-character code from letters and
--    digits that are easy to read aloud (no 0/o, 1/l/i).
-- 2. Adds boards.short_code, filled in automatically for every new board.
-- 3. Gives every EXISTING board a code too (only fills the new column; no
--    other data is touched). Old long links keep working.
-- 4. Makes codes unique.

create or replace function public.generate_board_short_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.boards b where b.short_code = code);
  end loop;
  return code;
end;
$$;

alter table public.boards
  add column if not exists short_code text;

update public.boards
   set short_code = public.generate_board_short_code()
 where short_code is null;

-- Belt and braces: if two existing boards happened to get the same code in
-- the step above, give the later one a new code before making codes unique.
update public.boards
   set short_code = public.generate_board_short_code()
 where id in (
   select id from (
     select id, row_number() over (partition by short_code order by id) as rn
       from public.boards
   ) dupes
   where dupes.rn > 1
 );

alter table public.boards
  alter column short_code set default public.generate_board_short_code(),
  alter column short_code set not null;

create unique index if not exists boards_short_code_key on public.boards (short_code);
