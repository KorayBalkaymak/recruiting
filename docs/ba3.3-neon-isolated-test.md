# BA3.3 – Isolierte Neon-Testdatenbank (Vorbereitung)

**Keine Production-DB. Keine Secrets in dieses Dokument schreiben. Migrationen hier nur beschreiben, nicht ausführen, bis separat freigegeben.**

## 1. Zweck

Kontrollierte Integrationsprüfung von:

- Better-Auth Signup/Invite (`text` user.id)
- Domain-UUIDs (`profiles`, `candidate_accounts`, …)
- `db.batch()` Provisionierung
- CTE-atomare Review- und `approved→draft`-Schreibvorgänge

## 2. Voraussetzungen

- Separates Neon-Projekt oder Branch **nur für Tests**
- Drizzle-Migrationen im Repo: `drizzle/0000_init.sql`, `0001_white_ares.sql`, `0002_flat_demogoblin.sql`
- `drizzle-kit` / `psql` lokal verfügbar

## 3. Environment (Beispielnamen, keine echten Werte)

```bash
# Live/Test – Demo AUS
NEXT_PUBLIC_DEMO_MODE=false

DATABASE_URL=postgresql://…@…/cms_test?sslmode=require

BETTER_AUTH_SECRET=<mindestens-32-zeichen-zufällig>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Demo-Secrets nur wenn Demo explizit getestet wird
# NEXT_PUBLIC_DEMO_MODE=true
# DEMO_SESSION_SECRET=<mindestens-32-zeichen-zufällig>
```

**Prüfung der Ziel-DB:**

```bash
# Host/DB-Name aus URL manuell gegen Neon-Console abgleichen (Testprojekt).
# Niemals Production-Connection-String in Shell-History committen.
psql "$DATABASE_URL" -c 'select current_database(), inet_server_addr();'
```

Erwartet: Name der **Test**-Datenbank, nicht Production.

## 4. Migrationen (Reihenfolge)

Nur nach Freigabe und nur gegen die Test-URL:

1. `drizzle/0000_init.sql` – Domain (inkl. `citext`, Enums, `candidate_accounts`, Documents, Exklusiv-Trigger)
2. `drizzle/0001_white_ares.sql` – Better Auth (`user`/`session`/`account`/`verification`, **text** PKs)
3. `drizzle/0002_flat_demogoblin.sql` – Portal-Status, Review-Events

Alternativ (nach Freigabe): `drizzle-kit migrate` mit `DATABASE_URL` auf Test zeigen.

**Vorher prüfen:** Extension `citext` / `pgcrypto` (bzw. `gen_random_uuid`) auf Neon verfügbar.

## 5. Smoke-Checkliste (manuell / später automatisiert)

| # | Szenario | Erwartung |
|---|----------|-----------|
| 1 | Candidate-Signup | `user` + `candidate_accounts` + Portal `draft` |
| 2 | Provision Batch | alle 5 Domain-Zeilen oder keine |
| 3 | Prov. Fehler simulieren | kein Orphan (Transaktion/Batch) |
| 4 | Candidate-Login | Session; nur eigenes Profil |
| 5 | Profil speichern (`draft`) | OK |
| 6 | Einreichen | `submitted` + Event |
| 7 | Staff-Invite + Login | `profiles` + Auth-User |
| 8 | Review `submitted→in_review` | Status + Event |
| 9 | Review CTE atomar | kein Status ohne Event |
| 10 | Zwei parallele Reviews | einer OK, einer Conflict |
| 11 | ID-Convention | `user.id` === `candidate_accounts.id` / `profiles.id` (UUID-Text) |
| 12 | Admin Role-Update | nur bestehendes Staff-Profil; Candidate-ID abgelehnt |

## 6. Testdaten entfernen

Nach dem Lauf nur in der Test-DB:

- Auth-User und abhängige Domain-Zeilen der Testaccounts löschen, **oder**
- Neon-Branch/DB zurücksetzen / neu anlegen

Keine Cleanup-Scripts gegen Production.

## 7. Was BA3.3 noch nicht beweist

Unit-/Contract-Tests beweisen **nicht** Neon-Laufzeitverhalten. Freigabe für „Live-ready“ erst nach erfolgreicher isolierter Smoke-Liste oben.
