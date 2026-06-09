-- Run this in the Supabase SQL Editor

alter table transactions
  add column reimbursement_amount decimal(10,2),
  add column reimbursement_received boolean not null default false;
