-- ============================================================
-- APS MILK CENTER — Supabase Database Schema
-- Run this in Supabase SQL Editor before starting the app
-- ============================================================

-- 1) CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code int not null,
  name text not null,
  phone text,
  whatsapp_enabled boolean default false,
  notes text,
  default_rate numeric(6,2) default 60.00,          -- default ₹/L
  advance_balance numeric(10,2) default 0,          -- continuous running balance
  created_at timestamptz default now(),
  unique(owner_id, code)
);

-- 2) MONTHLY RATE OVERRIDE (rate can change per customer per month)
create table public.monthly_rates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  year int not null,
  month int not null,            -- 1-12
  rate numeric(6,2) not null,
  unique(customer_id, year, month)
);

-- 3) DAILY ENTRIES (one row per customer per day)
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  entry_date date not null,
  morning_litres numeric(6,3) default 0,
  evening_litres numeric(6,3) default 0,
  biscuit_qty int default 0,
  biscuit_amount numeric(10,2) default 0,
  thivanam_qty int default 0,             -- feed bags
  thivanam_amount numeric(10,2) default 0,
  advance_amount numeric(10,2) default 0, -- positive = gave to customer, negative = paid back
  created_at timestamptz default now(),
  unique(customer_id, entry_date)
);

create index idx_entries_date on public.entries(entry_date);
create index idx_entries_customer on public.entries(customer_id);

-- 4) INVENTORY (master stock)
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('thivanam','biscuit')),
  current_stock int not null default 0,
  unit text default 'bag',         -- 'bag' for thivanam, 'packet' for biscuit
  low_stock_alert int default 5,
  updated_at timestamptz default now(),
  unique(owner_id, item_type)
);

-- 5) INVENTORY MOVEMENTS (audit trail of every add/deduct)
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references public.inventory(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  change int not null,            -- positive = restock, negative = sale
  reason text,                    -- 'restock' | 'entry_sale' | 'adjustment'
  created_at timestamptz default now()
);

-- 6) SETTINGS (per-user prefs: language, admin email, etc.)
create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  language text default 'ta',     -- 'ta' or 'en'
  admin_email text,
  shop_name text default 'APS MILK CENTER',
  shop_name_ta text default 'APS பால்பண்ணை',
  default_milk_rate numeric(6,2) default 60.00,
  updated_at timestamptz default now()
);

-- ============================================================
-- TRIGGER: Auto-deduct inventory when entry is created / updated
-- ============================================================
create or replace function public.deduct_inventory_on_entry()
returns trigger as $$
declare
  inv_thiv_id uuid;
  inv_bisc_id uuid;
  delta_thiv int := 0;
  delta_bisc int := 0;
begin
  if tg_op = 'INSERT' then
    delta_thiv := -new.thivanam_qty;
    delta_bisc := -new.biscuit_qty;
  elsif tg_op = 'UPDATE' then
    delta_thiv := -(new.thivanam_qty - old.thivanam_qty);
    delta_bisc := -(new.biscuit_qty - old.biscuit_qty);
  elsif tg_op = 'DELETE' then
    delta_thiv := old.thivanam_qty;
    delta_bisc := old.biscuit_qty;
  end if;

  if delta_thiv <> 0 then
    select id into inv_thiv_id from public.inventory
      where owner_id = coalesce(new.owner_id, old.owner_id) and item_type='thivanam';
    if inv_thiv_id is not null then
      update public.inventory set current_stock = current_stock + delta_thiv,
             updated_at = now() where id = inv_thiv_id;
      insert into public.inventory_movements(inventory_id, entry_id, change, reason)
        values (inv_thiv_id, coalesce(new.id, old.id), delta_thiv, 'entry_sale');
    end if;
  end if;

  if delta_bisc <> 0 then
    select id into inv_bisc_id from public.inventory
      where owner_id = coalesce(new.owner_id, old.owner_id) and item_type='biscuit';
    if inv_bisc_id is not null then
      update public.inventory set current_stock = current_stock + delta_bisc,
             updated_at = now() where id = inv_bisc_id;
      insert into public.inventory_movements(inventory_id, entry_id, change, reason)
        values (inv_bisc_id, coalesce(new.id, old.id), delta_bisc, 'entry_sale');
    end if;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_entry_inventory
  after insert or update or delete on public.entries
  for each row execute function public.deduct_inventory_on_entry();

-- ============================================================
-- TRIGGER: Keep customer advance_balance in sync with entries
-- ============================================================
create or replace function public.update_advance_balance()
returns trigger as $$
declare
  delta numeric(10,2);
begin
  if tg_op = 'INSERT' then
    delta := new.advance_amount;
  elsif tg_op = 'UPDATE' then
    delta := new.advance_amount - old.advance_amount;
  elsif tg_op = 'DELETE' then
    delta := -old.advance_amount;
  end if;

  update public.customers
    set advance_balance = advance_balance + delta
    where id = coalesce(new.customer_id, old.customer_id);

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_entry_advance
  after insert or update or delete on public.entries
  for each row execute function public.update_advance_balance();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table public.customers            enable row level security;
alter table public.monthly_rates        enable row level security;
alter table public.entries              enable row level security;
alter table public.inventory            enable row level security;
alter table public.inventory_movements  enable row level security;
alter table public.user_settings        enable row level security;

create policy "own customers"    on public.customers
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own rates"        on public.monthly_rates
  for all using (exists (select 1 from public.customers c
    where c.id = monthly_rates.customer_id and c.owner_id = auth.uid()));

create policy "own entries"      on public.entries
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own inventory"    on public.inventory
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own movements"    on public.inventory_movements
  for all using (exists (select 1 from public.inventory i
    where i.id = inventory_movements.inventory_id and i.owner_id = auth.uid()));

create policy "own settings"     on public.user_settings
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ============================================================
-- HELPER VIEW: Monthly customer summary (used by reports)
-- ============================================================
create or replace view public.v_monthly_summary as
select
  c.id as customer_id,
  c.owner_id,
  c.code,
  c.name,
  extract(year from e.entry_date)::int  as year,
  extract(month from e.entry_date)::int as month,
  sum(e.morning_litres + e.evening_litres)::numeric(10,3) as total_litres,
  sum(e.biscuit_amount + e.thivanam_amount)::numeric(10,2) as feed_total,
  sum(e.advance_amount)::numeric(10,2) as advance_given,
  c.advance_balance
from public.customers c
left join public.entries e on e.customer_id = c.id
group by c.id, e.entry_date;
