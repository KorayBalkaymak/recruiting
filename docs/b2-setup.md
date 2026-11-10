# Backblaze B2 einrichten (privater CV-/Dokumentenspeicher)

Die App nutzt B2 **nur serverseitig** über die S3-kompatible API (`@aws-sdk/client-s3`).
Keine öffentlichen Objekt-URLs — Upload/Download nur über autorisierte Routen:

- Kandidat: `POST`/`GET` `/api/candidate/cv`
- Staff: `GET` `/api/portal-pruefungen/[id]/cv`

Demo-Modus braucht **kein** B2 (In-Memory).

## ENV (nur Secret-Store / `.env.local` — nie committen)

```bash
B2_KEY_ID=<keyID>
B2_APPLICATION_KEY=<applicationKey>
B2_BUCKET_NAME=<privater-bucket-name>
B2_ENDPOINT=https://s3.<region>.backblazeb2.com
B2_REGION=<region>   # z. B. eu-central-003
```

Alle fünf Werte sind Pflicht. Endpoint typisch aus dem B2-Dashboard (S3-compatible endpoint der Bucket-Region).

## Bucket / Key (Operator)

1. Privates Bucket anlegen (kein öffentlicher Download / keine öffentliche Bucket-URL für Objekte).
2. Application Key mit Lesen/Schreiben (und Löschen) auf diesem Bucket.
3. Werte nur in Hosting-Secrets setzen.

Live-Priorität: vollständige **B2**-ENV vor Cloudflare R2. Ohne beides: fail-closed.

## Smoke

```bash
node scripts/r2-resend-prep-smoke.mjs
node scripts/r2-resend-prep-smoke.mjs --probe-b2   # Put/Get/Delete unter healthchecks/
```
