-- Run this in the Supabase SQL Editor

create table hidden_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) not null,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  unique(household_id, name, type)
);

alter table hidden_categories enable row level security;

create policy "users can read household hidden categories" on hidden_categories
  for select using (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can insert household hidden categories" on hidden_categories
  for insert with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "users can delete household hidden categories" on hidden_categories
  for delete using (
    household_id = (select household_id from profiles where id = auth.uid())
  );
