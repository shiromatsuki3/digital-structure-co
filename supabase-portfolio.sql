-- ═══════════════════════════════════════════════════════════════════
-- Digital Structure Co. — Portfolio Table Schema
-- Run this in Supabase SQL Editor after the initial supabase-setup.sql
-- ═══════════════════════════════════════════════════════════════════

-- Portfolio entries table
create table if not exists public.portfolio (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  features         text[]    default '{}',
  cover_url        text,
  screenshots      text[]    default '{}',
  completion_date  text,       -- stored as 'YYYY-MM' e.g. '2025-03'
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Enable Row Level Security
alter table public.portfolio enable row level security;

-- Public can read all portfolio entries
create policy "Anyone can view portfolio"
  on public.portfolio for select
  using (true);

-- Only admins can insert
create policy "Admins can insert portfolio"
  on public.portfolio for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Only admins can update
create policy "Admins can update portfolio"
  on public.portfolio for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Only admins can delete
create policy "Admins can delete portfolio"
  on public.portfolio for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Auto-update updated_at on changes
create or replace function public.handle_portfolio_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_portfolio_updated
  before update on public.portfolio
  for each row execute procedure public.handle_portfolio_updated_at();
