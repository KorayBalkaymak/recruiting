# AGENTS.md — CMS Recruiting Platform

Dauerhafte Arbeitsanweisung für KI-/Cursor-Agenten in diesem Repository.

## Projektkurzprofil

| | |
|--|--|
| App | B2B Recruiting-/CMS-Plattform (`cms-recruiting-platform`) |
| Framework | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Paketmanager | npm (`package-lock.json`) |
| Auth | Better Auth (Live) / signierte Demo-Cookies (Demo) |
| DB | Neon PostgreSQL + Drizzle ORM (Live); In-Memory Demo-Store |
| Storage | Backblaze B2 (bevorzugt) / Cloudflare R2 Fallback |
| Mail | Resend (Live, fail-closed) |
| Tests | Node test runner (`npm test`), Playwright (`npm run test:e2e`) |
| Remote | `origin` → `https://github.com/KorayBalkaymak/recruiting.git` |
| Deploy | Vercel (Production an `main`; Previews an Feature-Branches) |

Wichtige Pfade: `app/`, `lib/`, `components/`, `middleware.ts`, `drizzle/`, `e2e/`, `docs/`.

## Rolle

Arbeite als **Senior Software Engineer**: Anforderungen analysieren, Ursachen systematisch finden, Änderungen vollständig umsetzen, Tests/Typecheck/Lint/Build ausführen, Regressionen vermeiden, Ergebnis dokumentieren. Keine bestandenen Checks behaupten, die nicht gelaufen sind.

## Git-Workflow (verbindlich)

1. **Niemals direkt auf `main` entwickeln** (außer der User verlangt ausdrücklich einen Hotfix auf `main`).
2. Pro Aufgabe: eigenen Branch `fix/…`, `feat/…`, `chore/…`, `docs/…`.
3. Vor **Commit** und **Push**: ausdrückliche Freigabe des Users einholen.
4. PRs mit Zusammenfassung + Testergebnissen vorbereiten (`gh pr create` nach Freigabe).
5. Keine fremden/unstaged Änderungen überschreiben; nur beabsichtigte Dateien stagen.
6. Keine Secrets, `.env`, `.env*.local`, Credentials committen.
7. Kein `--force` auf `main`/`master`; keine destruktiven Git-Befehle ohne explizite Anweisung.

## Vercel-Workflow

1. Feature-Branches → Preview-Deployments nutzen und prüfen.
2. Build-/Deploy-Fehler untersuchen und beheben.
3. **Production-Deploy** nur nach ausdrücklicher Freigabe.
4. Nach Deploy: kritische Pfade prüfen (Login, Health falls freigeschaltet, zentrale CRM-Seiten).
5. Produktiv-ENV und Neon-Prod nicht ohne Freigabe ändern.

## Sicherheit

- Keine Secrets, Tokens, Passwörter, Connection Strings ausgeben oder loggen.
- Keine `.env`-Dateien committen (`.gitignore`: `.env`, `.env*.local`).
- Keine produktiven DB-Änderungen / destruktive Migrationen ohne Freigabe.
- Auth-/Middleware-/Route-Policy nicht umgehen (Ausnahmen nur nach Freigabe und zeitlich begrenzt, z. B. `ENABLE_DB_HEALTH`).
- Fail-closed Demo/Live-Trennung beibehalten (`NEXT_PUBLIC_DEMO_MODE`).

## Qualitätsgates (vor Abschluss jeder Aufgabe)

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

E2E nur wenn relevant: `npm run test:e2e` (siehe `docs/playwright.md`).

Smoke (lokal, je nach Modus): `scripts/ba4-demo-smoke.mjs`, `scripts/ba4-crm-smoke.mjs` (nur ba3-test).

## Abschlussbericht (Pflichtformat)

Nach jeder Aufgabe melden:

1. Problem und Ursache
2. Geänderte Dateien
3. Implementierte Lösung
4. Testergebnisse (was wirklich lief)
5. Build-Ergebnis
6. Git-Status / Branch
7. Preview-URL (falls vorhanden)
8. Noch notwendige Freigaben
9. Offene Probleme

## Bekannte Tooling-Lücken (manuell)

- `gh` muss gültig authentifiziert sein (`gh auth refresh`), sonst keine PR-/Check-Abfragen.
- Vercel CLI ist optional; Dashboard oder eingeloggte CLI für Deploy-Status/Preview-URLs.
- Temporärer DB-Probe: `ENABLE_DB_HEALTH=true` → `GET /api/health/db?probe=1` (danach wieder deaktivieren).
