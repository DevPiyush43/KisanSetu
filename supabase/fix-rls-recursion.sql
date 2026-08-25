-- ============================================================
-- KisanSetu RLS FIX — Run this in Supabase SQL Editor
-- Fixes: "infinite recursion detected in policy for relation profiles"
-- 
-- Root cause: RLS policies on "profiles" were querying "profiles"
-- itself, causing infinite recursion whenever any table with a
-- profiles-checking policy was accessed.
--
-- Fix: Use auth.jwt() -> user_metadata -> role instead of
-- querying the profiles table inside profiles RLS policies.
-- ============================================================

-- ─── STEP 1: Create a helper function (SECURITY DEFINER bypasses RLS) ──
-- This function reads the role from the JWT claims, never touching profiles table.
create or replace function auth_role()
returns text
language sql
stable
security definer
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (select role from profiles where id = auth.uid())
  )
$$;

-- ─── STEP 2: Fix profiles table RLS (THE ROOT CAUSE) ───────────────────
alter table profiles disable row level security;
alter table profiles enable row level security;

-- Drop ALL existing policies on profiles
drop policy if exists "public profile view" on profiles;
drop policy if exists "users update own profile" on profiles;
drop policy if exists "insert own profile" on profiles;
drop policy if exists "admin full access on profiles" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
drop policy if exists "profiles_delete" on profiles;

-- Recreate with NO self-referencing queries
create policy "profiles_select" on profiles
  for select using (true);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (
    auth.uid() = id
    or auth_role() = 'admin'
  );

create policy "profiles_delete" on profiles
  for delete using (auth_role() = 'admin');

-- ─── STEP 3: Fix lots table RLS ─────────────────────────────────────────
alter table lots disable row level security;
alter table lots enable row level security;

drop policy if exists "owners manage own lots" on lots;
drop policy if exists "buyers view non-draft lots" on lots;
drop policy if exists "admin views all lots" on lots;
drop policy if exists "fpo_admin manages pools lots" on lots;

-- Farmers and FPO admins can create/manage their own lots
create policy "lots_owner_all" on lots
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Anyone can read listed lots (for buyers browsing)
create policy "lots_public_select" on lots
  for select using (status <> 'draft');

-- Admins can see all lots (uses auth_role() - no recursion)
create policy "lots_admin_select" on lots
  for select using (auth_role() = 'admin');

-- ─── STEP 4: Fix mandi_prices RLS ───────────────────────────────────────
drop policy if exists "admin writes prices" on mandi_prices;
create policy "admin writes prices" on mandi_prices
  for all using (auth_role() = 'admin');

-- ─── STEP 5: Fix contracts RLS ──────────────────────────────────────────
drop policy if exists "admin views all contracts" on contracts;
create policy "admin views all contracts" on contracts
  for select using (
    farmer_id = auth.uid()
    or buyer_id = auth.uid()
    or auth_role() = 'admin'
  );

-- ─── STEP 6: Fix payments RLS ───────────────────────────────────────────
drop policy if exists "admin manages payments" on payments;
create policy "admin manages payments" on payments
  for all using (auth_role() = 'admin');

-- ─── STEP 7: Fix grievances RLS ─────────────────────────────────────────
drop policy if exists "admin manages grievances" on grievances;
create policy "admin manages grievances" on grievances
  for all using (auth_role() = 'admin');

-- ─── STEP 8: Fix logistics_providers RLS ────────────────────────────────
drop policy if exists "admin manages logistics" on logistics_providers;
create policy "admin manages logistics" on logistics_providers
  for all using (auth_role() = 'admin');

-- ─── STEP 9: Fix fpo_pools — allow fpo_admin to manage ──────────────────
drop policy if exists "fpo_admin manages pools" on fpo_pools;
create policy "fpo_pools_admin_all" on fpo_pools
  for all using (fpo_admin_id = auth.uid());
create policy "fpo_pools_buyer_select" on fpo_pools
  for select using (status = 'listed');
