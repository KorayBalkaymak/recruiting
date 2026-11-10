# Cloudflare R2 einrichten (privater CV-/Dokumentenspeicher)

Die App nutzt R2 **nur serverseitig** über die S3-kompatible API (`@aws-sdk/client-s3`).
Es gibt **keine öffentlichen Objekt-URLs**. Upload/Download laufen ausschließlich über autorisierte Routen:

- Kandidat: `POST`/`GET` `/api/candidate/cv`
- Staff: `GET` `/api/portal-pruefungen/[id]/cv`

Demo-Modus (`NEXT_PUBLIC_DEMO_MODE=true`) braucht **kein** R2 (In-Memory).

## 1. Bucket anlegen (privat)

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**.
2. Namen wählen (z. B. `cms-private-docs`) — denselben Wert später als `R2_BUCKET` setzen.
3. **Public access / R2.dev subdomain / Custom domain für Objekte nicht aktivieren.**
4. Keine Bucket-Policy mit `Principal: *` / öffentlichem Lesen setzen.
5. Optional Jurisdiction nur setzen, wenn rechtlich nötig (dann den **passenden** Endpoint verwenden, siehe unten).

## 2. API-Token (minimale Rechte)

1. R2 → **Overview** → Account Details → **Manage** bei API Tokens.
2. **Create Account API token** (oder User API token).
3. Permission: **Object Read & Write** (nicht Admin Read & Write).
4. Scope: **Apply to specific buckets only** → genau den privaten Bucket aus Schritt 1.
5. Token erstellen und **sofort** speichern:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY` (wird nur einmal angezeigt)
6. S3-Endpoint notieren: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `R2_ENDPOINT`
7. Account ID → `R2_ACCOUNT_ID`

**Warum Object Read & Write:** Die App braucht `PutObject`, `GetObject`, `DeleteObject` (CV ersetzen). Admin-Rechte sind unnötig und riskanter.

## 3. ENV (nur lokal / Hosting-Secret-Store — nie committen)

```bash
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_BUCKET=<privater-bucket-name>
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_REGION=auto
```

Jurisdiction-Buckets (falls verwendet):

| Jurisdiction | Endpoint |
|--------------|----------|
| Default | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| EU | `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` |
| US | `https://<ACCOUNT_ID>.us.r2.cloudflarestorage.com` |

Fail-closed: fehlen Werte → Live-Uploads scheitern mit klarer Meldung; Demo bleibt unberührt.

## 4. Was du in Cloudflare selbst prüfen musst

- [ ] Bucket existiert und ist **nicht** öffentlich erreichbar
- [ ] Kein R2.dev-Public-URL / Custom Domain auf dem Bucket
- [ ] API-Token nur **Object Read & Write**, auf **diesen** Bucket beschränkt
- [ ] Secret nur in `.env.local` / Hosting-Secrets, nicht in Git
- [ ] Endpoint stimmt mit Account-ID (und optional Jurisdiction) überein

## 5. Verbindungstest (lokal)

Ohne echte Credentials nur Config-Status:

```bash
node scripts/r2-resend-prep-smoke.mjs
```

Mit gesetzten R2-ENV (schreibt/löscht ein winziges Objekt unter `healthchecks/`):

```bash
node scripts/r2-resend-prep-smoke.mjs --probe-r2
```

Danach manuell in der App (Staging / Live-ENV, **nicht** Prod-DB aus Dev):

1. Kandidat CV-Upload (PDF)
2. Self-Download `/api/candidate/cv`
3. Staff-Download in Portal-Prüfung
4. Fremde/unautorisierte IDs → 401/403
5. Bestätigen: keine öffentlichen Objekt-Links in UI oder Responses

Referenz: [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/), [R2 API Tokens](https://developers.cloudflare.com/r2/api/tokens/).
