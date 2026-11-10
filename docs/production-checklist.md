# Produktions-Checkliste (CMS Recruiting)

Isolierte Test-/Staging-Umgebung zuerst. **Keine** Produktionsmigration und **kein** Prod-DB-Zugriff aus Dev-Agenten.

## Reihenfolge

### 1. Schema / Migration (Staging → Prod)
1. Backup / Neon point-in-time restore point erstellen.
2. Migrationen aus `drizzle/` (`0000` → `0002` …) **zuerst auf Staging** anwenden und verifizieren.
3. Smoke: `node --experimental-strip-types scripts/ba4-crm-smoke.mjs` gegen Staging.
4. Erst danach Migrationen auf Production (manuell, mit Freigabe) — nicht aus dieser Dev-Session.

### 2. ENV-Konfiguration (Live)
Setzen / prüfen (keine Secrets committen):

| Bereich | Pflicht | Optional |
|---------|---------|----------|
| Modus | `NEXT_PUBLIC_DEMO_MODE=false` (oder unset) | — |
| Neon | `DATABASE_URL` | — |
| Better Auth | `BETTER_AUTH_SECRET` (≥32), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | — |
| Private Docs (B2 bevorzugt) | `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION` | R2-Fallback: `R2_*` |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | `EMAIL_REPLY_TO`, `EMAIL_NOTIFY_TO` |
| Rate-Limit | — | `RATE_LIMIT_BACKEND=memory` (default); später `redis` + `REDIS_URL` |

Fail-closed Erwartung: fehlende R2/Resend → klare Fehler, kein Demo-Fallback.

Setup-Anleitungen: [`docs/b2-setup.md`](b2-setup.md), [`docs/r2-setup.md`](r2-setup.md), [`docs/resend-setup.md`](resend-setup.md).
Prep-Smoke (ohne Mailversand): `node scripts/r2-resend-prep-smoke.mjs` (+ optional `--probe-b2` / `--probe-r2` / `--probe-resend`).

### 3. Deploy + Health
1. `npm ci && npm test && npx tsc --noEmit && npm run build`
2. App deployen mit Live-ENV.
3. Login Staff + Candidate auf Staging/Prod-URL prüfen.

### 4. E-Mail-Test (echte Provider-Credentials, Staging-Domain)
1. Staff-Einladung an interne Testadresse.
2. Passwort-Reset (Staff + Candidate-Forgot-Link).
3. Portal-Statusmail (z. B. `changes_requested`) und optional `EMAIL_NOTIFY_TO`.
4. Keine Tokens/Links in Logs speichern.

### 5. Dokumenten-Test (privates B2 / R2)
1. Candidate CV-Upload (PDF).
2. Candidate Self-Download `/api/candidate/cv`.
3. Staff-Download über Portal-Prüfung-Link.
4. Unautorisierte IDs → 401/403; fremde Candidate-ID → gebunden / denied.
5. Bestätigen: keine öffentlichen Objekt-URLs.

### 6. Authz-Stichprobe
1. Recruiter darf Nutzerverwaltung nicht nutzen.
2. Candidate kommt nicht in Staff-CRM.
3. Rate-Limit: wiederholte Login-/Reset-Versuche → Drosselung (429 / UX-Message).

### 7. Rollback (bei Fehler)
1. Traffic auf vorherige App-Revision zurücknehmen.
2. Bei Migrationsproblem: Neon restore auf Pre-Migrate-Punkt (nicht „down“-improvieren).
3. R2/Resend Credentials bei Fehlkonfiguration deaktivieren (fail-closed) und Support-Hinweis setzen.
4. Postmortem: welche Checklisten-Stufe fehlschlug.

## Explizit out of scope hier
- Redis Rate-Limit-Wiring (Interface vorbereitet; `RATE_LIMIT_BACKEND=redis` + `REDIS_URL` dokumentiert).
- Playwright als Prod-Gate, solange der Lauf nicht grün war.
- Automatische Produktionsfreigabe.
