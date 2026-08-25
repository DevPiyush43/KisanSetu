-- ============================================================
-- KisanSetu Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ─── PROFILES ─────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('farmer','fpo_admin','buyer','admin')) not null,
  full_name text,
  phone text,
  village text,
  district text,
  company_name text,
  buyer_type text check (buyer_type in ('processor','trader','institutional')),
  primary_crops text[],
  operating_districts text[],
  kyc_doc_url text,
  kyc_verified boolean default false,
  is_suspended boolean default false,
  language_pref text default 'hi',
  trust_score numeric default 50,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "public profile view" on profiles;
drop policy if exists "users update own profile" on profiles;
drop policy if exists "insert own profile" on profiles;

create policy "public profile view" on profiles for select using (true);
create policy "users update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "admin full access on profiles" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── MANDI PRICES ─────────────────────────────────────────
create table if not exists mandi_prices (
  id bigint generated always as identity primary key,
  crop text not null,
  mandi text not null,
  district text not null,
  price_per_quintal numeric not null,
  recorded_on date not null
);

alter table mandi_prices enable row level security;
create policy "anyone reads prices" on mandi_prices for select using (true);
create policy "admin writes prices" on mandi_prices for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create index if not exists idx_mandi_prices_crop_mandi on mandi_prices(crop, mandi);
create index if not exists idx_mandi_prices_date on mandi_prices(recorded_on desc);

-- ─── FPO POOLS ────────────────────────────────────────────
create table if not exists fpo_pools (
  id uuid primary key default gen_random_uuid(),
  fpo_admin_id uuid references profiles(id),
  crop text not null,
  name text,
  total_quantity numeric default 0,
  status text check (status in ('open','listed','closed')) default 'open',
  created_at timestamptz default now()
);

alter table fpo_pools enable row level security;
create policy "fpo_admin manages pools" on fpo_pools for all using (fpo_admin_id = auth.uid());
create policy "buyers view listed pools" on fpo_pools for select using (status = 'listed');

-- ─── LOTS ─────────────────────────────────────────────────
create table if not exists lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  pool_id uuid references fpo_pools(id),
  crop text,
  variety text,
  grade text,
  quantity numeric,
  unit text default 'quintal',
  expected_price numeric,
  location_district text,
  location_village text,
  photos text[],
  pickup_notes text,
  status text check (status in ('draft','listed','offer_received','negotiating','sold','expired')) default 'draft',
  created_at timestamptz default now()
);

alter table lots enable row level security;
create policy "owners manage own lots" on lots
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "buyers view non-draft lots" on lots
  for select using (status <> 'draft');
create policy "admin views all lots" on lots for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create index if not exists idx_lots_status on lots(status);
create index if not exists idx_lots_crop on lots(crop);
create index if not exists idx_lots_owner on lots(owner_id);

-- ─── OFFERS ───────────────────────────────────────────────
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references lots(id),
  buyer_id uuid references profiles(id),
  price numeric,
  quantity numeric,
  pickup_date date,
  note text,
  status text check (status in ('pending','countered','accepted','rejected')) default 'pending',
  counter_price numeric,
  created_at timestamptz default now()
);

alter table offers enable row level security;
create policy "buyer manages own offers" on offers for all using (buyer_id = auth.uid());
create policy "lot owner sees offers on their lots" on offers for select using (
  exists (select 1 from lots where id = lot_id and owner_id = auth.uid())
);
create policy "lot owner updates offer status" on offers for update using (
  exists (select 1 from lots where id = lot_id and owner_id = auth.uid())
);

-- ─── CONTRACTS ────────────────────────────────────────────
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(id) unique,
  lot_id uuid references lots(id),
  farmer_id uuid references profiles(id),
  buyer_id uuid references profiles(id),
  final_price numeric,
  final_quantity numeric,
  terms jsonb,
  created_at timestamptz default now()
);

alter table contracts enable row level security;
create policy "parties view own contracts" on contracts for select using (
  farmer_id = auth.uid() or buyer_id = auth.uid()
);
create policy "system creates contracts" on contracts for insert with check (true);
create policy "admin views all contracts" on contracts for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ─── PAYMENTS ─────────────────────────────────────────────
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id),
  status text check (status in ('pending','partially_paid','paid')) default 'pending',
  amount_paid numeric default 0,
  total_amount numeric,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

alter table payments enable row level security;
create policy "contract parties view payments" on payments for select using (
  exists (
    select 1 from contracts
    where id = contract_id and (farmer_id = auth.uid() or buyer_id = auth.uid())
  )
);
create policy "buyer updates payment" on payments for update using (
  exists (select 1 from contracts where id = contract_id and buyer_id = auth.uid())
);
create policy "admin manages payments" on payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "system inserts payments" on payments for insert with check (true);

-- ─── LEDGER EVENTS ────────────────────────────────────────
create table if not exists ledger_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  ref_id uuid,
  actor_id uuid references profiles(id),
  payload jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz default now()
);

alter table ledger_events enable row level security;
create policy "anyone reads ledger" on ledger_events for select using (true);
create policy "system writes ledger" on ledger_events for insert with check (true);

-- ─── GRIEVANCES ───────────────────────────────────────────
create table if not exists grievances (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id),
  filed_by uuid references profiles(id),
  reason text,
  description text,
  evidence_url text,
  status text check (status in ('open','resolved','rejected')) default 'open',
  admin_note text,
  created_at timestamptz default now()
);

alter table grievances enable row level security;
create policy "filer views own grievance" on grievances for select using (filed_by = auth.uid());
create policy "filer creates grievance" on grievances for insert with check (filed_by = auth.uid());
create policy "admin manages grievances" on grievances for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ─── LOGISTICS PROVIDERS ──────────────────────────────────
create table if not exists logistics_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('transporter','cold_storage','warehouse')),
  district text not null,
  contact_phone text,
  capacity_tons numeric,
  rate_per_km numeric,
  address text,
  is_active boolean default true
);

alter table logistics_providers enable row level security;
create policy "anyone reads logistics" on logistics_providers for select using (true);
create policy "admin manages logistics" on logistics_providers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
