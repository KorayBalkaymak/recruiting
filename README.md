# CMS — B2B-Recruiting- & CMS-Plattform

## Setup

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env.local.example` zu `.env.local` kopieren:
   ```bash
   cp .env.local.example .env.local
   ```
3. Modus wählen (`.env.local.example` defaultet auf **Live / Demo aus**):
   - **Demo** (bewusst): `NEXT_PUBLIC_DEMO_MODE=true` + `DEMO_SESSION_SECRET` (≥ 32 Zeichen). In-Memory-Store, kein Neon nötig.
   - **Live** (`NEXT_PUBLIC_DEMO_MODE=false` oder unset): Neon `DATABASE_URL` (Test-Branch, z. B. `ba3-test`) + Better Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`).
4. Live-Schema: Drizzle-Migrationen unter `drizzle/` gegen die **Test-Branch** anwenden — nicht gegen Production.
5. Dev-Server starten:
   ```bash
   npm run dev
   ```

## Datenpfade

| Modus | Auth | Staff-CRM | Kandidaten-Portal |
|-------|------|-----------|-------------------|
| Demo  | Signierte Demo-Cookies / Demo-Store | `createClient()` → Demo-Store | Demo-Portal-Store |
| Live  | Better Auth + Neon (Middleware: Session + Rolle) | `getDb()` Drizzle | `portal-service` + Neon |

`createClient()` aus `lib/supabase/server` und `lib/supabase/client` wirft im Live-Modus absichtlich — Live darf nicht über Supabase gehen.
Middleware trennt Staff- vs Candidate-Routen (inkl. API/PDF) fail-closed; Layouts und Server Actions bleiben zusätzliche Gates.

### Private Dokumente (Backblaze B2 / optional Cloudflare R2)

- Demo: In-Memory-Store (kein Neon/B2 nötig).
- Live: S3-kompatibel über `@aws-sdk/client-s3`. **Keine öffentlichen Objekt-URLs** — Upload/Download nur über autorisierte Server-Routen (`/api/candidate/cv`, `/api/portal-pruefungen/[id]/cv`).
- Bevorzugt B2 (alle Pflicht): `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION` — [`docs/b2-setup.md`](docs/b2-setup.md).
- Optional Fallback R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` (+ optional `R2_REGION=auto`) — [`docs/r2-setup.md`](docs/r2-setup.md).
- Ohne vollständige B2-/R2-Konfiguration: Live-Uploads fail-closed.

### E-Mail-Versand (Resend)

- Demo: kein Outbound-Mail (Transport no-op).
- Live: serverseitig über Resend HTTP API — Mitarbeiter-Einladung, Passwort-Reset (`/login/forgot-password`), Portal-Status an Kandidaten; optional Staff-Hinweis bei Einreichung (`EMAIL_NOTIFY_TO`).
- Kandidaten-Einladung per E-Mail ist **nicht** vorgesehen (Self-Registration).
- Pflicht-Env: `RESEND_API_KEY`, `EMAIL_FROM`. Optional: `EMAIL_REPLY_TO`, `EMAIL_NOTIFY_TO`.
- Reset-/Invite-Links: Better-Auth-Verification-Token, TTL 1h, einmalige Verwendung (`consumeVerificationValue`).
- Einrichtung (Domain + DNS): [`docs/resend-setup.md`](docs/resend-setup.md).

### Rate-Limits

- Stabile API: `enforceRateLimit()` (`lib/security/rate-limit.ts`).
- Default-Backend: In-Memory (`RATE_LIMIT_BACKEND=memory`).
- Redis vorbereitet (`RATE_LIMIT_BACKEND=redis` + `REDIS_URL`), Client noch nicht verdrahtet — Fallback memory, keine erfundenen Secrets.

### Produktions-ENV (Live, Pflicht)

| Service | Variablen |
|---------|-----------|
| Neon | `DATABASE_URL` |
| Better Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` |
| Private Docs | B2: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION` (bevorzugt); optional R2-Fallback |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` (+ optional `EMAIL_REPLY_TO`, `EMAIL_NOTIFY_TO`) |
| Modus | `NEXT_PUBLIC_DEMO_MODE=false` |

Vollständige Checkliste: [`docs/production-checklist.md`](docs/production-checklist.md).
Playwright lokal/CI: [`docs/playwright.md`](docs/playwright.md).

Smoke (lokal):
```bash
npm test
node --experimental-strip-types scripts/ba4-demo-smoke.mjs   # ohne Neon
node --experimental-strip-types scripts/ba4-crm-smoke.mjs    # nur ba3-test
node scripts/r2-resend-prep-smoke.mjs                        # Config-Status (keine Mails)
# optional mit echten Secrets in der Shell-ENV (nie committen):
# node scripts/r2-resend-prep-smoke.mjs --probe-b2
# node scripts/r2-resend-prep-smoke.mjs --probe-r2
# node scripts/r2-resend-prep-smoke.mjs --probe-resend   # GET /domains only
```

Browser-E2E: siehe [`docs/playwright.md`](docs/playwright.md). Nicht als bestanden melden, solange der Lauf nicht exit 0 war.

## Demo-Login

| Rolle             | E-Mail                        | Passwort  |
|-------------------|-------------------------------|-----------|
| Recruiter         | anna.recruiter@cms-platform.de | demo1234 |
| Key Account Mgr.  | max.kam@cms-platform.de        | demo1234 |
| Geschäftsleitung  | gl@cms-platform.de             | demo1234 |

## Projektstatus

Aktuell umgesetzt:
- [x] Neon/Drizzle-Schema (CRM + Auth + Kandidaten-Portal; Test-Branch `ba3-test`)
- [x] Live-CRM-Cutover: Staff-Module nutzen `getDb()` (Kandidaten, Kunden, Vakanzen, Einreichungen, Verträge, Rechner, Reporting, Dashboard, Unterlagen, Nutzerverwaltung)
- [x] Demo-Modus bleibt dual-path (ohne Neon)
- [x] App-Shell (Sidebar, Header, Auth-Middleware, Dashboard)
- [x] Modul Kandidaten (Tabs, anonymisierter Profil-Editor, Baustein-System, PDF-Vorschau & -Export)
- [x] Modul Kunden (Tabs inkl. Aktiv/Ohne-aktive-Vakanz-Logik über SQL-Views, Schnellansicht-Side-Panel)
- [x] Modul Vakanzen-Pipeline (5 Pipeline-Tabs, Matching mit Match-Score, Multi-Step-Formular „Vakanz anlegen“)
- [x] Verrechnungssatzrechner (2 Modi, Faktor-Karten, Donut-Chart, KPI-Kacheln, PDF-Export)
- [x] Freigabe- & Versand-Workflow (Entwurf → Zur Freigabe → Freigegeben/Abgelehnt, E-Mail-Textgenerator, Versandhistorie im Kundenkonto)
- [x] Anfragen, Einreichungen, Unterlagen, Verträge, Reporting, Nutzerverwaltung
- [x] Kandidaten-Portal + Portal-Prüfungen (staff)

Noch ausstehend / bewusst out of scope:
- B2 / R2 / Resend Live-Credentials (Operator: `docs/b2-setup.md`, `docs/r2-setup.md`, `docs/resend-setup.md`)
- Redis Rate-Limit-Client verdrahten (`RATE_LIMIT_BACKEND=redis`)
- Playwright-CI-Workflow aktiv schalten (Vorlage in `docs/playwright.md`)
- Employer-Portal
- Production-Migrate
- ID-Typ-Migration / UI-Redesign
