# SWITCHBOARD backend

Express 5, strict TypeScript, Prisma and PostgreSQL. API routes delegate to validated services; the engine executes persisted workflow snapshots. The API, queue worker and scheduler share one Node process, while all authoritative execution state is in PostgreSQL.

## Execution contract

Runs start QUEUED. Workers claim a row atomically with `FOR UPDATE SKIP LOCKED`, set a unique owner and a 60-second lease, then renew every 10 seconds. `QUEUE_CONCURRENCY` limits simultaneous runs per process. Node attempts, outputs, errors, timing and logs persist in PostgreSQL.

Independent graph branches execute in parallel. A join waits for all predecessors to resolve and runs when at least one incoming route is active. Unselected condition paths are recorded as skipped. Approval nodes put runs into WAITING; authorized decisions enqueue the continuation. Deadlines fail expired approvals. Cancellation is terminal and late completions cannot overwrite it.

A lost worker lease fails the run instead of blindly replaying a potentially completed external operation. Retry is explicit and keeps the original definition/version and input. Operators must consider external side effects before retrying: arbitrary third-party APIs cannot provide an exactly-once guarantee without their own idempotency support.

The scheduler uses a PostgreSQL advisory transaction lock and checks each trigger's latest scheduled run before enqueueing. It catches up once after downtime, without replaying every missed interval. Queues are never executed inline in trigger requests.

## Security and authorization

The Next.js proxy owns the browser's HttpOnly, SameSite session cookie and forwards authentication server-side. JWTs reference a revocable Session row. Authentication rechecks active status, verification and role on every request. Passwords use salted scrypt. Login failures are audited; per-account failure limits persist across restarts. Request-rate limits, Helmet, CORS, request IDs and a 1 MB body limit apply.

ADMIN manages all resources. OPERATOR can edit owned workflows and execute owned or explicitly granted workflows; VIEWER only reads granted resources. Credential references must match the executor type and be granted to operator-owned workflows. AES-256-GCM encrypts credential payloads; list responses never expose ciphertext or plaintext. Keep the encryption key unchanged across routine deployments or existing ciphertext becomes unreadable.

## Commands

```bash
npm ci
npx prisma validate
npx prisma generate
npm run build
npm test
```

Integration tests refuse to run unless `INTEGRATION_TESTS=1`, the database host is localhost/127.0.0.1, and its name ends in `_test`. The GitHub workflow provisions this database and runs migrations. For a local disposable database:

```bash
npx prisma migrate deploy
INTEGRATION_TESTS=1 npm run test:integration
```

Never point tests or seed scripts at production. See [MIGRATIONS.md](MIGRATIONS.md) for existing databases and [RELEASE.md](../RELEASE.md) for all environment settings.
