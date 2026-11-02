-- =====================================================================
-- Migration 0002 — Verträge-Modul
-- =====================================================================

create type contract_status as enum ('entwurf', 'aktiv', 'beendet', 'storniert');

create table contracts (
  id                uuid primary key default gen_random_uuid(),
  vacancy_id        uuid references vacancies(id) on delete set null,
  candidate_id      uuid references candidates(id) on delete set null,
  company_id        uuid references companies(id) on delete set null,
  contract_number   text not null,
  status            contract_status not null default 'entwurf',
  start_date        date,
  end_date          date,
  hourly_rate       numeric(10,2),
  fee               numeric(10,2),
  currency          text not null default 'EUR',
  notes             text,
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (contract_number)
);

create index idx_contracts_vacancy on contracts(vacancy_id);
create index idx_contracts_status on contracts(status);

comment on table contracts is 'Verträge, i.d.R. aus besetzten Vakanzen erzeugt';

create trigger trg_contracts_updated_at before update on contracts
  for each row execute function set_updated_at();

alter table contracts enable row level security;

create policy "contracts_select_all" on contracts
  for select using (auth.uid() is not null);
create policy "contracts_insert_auth" on contracts
  for insert with check (auth.uid() is not null);
create policy "contracts_update_owner_or_admin" on contracts
  for update using (created_by = auth.uid() or is_admin_or_gl());
create policy "contracts_delete_admin" on contracts
  for delete using (is_admin_or_gl());

-- Mock-Vertrag zur bereits im Seed vorhandenen besetzten Vakanz (falls vorhanden)
insert into contracts (vacancy_id, candidate_id, company_id, contract_number, status, start_date, hourly_rate, fee, currency, created_by)
select v.id, v.filled_candidate_id, v.company_id, 'V-2026-0001', 'aktiv', v.filled_start_date, null, v.filled_fee, v.currency, v.assigned_recruiter_id
from vacancies v
where v.status = 'besetzt'
limit 1;
