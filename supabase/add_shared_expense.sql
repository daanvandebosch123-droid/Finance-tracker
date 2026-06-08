-- Run this in the Supabase SQL Editor

alter table transactions add column shared boolean not null default false;
