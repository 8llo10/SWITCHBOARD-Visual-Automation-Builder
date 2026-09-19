# Release verification and configuration

## Deployment boundary

Changes are on `codex/switchboard-product-completion` in [PR #5](https://github.com/8llo10/SWITCHBOARD-Visual-Automation-Builder/pull/5). Production has not been migrated or deployed by this change. The available Supabase connection did not expose an identifiable SWITCHBOARD project, and the Render service's deployment environment was not available. The existing database's actual schema, data, migration history and backup must be verified before release.

## Required configuration

Frontend root: `SWITCHBOARD` on Vercel.

| Variable | Value/purpose |
| --- | --- |
| `SWITCHBOARD_API_URL` | Backend origin plus `/api`; server-only |
| `APP_ORIGIN` | Exact frontend origin, such as `https://app.example.com`; no trailing slash |
| `NEXT_PUBLIC_WEBHOOK_BASE_URL` | Public backend origin plus `/api`, used for copied webhook URLs |

Backend root: `SWITCHBOARD/backend` on Render.

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` on Render; Docker sets it |
| `PORT` | Listening port; default `4000` |
| `DATABASE_URL` | Existing PostgreSQL/Supabase application connection |
| `DIRECT_URL` | Direct/session database connection for Prisma migration operations |
| `FRONTEND_URL` | Frontend origin; comma-separated origins supported |
| `JWT_SECRET` | Random secret of at least 32 characters; preserve for stable sessions |
| `JWT_EXPIRES_IN` | Default `8h`; supports seconds, minutes, hours, days, capped at 24 hours |
| `ADMIN_EMAIL` | Explicit bootstrap administrator email |
| `ADMIN_PASSWORD` | Strong initial password, at least 10 characters; no example/default |
| `ADMIN_NAME` | Optional administrator display name |
| `CREDENTIAL_ENCRYPTION_KEY` | **Existing** 64-character hexadecimal AES key; preserve to retain access to saved credentials |
| `SMTP_HOST`, `SMTP_PORT` | SMTP service for verification and email nodes; port defaults to `587` |
| `SMTP_USER`, `SMTP_PASS` | SMTP authentication |
| `SMTP_FROM` | Verified sender accepted by the SMTP provider |
| `EMAIL_VERIFY_TTL_MINUTES` | Optional verification lifetime, default `60` |
| `EMAIL_VERIFY_RESEND_SECONDS` | Optional resend cooldown, default `60` |
| `EXECUTION_ALLOWED_HOSTS` | Required for production network integrations: comma-separated approved hostnames/IPs; `*.example.com` permits subdomains. Include HTTP, health, PostgreSQL, SSH and SMTP targets. HTTP redirects are deliberately not followed. |
| `QUEUE_CONCURRENCY` | Concurrent runs per worker process, `1`–`16`, default `3` |

One-off verification variables: `INTEGRATION_TESTS=1` enables the guarded test suite; `BASELINE_BACKUP_CONFIRMED=yes` confirms an already completed backup for the baseline mark operation. Never put either in production's routine start command. The `SWITCHBOARD_API_KEY` legacy frontend variable is unused and unnecessary.

## Existing database release sequence

1. Provide access to the actual SWITCHBOARD Supabase/Render environment and take a verified restorable backup. Do not change the existing credential encryption key.
2. Pause old workers and follow [the baseline procedure](backend/MIGRATIONS.md). This first compares the historical schema read-only, then marks the baseline without executing its CREATE statements. Schema differences must be reconciled before marking it.
3. Apply the reviewed additive migrations. Build the backend and generate Prisma Client. Use `node dist/server.js` as Render's start command only after the baseline and migrations succeed; use a controlled `prisma migrate deploy` predeploy operation thereafter. The temporary `db push` start is intentionally retained until this gate is passed.
4. Deploy the backend, confirm `/health/ready` and authenticated `/api/system/metrics`, then deploy the frontend with matching API/origin settings. Existing sessions require a fresh login.
5. Check actual email delivery/verification, then use supplied test credentials to exercise SMTP, a PostgreSQL target, SSH and PowerShell. Register the intended triggers and verify one real webhook and schedule tick. Review explicit workflow and credential grants for operator-owned workflows.

These are external-access or real-integration checks. Repository and isolated-database verification is automated in GitHub Actions; no production seed/reset is required.

## Verification coverage and limits

The automated suite covers authentication and verification endpoints, session rotation/revocation, disabled users, RBAC/ownership, credential grants, workflow validation/CRUD, real directory mutations, graph joins and conditions, webhook acceptance, schedule deduplication, queue execution, approval resume/timeout, cancellation while running, stale leases and original-snapshot retry. Playwright signs in, creates/configures/connects a workflow, saves, executes, reads persisted output, checks HttpOnly session handling and checks mobile node visibility.

The code uses real network integrations, but no production SSH, Windows, SMTP or external database credentials were available for end-to-end verification. Email inbox delivery and production provider configuration remain external release gates. The unit tests cover safe template resolution, graph readiness, credential encryption, redaction, passwords, JWTs, session durations and validation. This evidence does not constitute a penetration test or an unrestricted production-readiness certification.
