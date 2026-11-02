-- =====================================================================
-- CMS Recruiting-Plattform — Initiales Supabase-Schema
-- Enthält: Enums, Tabellen, Indizes, RLS-Policies, Trigger, Mock-Daten
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive E-Mails

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------

-- Rollen der internen Nutzer (Recruiter, Key-Account-Manager, Geschäftsleitung, Admin)
create type user_role as enum (
  'recruiter',
  'kam',
  'geschaeftsleitung',
  'admin'
);

-- Kunden-Status (Tabs im Kunden-Modul)
create type company_status as enum (
  'neukunde',
  'aktiv',
  'ohne_aktive_vakanz',
  'inaktiv'
);

-- Grund für Inaktivität eines Kunden
create type company_inactive_reason as enum (
  'projekt_abgeschlossen',
  'kein_bedarf_mehr',
  'budget_gestoppt',
  'keine_rueckmeldung',
  'strategische_neuausrichtung'
);

-- Kandidaten-Status (Tabs im Kandidaten-Modul)
create type candidate_status as enum (
  'neu_eingegangen',
  'in_bearbeitung',
  'profil_fertig',
  'in_einreichung',
  'inaktiv'
);

-- Herkunft einer Vakanz-Anfrage
create type vacancy_source as enum (
  'portal',
  'email',
  'telefon',
  'sonstige'
);

-- Vakanz-Pipeline-Status
create type vacancy_status as enum (
  'neue_anfrage',
  'offen',
  'in_bearbeitung',
  'besetzt',
  'geschlossen'
);

-- Grund für Schließung/Abbruch einer Vakanz
create type vacancy_close_reason as enum (
  'kunde_storniert',
  'position_intern_besetzt',
  'budget_gestrichen',
  'kein_geeigneter_kandidat',
  'sonstiges'
);

-- Anstellungsart
create type employment_type as enum (
  'festanstellung',
  'arbeitnehmerueberlassung',
  'freelance',
  'werkvertrag'
);

-- Status einer Kandidaten-Einreichung auf eine Vakanz
create type submission_status as enum (
  'vorgeschlagen',
  'angefragt',
  'in_pruefung',
  'verfuegbar',
  'abgelehnt',
  'vorstellungsgespraech',
  'besetzt'
);

-- Faktor-Stufe im Verrechnungssatzrechner
create type factor_tier as enum (
  'basis',
  'standard',
  'spezialist',
  'premium'
);

-- Eingabemodus des Rechners
create type calculation_mode as enum (
  'stundensatz',
  'gehalt'
);

-- Status eines Angebots im Freigabe-Workflow
create type offer_status as enum (
  'entwurf',
  'zur_freigabe',
  'in_pruefung',
  'freigegeben',
  'abgelehnt'
);

-- Typ eines Activity-Log-Eintrags
create type activity_type as enum (
  'notiz',
  'anruf',
  'email',
  'statusaenderung',
  'meeting',
  'dokument'
);

