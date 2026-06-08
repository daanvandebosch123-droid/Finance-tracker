-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  household_id uuid references households(id),
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) not null,
  user_id uuid references profiles(id) not null,
  amount decimal(10,2) not null check (amount > 0),
  type text not null check (type in ('expense', 'income')),
  category text not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table households enable row level security;
alter table profiles enable row level security;
alter table transactions enable row level security;

-- Households: any authenticated user can read/create
create policy "auth users can read households" on households
  for select to authenticated using (true);

create policy "auth users can create households" on households
  for insert to authenticated with check (true);

-- Profiles: any authenticated user can read all profiles (needed for partner name display)
create policy "auth users can read profiles" on profiles
  for select to authenticated using (true);

create policy "users can insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

-- Transactions: scoped to household
create policy "users can read household transactions" on transactions
  for select using (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can insert household transactions" on transactions
  for insert with check (
    user_id = auth.uid()
    and household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can delete own transactions" on transactions
  for delete using (user_id = auth.uid());
