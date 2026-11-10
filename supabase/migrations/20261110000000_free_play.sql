-- Free-play version of SquareBoard (Nov 2026)
--
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- It only ADDS things. It does not delete or change any existing data.
--
-- 1. boards.no_wagering_certified_at
--    When the host ticked "I confirm this board is just for fun..." on the
--    New Board screen. Older boards stay NULL (created before the checkbox).
--
-- 2. reports table
--    Where "Report a problem with this board" submissions go. Signed-in users
--    can add a report (only as themselves) but cannot read anyone's reports.
--    You read them in the dashboard: Table Editor > reports.
--
-- Not done here on purpose: the old money columns (boards.buy_in and
-- boards.payout_q1..payout_q4) are left in place so nothing breaks and no data
-- is lost. The app no longer reads or shows them. They can be dropped in a
-- later cleanup once the free-play version is live.

alter table public.boards
  add column if not exists no_wagering_certified_at timestamptz;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null default auth.uid(),
  reason      text not null check (reason in ('gambling', 'abusive', 'other')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists reports_board_id_idx on public.reports (board_id);

alter table public.reports enable row level security;

-- Signed-in users may file a report, but only under their own user id.
drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- No select/update/delete policies: regular users can't read or change
-- reports. The dashboard (service role) can see everything.
