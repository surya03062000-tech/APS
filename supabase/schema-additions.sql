-- ============================================================
-- Run this in Supabase SQL Editor to enable new features
-- ============================================================

-- 1. Login activity log (Feature #25)
create table if not exists login_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  action      text not null default 'login',
  ip_address  text,
  user_agent  text,
  created_at  timestamptz default now()
);
alter table login_activity enable row level security;
create policy "own activity" on login_activity
  for all using (auth.uid() = user_id);

-- 2. Entry photos bucket (Feature #20)
-- Run in Supabase Dashboard → Storage → New bucket:
-- Name: entry-photos, Public: false
-- Or via SQL:
insert into storage.buckets (id, name, public)
  values ('entry-photos', 'entry-photos', false)
  on conflict do nothing;

create policy "owner upload" on storage.objects
  for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner read" on storage.objects
  for select using (auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Rate change history (Feature #8)
create table if not exists rate_history (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users on delete cascade,
  customer_id uuid references customers on delete cascade,
  old_rate    numeric(8,2),
  new_rate    numeric(8,2) not null,
  changed_at  timestamptz default now()
);
alter table rate_history enable row level security;
create policy "own rate history" on rate_history
  for all using (auth.uid() = owner_id);

-- Trigger: auto-log rate changes
create or replace function log_rate_change()
returns trigger language plpgsql as $$
begin
  if old.default_rate is distinct from new.default_rate then
    insert into rate_history(owner_id, customer_id, old_rate, new_rate)
    values (new.owner_id, new.id, old.default_rate, new.default_rate);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_rate_history on customers;
create trigger trg_rate_history
  after update on customers
  for each row execute function log_rate_change();

-- 4. Role-based access (Feature #24)
-- Add role column to user_settings
alter table user_settings
  add column if not exists role text not null default 'owner'
    check (role in ('owner', 'staff'));
-- Staff role: can only insert/update entries (enforce in app middleware)

-- 5. shop_name_ta column (if not already present)
alter table user_settings
  add column if not exists shop_name_ta text;