-- ---------------------------------------------------------------------
-- 2. TABELLE: profiles (interne Nutzer, 1:1 zu auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         citext not null unique,
  role          user_role not null default 'recruiter',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table profiles is 'Interne Nutzer der Plattform (Recruiter, KAM, GL, Admin)';

-- ---------------------------------------------------------------------
-- 3. TABELLE: companies (Kunden)
-- ---------------------------------------------------------------------
create table companies (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  industry               text,
  website                text,
  address                text,
  city                   text,
  postal_code            text,
  country                text default 'Deutschland',
  status                 company_status not null default 'neukunde',
  inactive_reason        company_inactive_reason,
  inactive_since         date,
  assigned_kam_id        uuid references profiles(id),
  last_contact_at        timestamptz,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint chk_inactive_reason_only_if_inactive
    check (
      (status = 'inaktiv' and inactive_reason is not null)
      or (status <> 'inaktiv')
    )
);

create index idx_companies_status on companies(status);
create index idx_companies_kam on companies(assigned_kam_id);

comment on table companies is 'Kundenunternehmen';

-- ---------------------------------------------------------------------
-- 4. TABELLE: contacts (Ansprechpartner beim Kunden)
-- ---------------------------------------------------------------------
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  position      text,
  email         citext,
  phone         text,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_contacts_company on contacts(company_id);

comment on table contacts is 'Ansprechpartner auf Kundenseite';

-- ---------------------------------------------------------------------
-- 5. TABELLE: candidates (Kandidaten)
-- ---------------------------------------------------------------------
create table candidates (
  id                    uuid primary key default gen_random_uuid(),
  -- Echte (nicht-anonymisierte) Stammdaten — nur intern sichtbar
  first_name            text not null,
  last_name             text not null,
  email                 citext,
  phone                 text,
  -- Anonymisiertes Profil (wird im Kandidaten-Exposé verwendet)
  anonymized_title      text,               -- z.B. "Senior Java-Entwickler (m/w/d)"
  anonymized_profile    jsonb not null default '{}'::jsonb,
                        -- Struktur: { summary, qualifications: [], industry_experience: [],
                        --             certificates: [], work_history: [], skills: [] }
  status                candidate_status not null default 'neu_eingegangen',
  desired_salary_min    numeric(10,2),
  desired_salary_max    numeric(10,2),
  hourly_rate_net       numeric(10,2),
  availability_date     date,
  location              text,
  assigned_recruiter_id uuid references profiles(id),
  cv_file_path          text,               -- Storage-Pfad Original-CV
  exposé_file_path      text,               -- Storage-Pfad generiertes anonymisiertes PDF
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_candidates_status on candidates(status);
create index idx_candidates_recruiter on candidates(assigned_recruiter_id);

comment on table candidates is 'Kandidaten inkl. anonymisiertem Profil für den Versand an Kunden';

-- ---------------------------------------------------------------------
-- 6. TABELLE: vacancies (Vakanzen)
-- ---------------------------------------------------------------------
create table vacancies (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  contact_id          uuid references contacts(id),
  title               text not null,
  source              vacancy_source not null default 'sonstige',
  status              vacancy_status not null default 'neue_anfrage',
  employment_type     employment_type not null default 'festanstellung',
  requirements        text,
  budget_min          numeric(10,2),
  budget_max          numeric(10,2),
  currency            text not null default 'EUR',
  location            text,
  start_date          date,
  assigned_recruiter_id uuid references profiles(id),
  -- Felder für Status "Besetzt"
  filled_candidate_id uuid references candidates(id),
  filled_start_date   date,
  filled_fee          numeric(10,2),
  -- Felder für Status "Geschlossen"
  close_reason        vacancy_close_reason,
  close_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_vacancies_company on vacancies(company_id);
create index idx_vacancies_status on vacancies(status);
create index idx_vacancies_recruiter on vacancies(assigned_recruiter_id);

comment on table vacancies is 'Vakanzen/offene Stellen eines Kunden';

-- ---------------------------------------------------------------------
-- 7. TABELLE: vacancy_submissions (Einreichungen / Matching)
-- ---------------------------------------------------------------------
create table vacancy_submissions (
  id              uuid primary key default gen_random_uuid(),
  vacancy_id      uuid not null references vacancies(id) on delete cascade,
  candidate_id    uuid not null references candidates(id) on delete cascade,
  match_score     numeric(5,2) check (match_score >= 0 and match_score <= 100),
  status          submission_status not null default 'vorgeschlagen',
  submitted_at    timestamptz,
  feedback        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (vacancy_id, candidate_id)
);

create index idx_submissions_vacancy on vacancy_submissions(vacancy_id);
create index idx_submissions_candidate on vacancy_submissions(candidate_id);

comment on table vacancy_submissions is 'Zuordnung Kandidat <-> Vakanz inkl. Match-Score und Einreichungsstatus';

-- ---------------------------------------------------------------------
-- 8. TABELLE: offers_calculations (Verrechnungssatzrechner-Ergebnisse / Angebote)
-- ---------------------------------------------------------------------
create table offers_calculations (
  id                        uuid primary key default gen_random_uuid(),
  vacancy_id                uuid references vacancies(id) on delete set null,
  candidate_id              uuid references candidates(id) on delete set null,
  company_id                uuid references companies(id) on delete set null,
  created_by                uuid references profiles(id),

  mode                      calculation_mode not null default 'stundensatz',
  candidate_hourly_rate_net numeric(10,2),
  candidate_monthly_salary  numeric(10,2),
  currency                  text not null default 'EUR',
  assignment_duration_months integer,
  assignment_location       text,

  factor_tier               factor_tier not null default 'standard',
  factor_value              numeric(4,2) not null default 2.2,

  -- Ergebnisse
  recommended_hourly_rate   numeric(10,2),
  monthly_revenue           numeric(12,2),
  margin_per_hour           numeric(10,2),
  margin_per_month          numeric(12,2),
  margin_per_year           numeric(12,2),

  status                    offer_status not null default 'entwurf',
  reviewed_by               uuid references profiles(id),
  review_notes              text,
  pdf_file_path             text,
  sent_at                   timestamptz,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_offers_vacancy on offers_calculations(vacancy_id);
create index idx_offers_status on offers_calculations(status);

comment on table offers_calculations is 'Verrechnungssatz-Berechnungen und daraus erzeugte Angebote inkl. Freigabe-Workflow';

-- ---------------------------------------------------------------------
-- 9. TABELLE: activity_logs (Historie/Notizen, polymorph)
-- ---------------------------------------------------------------------
create table activity_logs (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('company','candidate','vacancy','offer')),
  entity_id       uuid not null,
  type            activity_type not null default 'notiz',
  content         text not null,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index idx_activity_entity on activity_logs(entity_type, entity_id);
create index idx_activity_created_at on activity_logs(created_at desc);

comment on table activity_logs is 'Polymorphe Aktivitäten-/Notiz-Historie für Kunden, Kandidaten, Vakanzen und Angebote';

-- ---------------------------------------------------------------------
-- 10. TRIGGER: updated_at automatisch aktualisieren
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_companies_updated_at before update on companies
  for each row execute function set_updated_at();
create trigger trg_contacts_updated_at before update on contacts
  for each row execute function set_updated_at();
create trigger trg_candidates_updated_at before update on candidates
  for each row execute function set_updated_at();
create trigger trg_vacancies_updated_at before update on vacancies
  for each row execute function set_updated_at();
create trigger trg_submissions_updated_at before update on vacancy_submissions
  for each row execute function set_updated_at();
create trigger trg_offers_updated_at before update on offers_calculations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 11. HELPER: aktuelle Rolle des eingeloggten Nutzers
-- ---------------------------------------------------------------------
create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_admin_or_gl()
returns boolean as $$
  select current_user_role() in ('admin', 'geschaeftsleitung');
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table candidates enable row level security;
alter table vacancies enable row level security;
alter table vacancy_submissions enable row level security;
alter table offers_calculations enable row level security;
alter table activity_logs enable row level security;

-- Alle eingeloggten internen Nutzer dürfen alles lesen (typisches interne-Tool-Modell:
-- jeder Recruiter/KAM sieht die gesamte Pipeline, um Kollegen vertreten zu können).
-- Schreibzugriffe sind differenzierter geregelt.

-- profiles: jeder sieht alle Profile, aber nur sich selbst bzw. Admin darf bearbeiten
create policy "profiles_select_all" on profiles
  for select using (auth.uid() is not null);
create policy "profiles_update_self_or_admin" on profiles
  for update using (auth.uid() = id or is_admin_or_gl());
create policy "profiles_insert_admin" on profiles
  for insert with check (is_admin_or_gl());

-- companies: lesen für alle eingeloggten Nutzer, schreiben für zuständigen KAM/Admin/GL
create policy "companies_select_all" on companies
  for select using (auth.uid() is not null);
create policy "companies_insert_auth" on companies
  for insert with check (auth.uid() is not null);
create policy "companies_update_owner_or_admin" on companies
  for update using (assigned_kam_id = auth.uid() or is_admin_or_gl());
create policy "companies_delete_admin" on companies
  for delete using (is_admin_or_gl());

-- contacts: gekoppelt an Zugriff auf das zugehörige Unternehmen
create policy "contacts_select_all" on contacts
  for select using (auth.uid() is not null);
create policy "contacts_write_auth" on contacts
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- candidates: lesen für alle, schreiben für zuständigen Recruiter/Admin
create policy "candidates_select_all" on candidates
  for select using (auth.uid() is not null);
create policy "candidates_insert_auth" on candidates
  for insert with check (auth.uid() is not null);
create policy "candidates_update_owner_or_admin" on candidates
  for update using (assigned_recruiter_id = auth.uid() or is_admin_or_gl());
create policy "candidates_delete_admin" on candidates
  for delete using (is_admin_or_gl());

-- vacancies
create policy "vacancies_select_all" on vacancies
  for select using (auth.uid() is not null);
create policy "vacancies_insert_auth" on vacancies
  for insert with check (auth.uid() is not null);
create policy "vacancies_update_owner_or_admin" on vacancies
  for update using (assigned_recruiter_id = auth.uid() or is_admin_or_gl());
create policy "vacancies_delete_admin" on vacancies
  for delete using (is_admin_or_gl());

-- vacancy_submissions
create policy "submissions_select_all" on vacancy_submissions
  for select using (auth.uid() is not null);
create policy "submissions_write_auth" on vacancy_submissions
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- offers_calculations: Freigabe (status -> 'freigegeben'/'abgelehnt') nur für KAM/GL/Admin
create policy "offers_select_all" on offers_calculations
  for select using (auth.uid() is not null);
create policy "offers_insert_auth" on offers_calculations
  for insert with check (auth.uid() is not null);
create policy "offers_update_creator" on offers_calculations
  for update using (
    created_by = auth.uid()
    or current_user_role() in ('kam', 'geschaeftsleitung', 'admin')
  );

-- activity_logs: alle lesen, jeder eingeloggte Nutzer darf eigene Einträge schreiben
create policy "activity_select_all" on activity_logs
  for select using (auth.uid() is not null);
create policy "activity_insert_auth" on activity_logs
  for insert with check (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- 13. VIEWS für die Kunden-Tabs (abgeleitete Status-Logik)
-- ---------------------------------------------------------------------

-- "Aktiv": mind. eine offene Vakanz ODER Kontakt in den letzten 6 Monaten
create or replace view v_companies_active as
select c.*
from companies c
where c.status <> 'inaktiv'
  and (
    exists (
      select 1 from vacancies v
      where v.company_id = c.id
        and v.status in ('neue_anfrage','offen','in_bearbeitung')
    )
    or c.last_contact_at >= now() - interval '6 months'
  );

-- "Ohne aktive Vakanz": aktiv zusammengearbeitet, aber aktuell keine offene Stelle
create or replace view v_companies_without_active_vacancy as
select
  c.*,
  (select max(v.updated_at) from vacancies v where v.company_id = c.id) as last_vacancy_activity,
  extract(month from age(now(), (select max(v.updated_at) from vacancies v where v.company_id = c.id)))::int
    as months_without_vacancy
from companies c
where c.status <> 'inaktiv'
  and not exists (
    select 1 from vacancies v
    where v.company_id = c.id
      and v.status in ('neue_anfrage','offen','in_bearbeitung')
  )
  and exists (
    select 1 from vacancies v where v.company_id = c.id
  );

-- ---------------------------------------------------------------------
-- 14. MOCK-DATEN
-- ---------------------------------------------------------------------

-- Hinweis: profiles referenzieren auth.users — in einer echten Supabase-Instanz
-- müssen die Nutzer zuerst über supabase.auth.admin.createUser() angelegt werden.
-- Für lokale Entwicklung/Seed-Zwecke fügen wir Dummy-auth.users-Einträge ein.

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'anna.recruiter@cms-platform.de', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'max.kam@cms-platform.de', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'gl@cms-platform.de', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into profiles (id, full_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'Anna Recruiter', 'anna.recruiter@cms-platform.de', 'recruiter'),
  ('22222222-2222-2222-2222-222222222222', 'Max Kamgruber', 'max.kam@cms-platform.de', 'kam'),
  ('33333333-3333-3333-3333-333333333333', 'Sabine Geschäftsleitung', 'gl@cms-platform.de', 'geschaeftsleitung');

insert into companies (id, name, industry, website, city, postal_code, status, assigned_kam_id, last_contact_at) values
  ('a1111111-0000-0000-0000-000000000001', 'TechNova GmbH', 'IT & Software', 'https://technova.example', 'Berlin', '10115', 'aktiv', '22222222-2222-2222-2222-222222222222', now() - interval '10 days'),
  ('a1111111-0000-0000-0000-000000000002', 'BauMeister AG', 'Bauwesen', 'https://baumeister.example', 'München', '80331', 'ohne_aktive_vakanz', '22222222-2222-2222-2222-222222222222', now() - interval '4 months'),
  ('a1111111-0000-0000-0000-000000000003', 'Medico Health Solutions', 'Gesundheitswesen', 'https://medico.example', 'Hamburg', '20095', 'neukunde', '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),
  ('a1111111-0000-0000-0000-000000000004', 'Logistik Partner GmbH', 'Logistik', 'https://logistikpartner.example', 'Frankfurt am Main', '60311', 'inaktiv', '22222222-2222-2222-2222-222222222222', now() - interval '9 months');

update companies set inactive_reason = 'kein_bedarf_mehr', inactive_since = now() - interval '8 months'
  where id = 'a1111111-0000-0000-0000-000000000004';

insert into contacts (company_id, first_name, last_name, position, email, phone, is_primary) values
  ('a1111111-0000-0000-0000-000000000001', 'Julia', 'Hoffmann', 'Head of Engineering', 'julia.hoffmann@technova.example', '+49 30 1234567', true),
  ('a1111111-0000-0000-0000-000000000002', 'Thomas', 'Berger', 'HR-Leiter', 'thomas.berger@baumeister.example', '+49 89 7654321', true),
  ('a1111111-0000-0000-0000-000000000003', 'Nina', 'Keller', 'Recruiting Managerin', 'nina.keller@medico.example', '+49 40 1122334', true);

insert into candidates (id, first_name, last_name, email, phone, anonymized_title, anonymized_profile, status, hourly_rate_net, location, assigned_recruiter_id) values
  ('b1111111-0000-0000-0000-000000000001', 'Stefan', 'Wagner', 'stefan.wagner@example.com', '+49 151 1111111',
   'Senior Java-Entwickler (m/w/d)',
   '{"summary": "Erfahrener Backend-Entwickler mit Fokus auf Microservices.", "qualifications": ["Java", "Spring Boot", "Kubernetes"], "industry_experience": ["Fintech", "E-Commerce"], "certificates": ["AWS Certified Developer"]}'::jsonb,
   'profil_fertig', 85.00, 'Berlin', '11111111-1111-1111-1111-111111111111'),
  ('b1111111-0000-0000-0000-000000000002', 'Laura', 'Schmidt', 'laura.schmidt@example.com', '+49 151 2222222',
   'Projektleiterin Bauwesen (m/w/d)',
   '{"summary": "Projektleiterin mit 10 Jahren Erfahrung im Hochbau.", "qualifications": ["Projektmanagement", "MS Project", "VOB"], "industry_experience": ["Bauwesen"], "certificates": ["PMP"]}'::jsonb,
   'in_einreichung', 70.00, 'München', '11111111-1111-1111-1111-111111111111'),
  ('b1111111-0000-0000-0000-000000000003', 'David', 'Klein', 'david.klein@example.com', '+49 151 3333333',
   'Data Scientist (m/w/d)',
   '{"summary": "Data Scientist mit Schwerpunkt NLP und ML-Ops.", "qualifications": ["Python", "PyTorch", "MLOps"], "industry_experience": ["Gesundheitswesen"], "certificates": []}'::jsonb,
   'neu_eingegangen', null, 'Hamburg', '11111111-1111-1111-1111-111111111111');

insert into vacancies (id, company_id, contact_id, title, source, status, employment_type, requirements, budget_min, budget_max, location, assigned_recruiter_id) values
  ('c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001',
   (select id from contacts where company_id = 'a1111111-0000-0000-0000-000000000001' limit 1),
   'Senior Java-Entwickler (m/w/d)', 'portal', 'in_bearbeitung', 'arbeitnehmerueberlassung',
   '5+ Jahre Java, Spring Boot, Cloud-Erfahrung', 80.00, 95.00, 'Berlin', '11111111-1111-1111-1111-111111111111'),
  ('c1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000002',
   (select id from contacts where company_id = 'a1111111-0000-0000-0000-000000000002' limit 1),
   'Projektleiter Hochbau (m/w/d)', 'email', 'neue_anfrage', 'festanstellung',
   'Erfahrung in der Bauleitung, VOB-Kenntnisse', 65000.00, 80000.00, 'München', '11111111-1111-1111-1111-111111111111');

insert into vacancy_submissions (vacancy_id, candidate_id, match_score, status, submitted_at) values
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 92.50, 'in_pruefung', now() - interval '3 days'),
  ('c1111111-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000002', 88.00, 'angefragt', now() - interval '1 day');

insert into offers_calculations (
  vacancy_id, candidate_id, company_id, created_by, mode,
  candidate_hourly_rate_net, assignment_duration_months, assignment_location,
  factor_tier, factor_value, recommended_hourly_rate,
  monthly_revenue, margin_per_hour, margin_per_month, margin_per_year, status
) values (
  'c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111', 'stundensatz',
  85.00, 6, 'Berlin',
  'spezialist', 2.30, 195.50,
  33396.00, 110.50, 18856.00, 226272.00, 'zur_freigabe'
);

insert into activity_logs (entity_type, entity_id, type, content, created_by) values
  ('company', 'a1111111-0000-0000-0000-000000000001', 'meeting', 'Kickoff-Meeting zur neuen Vakanz Senior Java-Entwickler.', '22222222-2222-2222-2222-222222222222'),
  ('candidate', 'b1111111-0000-0000-0000-000000000001', 'statusaenderung', 'Status von "In Bearbeitung" auf "Profil fertig" gesetzt.', '11111111-1111-1111-1111-111111111111'),
  ('vacancy', 'c1111111-0000-0000-0000-000000000001', 'email', 'Anonymisiertes Profil an Julia Hoffmann versendet.', '11111111-1111-1111-1111-111111111111');

-- =====================================================================
-- ENDE Migration 0001
-- =====================================================================
