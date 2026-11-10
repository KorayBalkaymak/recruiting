# Playwright E2E (Demo)

Specs live under `e2e/`. They run against **Demo mode only** (no Neon, no Resend, no R2, no real mail).

## Local (reproducible)

```bash
# 1) Browser once (needs network)
npx playwright install chromium

# 2) Demo production build (NEXT_PUBLIC_* is inlined at build time)
NEXT_PUBLIC_DEMO_MODE=true \
DEMO_SESSION_SECRET='playwright-e2e-demo-session-secret-32chars!' \
BETTER_AUTH_SECRET='playwright-e2e-better-auth-secret-32chars!' \
BETTER_AUTH_URL='http://127.0.0.1:3100' \
NEXT_PUBLIC_APP_URL='http://127.0.0.1:3100' \
npm run build

# 3) E2E (starts `next start` on :3100 via playwright.config.ts)
npm run test:e2e
```

Optional: reuse an already running server on `:3100` (`reuseExistingServer` is on outside CI).

### Covered flows
- Staff login
- Candidate register + login
- Candidate profile submit
- Staff portal review / status change
- Password-reset form (Demo soft-success, no outbound mail)

### Local troubleshooting
| Symptom | Fix |
|---------|-----|
| `Executable doesn't exist` / wrong arch | `npx playwright install chromium`; unset stale `PLAYWRIGHT_BROWSERS_PATH` if needed |
| Watchpack `EMFILE` with `next dev` | Config uses `next start` after build — do not switch back to `next dev` for E2E |
| Agent/Sandbox `SIGABRT` / `kill EPERM` | Run on a normal local shell/CI runner, not inside a restricted sandbox |
| Demo flag ignored | Rebuild with `NEXT_PUBLIC_DEMO_MODE=true` |

**Do not report E2E as passed unless `npm run test:e2e` exited 0 in that environment.**

## CI (GitHub Actions sketch)

```yaml
# .github/workflows/e2e-demo.yml (example — not committed as required)
name: e2e-demo
on:
  pull_request:
  workflow_dispatch:
jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - name: Demo build
        env:
          NEXT_PUBLIC_DEMO_MODE: "true"
          DEMO_SESSION_SECRET: "playwright-e2e-demo-session-secret-32chars!"
          BETTER_AUTH_SECRET: "playwright-e2e-better-auth-secret-32chars!"
          BETTER_AUTH_URL: "http://127.0.0.1:3100"
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100"
        run: npm run build
      - name: Playwright
        env:
          CI: "true"
          NEXT_PUBLIC_DEMO_MODE: "true"
          DEMO_SESSION_SECRET: "playwright-e2e-demo-session-secret-32chars!"
          BETTER_AUTH_SECRET: "playwright-e2e-better-auth-secret-32chars!"
          BETTER_AUTH_URL: "http://127.0.0.1:3100"
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100"
        run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
```

CI notes:
- `CI=true` disables `reuseExistingServer` and enables one retry.
- Workers stay at `1` (shared Demo in-memory store).
- Never point E2E at production Neon/R2/Resend.
