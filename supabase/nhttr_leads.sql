-- ═══════════════════════════════════════════════════════════════
-- NH Truck & Trailer Repair + NH RV Repair — shared leads table
-- (project: "NH Marketing Dashboard"). Run once in Supabase:
--   Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run. Both websites write here; `site` says which one.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.nhttr_leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  site          text not null,          -- nhtrucktrailerrepair.com | nhrvrepair.com
  full_name     text,
  email         text,
  phone         text,
  vehicle_type  text,
  message       text,
  sms_consent   text,
  page_url      text,                   -- page the form was submitted from
  recipient     text,                   -- inbox the lead was emailed to
  payload       jsonb,                  -- full raw submission (+ spam_reason if flagged)
  status        text not null default 'new'  -- new | spam | contacted | won | lost
);

create index if not exists nhttr_leads_created_at_idx on public.nhttr_leads (created_at desc);
create index if not exists nhttr_leads_site_idx       on public.nhttr_leads (site);
create index if not exists nhttr_leads_status_idx     on public.nhttr_leads (status);

-- RLS on, no policies → only the server-side secret key can read/write.
alter table public.nhttr_leads enable row level security;
