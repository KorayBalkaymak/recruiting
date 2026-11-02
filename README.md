# CMS — B2B-Recruiting- & CMS-Plattform

## Setup

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env.local.example` zu `.env.local` kopieren und mit deinen Supabase-Projektdaten füllen:
   ```bash
   cp .env.local.example .env.local
   ```
3. Datenbank-Migration gegen dein Supabase-Projekt ausführen (Supabase CLI):
   ```bash
   supabase db push
   # oder: SQL-Datei supabase/migrations/0001_init_schema.sql im SQL-Editor des Supabase-Dashboards ausführen
   ```
4. Typen aus der echten Datenbank generieren (ersetzt den Stub in `types/supabase.ts`):
   ```bash
   npm run supabase:types
   ```
5. Dev-Server starten:
   ```bash
   npm run dev
   ```

## Demo-Login (aus den Mock-Daten der Migration)

| Rolle             | E-Mail                        | Passwort  |
|-------------------|-------------------------------|-----------|
| Recruiter         | anna.recruiter@cms-platform.de | demo1234 |
| Key Account Mgr.  | max.kam@cms-platform.de        | demo1234 |
| Geschäftsleitung  | gl@cms-platform.de             | demo1234 |

## Projektstatus

Aktuell umgesetzt:
- [x] Supabase-Schema (Enums, Tabellen, RLS, Views, Mock-Daten)
- [x] App-Shell (Sidebar, Header, Auth-Middleware, Dashboard)
- [x] Modul Kandidaten (Tabs, anonymisierter Profil-Editor, Baustein-System, PDF-Vorschau & -Export)
- [x] Modul Kunden (Tabs inkl. Aktiv/Ohne-aktive-Vakanz-Logik über SQL-Views, Schnellansicht-Side-Panel)
- [x] Modul Vakanzen-Pipeline (5 Pipeline-Tabs, Matching mit Match-Score, Multi-Step-Formular „Vakanz anlegen“)
- [x] Verrechnungssatzrechner (2 Modi, Faktor-Karten, Donut-Chart, KPI-Kacheln, PDF-Export)
- [x] Freigabe- & Versand-Workflow (Entwurf → Zur Freigabe → Freigegeben/Abgelehnt, E-Mail-Textgenerator, Versandhistorie im Kundenkonto)

Zusätzlich ergänzt (in der Anforderung nur als Sidebar-Einträge genannt, ohne Detail-Spezifikation):
- [x] Anfragen (Posteingang neuer Vakanz-Anfragen, verlinkt auf die Zuweisungs-Aktionen der Vakanzen-Pipeline)
- [x] Einreichungen (vakanzübergreifende Liste aller Kandidaten-Einreichungen, filterbar nach Status)
- [x] Unterlagen (zentrale Ablage: anonymisierte Exposés, Angebots-PDFs, Verträge)
- [x] Verträge (neue Tabelle `contracts` + Migration 0002, Vertragsanlage aus besetzten Vakanzen, Status-Workflow)
- [x] Reporting (Pipeline-Funnel, Umsatz-/Deckungsbeitragstrend, Top-Kunden — alle mit Recharts)
- [x] Nutzerverwaltung (Rollenverwaltung, Einladung neuer Nutzer per Supabase-Admin-API)

Alle Module sind vollständig umgesetzt. Für den produktiven Einsatz empfiehlt sich zusätzlich:
- Eingabevalidierung serverseitig verschärfen (z. B. mit Zod)
- Datei-Uploads für Original-CVs an Supabase Storage anbinden (`cv_file_path`)
- Tests (Unit-Tests für `lib/calculator.ts`, E2E für die Kernflows)
