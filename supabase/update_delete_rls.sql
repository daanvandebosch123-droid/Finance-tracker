-- Run this in the Supabase SQL Editor
-- Allows any household member to delete or create any transaction in their household

drop policy if exists "users can delete own transactions" on transactions;
drop policy if exists "users can insert household transactions" on transactions;

create policy "household members can delete transactions" on transactions
  for delete using (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "household members can insert transactions" on transactions
  for insert with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "household members can update transactions" on transactions
  for update using (
    household_id = (select household_id from profiles where id = auth.uid())
  );
