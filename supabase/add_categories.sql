-- Run this in the Supabase SQL Editor

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) not null,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  created_at timestamptz default now(),
  unique(household_id, name, type)
);

alter table categories enable row level security;

create policy "users can read household categories" on categories
  for select using (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can insert household categories" on categories
  for insert with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can delete household categories" on categories
  for delete using (
    household_id = (select household_id from profiles where id = auth.uid())
  );
