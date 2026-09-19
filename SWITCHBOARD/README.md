# SWITCHBOARD

Visual IT automation with a Next.js 15 / React 19 workflow canvas and an Express 5 / Prisma / PostgreSQL execution backend. Login opens the editor. Workflow authoring, trigger configuration, test input, execution history, approvals, and node input/output stay in the workspace.

## Run locally

Use Node.js 22 and a **disposable local PostgreSQL database**.

```bash
cd SWITCHBOARD/backend
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

In another terminal:

```bash
cd SWITCHBOARD
cp .env.local.example .env.local
npm ci
npm run dev
```

Configure backend admin credentials before startup; a first administrator is created if absent. Startup does not overwrite an existing administrator's password. Open `http://localhost:3000/login`.

For an **existing database**, use [the baseline procedure](backend/MIGRATIONS.md) before any migration. Never reset production. The legacy production start command remains in place until that baseline is verified.

## Product behavior

- React Flow editor with form configuration, node search, branch handles, add-and-connect, undo/redo, copy/paste, autosave, validation, layout, minimap and keyboard shortcuts.
- Workflow creation, rename/description, duplication, import/export, templates, archive/restore and delete. Four templates cover onboarding, offboarding and health monitoring.
- Manual, webhook and interval schedule triggers. Register event triggers from their node panel after configuring the graph, then activate the workflow.
- HTTP, PostgreSQL, SSH, PowerShell-over-SSH, health, conditions, delay, approval, email and six internal-directory operations.
- PostgreSQL-backed queue with atomic job claims, renewable worker leases, concurrency limits, durable snapshots and safe interruption handling. No paid queue service.
- Parallel branches and joins, true/false routing, node retries, continue-on-failure, approval deadlines, cancellation and retry from the original definition/version.
- HttpOnly cookie sessions, renewable/revocable JWT sessions, email verification, password hashing, current-role checks, workflow access grants, credential grants, encrypted credentials and audit history.
- Real API/database/queue/scheduler health and paginated runs, audit, users and directory.

Directory nodes update the platform's real PostgreSQL directory. They do not operate a Microsoft AD or Entra tenant. SSH and PowerShell require an SSH-enabled target; email requires SMTP. Schedule intervals have a one-minute minimum; Delay nodes have a 30-second maximum. Templates containing email need an actual recipient and SMTP configuration. Enter alert recipients directly for scheduled templates, since schedule payloads do not contain `adminEmail`.

## Verification and release

[GitHub Actions](https://github.com/8llo10/SWITCHBOARD-Visual-Automation-Builder/actions/workflows/verify.yml) builds both applications, validates Prisma, deploys migrations to a fresh test database, runs unit/integration tests, and exercises the browser-to-database workflow with Playwright. It uploads desktop/mobile screenshots and failure traces.

- [Release configuration and external prerequisites](RELEASE.md)
- [Backend implementation and tests](backend/README.md)
- [Existing production database baseline](backend/MIGRATIONS.md)

The branch does not by itself establish that the existing production database is baselined or that the release is deployed.
