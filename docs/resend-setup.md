# Resend einrichten (transaktionale E-Mails)

Die App versendet im Live-Modus über die Resend HTTP API (`POST https://api.resend.com/emails`):

| Flow | Wann |
|------|------|
| Mitarbeiter-Einladung | Nutzerverwaltung → Einladung (Better Auth Reset-Link, Invite-Template) |
| Passwort-Reset | `/login/forgot-password` (Staff + Kandidat via `?from=candidate`) |
| Portal-Status | Staff ändert Kandidatenstatus → Mail an Kandidat |
| Optional Staff-Hinweis | Profileinreichung → `EMAIL_NOTIFY_TO` |

Demo-Modus: **kein** Outbound (Transport no-op).
Kandidaten-Einladung per Mail ist **nicht** vorgesehen (Self-Registration).

**Wichtig:** Keine echten Mails ohne ausdrückliche Freigabe versenden. Prep-Smoke sendet nie.

## 1. Resend-Konto und API-Key

1. Bei [Resend](https://resend.com) anmelden.
2. **API Keys** → Create → Key mit Send-Berechtigung.
3. Key nur in Secret-Store / `.env.local` speichern → `RESEND_API_KEY` (Prefix typisch `re_…`).
4. Key nicht committen, nicht in Logs ausgeben.

## 2. Absenderdomain hinzufügen und DNS verifizieren

1. Resend → **Domains** → Domain hinzufügen (eigene Domain, z. B. `example.com` oder Subdomain).
2. Im Tab **Records** die von Resend angezeigten DNS-Einträge **1:1** beim DNS-Host setzen.
3. Typische Records (Werte **exakt** aus dem Dashboard kopieren — nicht raten):

| Zweck | Typ (häufig) | Name/Host (häufig) |
|-------|--------------|--------------------|
| SPF | `TXT` (oder neuere CNAME-Variante) | oft `send` |
| Return-Path / Bounce | `MX` (oder CNAME) | oft `send` |
| DKIM | `TXT` | oft `resend._domainkey` |

Hinweise:

- Host-Felder oft **ohne** die Domain am Ende eintragen (`send`, nicht `send.example.com`), je nach DNS-Provider.
- Bei Cloudflare: Proxy für diese Records **aus** (DNS only / graue Wolke), sonst scheitert die Verifizierung.
- MX auf `send.` kollidiert nicht mit Inbox-MX der Root-Domain — Resend nutzt den `send`-Subdomain-Return-Path.
- Verifizierung meist in Minuten, DNS-Propagierung bis zu 72 h möglich. Tool: [dns.email](https://dns.email) / Resend „Restart verification“.

4. Domain-Status in Resend muss **Verified** sein, bevor `EMAIL_FROM` diese Domain nutzt.

Optional Cloudflare-DNS: Resend „Sign in to Cloudflare“ für automatisches Domain Connect — oder manuell wie oben.

## 3. ENV

```bash
RESEND_API_KEY=re_...
EMAIL_FROM="CMS Recruiting <noreply@your-domain.com>"
# Optional:
EMAIL_REPLY_TO=support@your-domain.com
EMAIL_NOTIFY_TO=recruiting@your-domain.com
```

- `EMAIL_FROM` muss zur **verifizierten** Domain gehören.
- `EMAIL_REPLY_TO` / `EMAIL_NOTIFY_TO` optional; ohne `EMAIL_NOTIFY_TO` entfällt nur der Staff-Hinweis bei Einreichung.
- Fail-closed ohne Key/`EMAIL_FROM`: Live-Einladung bricht mit klarer Meldung ab; Forgot-Password soft-succeeds (keine Enumeration); Demo unverändert.

Zusätzlich für korrekte Reset-/Invite-Links:

```bash
BETTER_AUTH_URL=https://app.your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com
```

## 4. Was du in Resend / DNS selbst prüfen musst

- [ ] Domain in Resend angelegt
- [ ] Alle Dashboard-DNS-Records gesetzt und **Verified**
- [ ] API-Key erstellt und nur in Secrets hinterlegt
- [ ] `EMAIL_FROM` nutzt die verifizierte Domain
- [ ] Optional: `EMAIL_NOTIFY_TO` interne Staging-Adresse
- [ ] Kein Versand an echte Kundenadressen ohne Freigabe

## 5. Verbindungstest (ohne Mailversand)

```bash
node scripts/r2-resend-prep-smoke.mjs
```

API-Key / Domain-Liste prüfen (**sendet keine E-Mail**):

```bash
node scripts/r2-resend-prep-smoke.mjs --probe-resend
```

## 6. Manuelle Flow-Tests (erst nach Freigabe echter Mails)

Nur Staging / Testadressen, **keine** Produktionsdatenbank aus Dev:

1. **Einladung:** Admin lädt internen Testnutzer ein → Mail mit Set-Password-Link → Passwort setzen → Staff-Login.
2. **Passwort-Reset Staff:** `/login` → Passwort vergessen → Link in Mail → `/login/set-password`.
3. **Passwort-Reset Kandidat:** `/candidate/login` → Passwort vergessen (`from=candidate`) → Link → Set-Password.
4. **Portal-Status:** Staff setzt z. B. `changes_requested` → Kandidat erhält Statusmail.
5. Optional: Profileinreichung → Inbox `EMAIL_NOTIFY_TO`.
6. Logs: keine Reset-Tokens / volle URLs mit Query speichern.

Referenz: [Resend Domains](https://resend.com/docs/dashboard/domains/introduction), [DNS / Cloudflare](https://resend.com/docs/knowledge-base/cloudflare).
