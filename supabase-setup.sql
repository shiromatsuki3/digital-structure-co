-- ═══════════════════════════════════════════════════════════════
--  Digital Structure Co. — Supabase Database Setup
--  Run this entire file in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  discord_id   text unique,
  username     text,
  display_name text,
  avatar_url   text,
  is_admin     boolean default false,
  is_banned    boolean default false,
  created_at   timestamptz default now()
);

-- 2. REVIEWS TABLE
create table if not exists public.reviews (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  rating      int check (rating >= 1 and rating <= 5) not null,
  review_text text not null,
  is_pinned   boolean default false,
  is_hidden   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint one_review_per_user unique(user_id)
);

-- 3. AUTO-CREATE PROFILE ON DISCORD LOGIN
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, discord_id, username, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'full_name',
      'unknown'
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'User'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    discord_id   = excluded.discord_id,
    username     = excluded.username,
    display_name = excluded.display_name,
    avatar_url   = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.reviews  enable row level security;

-- Drop existing policies if re-running
drop policy if exists "profiles_select"  on public.profiles;
drop policy if exists "profiles_insert"  on public.profiles;
drop policy if exists "profiles_update"  on public.profiles;
drop policy if exists "reviews_select"   on public.reviews;
drop policy if exists "reviews_insert"   on public.reviews;
drop policy if exists "reviews_update"   on public.reviews;
drop policy if exists "reviews_delete"   on public.reviews;

-- Profiles: anyone can read, users manage their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Reviews: public can see non-hidden; admins see all
create policy "reviews_select" on public.reviews for select using (
  is_hidden = false
  or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Reviews: authenticated, non-banned users can insert (one per user enforced by UNIQUE)
create policy "reviews_insert" on public.reviews for insert with check (
  auth.uid() = user_id
  and not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
);

-- Reviews: users edit own; admins edit any
create policy "reviews_update" on public.reviews for update using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Reviews: admins delete any
create policy "reviews_delete" on public.reviews for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 5. REALTIME
alter publication supabase_realtime add table public.reviews;

-- ═══════════════════════════════════════════════════════════
-- AFTER SETUP: Make yourself admin
-- Find your Discord user ID in: Supabase > Authentication > Users
-- Then run:
--
--   update public.profiles
--   set is_admin = true
--   where discord_id = 'YOUR_DISCORD_ID';
--
-- ═══════════════════════════════════════════════════════════
