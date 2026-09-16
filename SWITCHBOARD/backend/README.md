# SWITCHBOARD — Visual IT Automation Builder

> Backend architecture, engineering rationale, domain model, security model, execution engine, API surface, deployment, and extension guide.

## 1. Executive Summary

SWITCHBOARD is a visual IT automation platform designed to turn repeatable operational procedures into executable workflows. Instead of keeping onboarding, account management, health checks, API calls, database operations, approvals, notifications, and administrative scripts scattered across tickets, shell scripts, spreadsheets, and human memory, SWITCHBOARD models the process as a graph and executes that graph through a controlled backend engine.

The frontend is the visual authoring surface; the backend is the system of record and execution authority. A workflow is therefore not merely a diagram. Its definition is persisted in PostgreSQL, can be triggered manually, by webhook, or by schedule, is executed node-by-node, and produces durable runs, steps, outputs, errors, and logs.

Current production API: `https://switchboard-api-tqc3.onrender.com`

## 2. Problem Statement

IT operations commonly suffer from four related problems. First, procedures are fragmented across scripts, documents, tickets, and people. Second, automation often requires someone who understands the implementation language. Third, scripts may execute successfully without producing a durable, searchable history explaining what happened. Fourth, credentials and administrative actions are easily mixed into application logic, making governance difficult.

SWITCHBOARD addresses these problems by separating workflow intent from execution implementation. A user composes a process from reusable nodes; the backend validates, stores, authorizes, executes, observes, and audits that process.

Example: a new employee workflow can create an account, evaluate the employee's department, add groups or licenses, wait for approval where necessary, and send a welcome email. Every execution becomes a WorkflowRun containing individual WorkflowSteps and RunLogs.

## 3. Goals and Non-Goals

### Goals

- Visual, reusable automation rather than one-off scripts.
- Real execution rather than a canvas-only prototype.
- Persistent workflow definitions and execution history.
- Clear separation between HTTP, domain logic, persistence, and execution logic.
- Role-based access and workflow ownership.
- Encrypted credential storage.
- Auditable administrative changes.
- Manual, webhook, and scheduled entry points.
- Extensible node executor architecture.
- Deployment using a stateless API plus PostgreSQL.

### Current non-goals

SWITCHBOARD is not intended to replace a full enterprise identity provider, SIEM, secrets vault, distributed job platform, or BPM suite. The current scheduler is an application-level interval scheduler and the execution engine runs inside the API process. Those choices are appropriate for the current scale and keep the project understandable and deployable; a production-at-scale evolution is described later.

## 4. Engineering Methodology

The backend follows a pragmatic layered/clean architecture. The objective is dependency direction and separation of responsibilities rather than forcing every enterprise pattern into a small codebase.

Request flow:

```text
Client
  ↓
Route
  ↓
Authentication / Authorization Middleware
  ↓
Controller
  ↓
Zod Validation
  ↓
Service / Domain Operation
  ↓
Prisma Repository Boundary
  ↓
PostgreSQL

Workflow execution:
Trigger → WorkflowRun → Execution Engine → Executor → WorkflowStep → Context/Logs → Next Node
```

The methodology is intentionally incremental: model the domain first, expose thin HTTP adapters, move business rules into services, isolate workflow execution in an engine, isolate node-specific behavior in executors, validate external input at boundaries, and persist operational state so execution is observable.

## 5. Why This Architecture

A single Express file would be faster for a demo but would couple routing, validation, authorization, SQL, workflow traversal, and external integrations. That becomes difficult to test or extend as soon as more node types are introduced.

The layered structure provides a stable mental model:

- **routes** describe endpoints and coarse authorization;
- **controllers** translate HTTP requests/responses;
- **validators** reject malformed external input;
- **services** contain application use cases and persistence operations;
- **engine** understands workflow execution semantics;
- **executors** understand one node type at a time;
- **middleware** handles cross-cutting HTTP concerns;
- **config** centralizes runtime configuration and infrastructure clients;
- **utils** contains reusable technical primitives;
- **Prisma schema** defines the durable domain model.

This means adding a new executor does not require rewriting authentication, and changing an HTTP route does not require changing graph traversal.

## 6. Technology Decisions

### Node.js + TypeScript

The product is integration-heavy and I/O-heavy: REST requests, PostgreSQL, SMTP, SSH, webhooks, and timers. Node.js is well suited to this workload. TypeScript adds static contracts around workflow definitions and backend code, reducing errors in a system where JSON configuration moves through many layers.

### Express 5

Express keeps the HTTP layer small and explicit. SWITCHBOARD needs REST endpoints and middleware, not a large opinionated application framework. This makes the route/controller/service boundaries visible to anyone reading the repository.

### PostgreSQL

Workflow execution is relational even though workflow definitions are graph-shaped. Users own workflows; workflows have triggers and runs; runs have steps and logs. PostgreSQL provides transactions, constraints, indexes, strong consistency, arrays, and JSON fields. JSON is used where flexibility is valuable (`definition`, `config`, `context`, payloads), while identity, lifecycle, ownership, and relationships remain relational.

### Prisma

Prisma provides a typed data access layer, declarative schema, migrations/push workflows, relation handling, and generated TypeScript types. It avoids spreading raw SQL throughout controllers while still allowing raw queries when required, such as readiness checks.

### Zod

Zod validates untrusted request/environment data at runtime. TypeScript types disappear at runtime; Zod does not. This is why request payloads and environment variables are validated before application logic relies on them.

### Supabase PostgreSQL

Supabase is used here as managed PostgreSQL, not as the application's business-logic layer. SWITCHBOARD remains portable because the application talks to PostgreSQL through Prisma. Pooler URLs support hosted IPv4 environments; a direct/session URL is retained for migration-oriented database operations.

### Render

The backend is containerized and deployed as a long-running web service because it needs an HTTP API and an in-process scheduler. The API listens on the platform-provided port and performs graceful shutdown.

### Why not serverless-only for the backend?

A serverless function is excellent for request/response workloads but is a poor fit for the current in-process interval scheduler and potentially longer workflow execution. A persistent service gives SWITCHBOARD a straightforward runtime model. At larger scale, execution should move to dedicated workers and a durable queue.

## 7. Backend Structure

```text
backend/
├── prisma/
│   ├── schema.prisma          # Database domain model
│   └── seed.ts                # Initial admin + sample workflow
├── src/
│   ├── config/                # Environment, Prisma and runtime configuration
│   ├── controllers/           # HTTP adapters
│   ├── engine/
│   │   ├── engine.ts          # Graph execution/orchestration
│   │   └── executors/
│   │       └── index.ts       # Node implementations/registry
│   ├── middleware/            # Auth, RBAC, errors, 404, request IDs
│   ├── models/                # Domain-facing model/type organization
│   ├── routes/                # Express route definitions
│   ├── services/              # Application/domain services
│   ├── types/                 # Shared TypeScript declarations
│   ├── utils/                 # Encryption, passwords, errors, URL normalization
│   ├── validators/            # Zod schemas
│   ├── app.ts                 # Express composition root
│   └── server.ts              # Process lifecycle + scheduler startup
├── Dockerfile
├── package.json
└── tsconfig.json
```

### `app.ts`

The HTTP composition root. It configures Helmet, CORS, JSON parsing, request IDs, Morgan logging, public routes, authenticated routes, 404 handling, and centralized errors. Keeping app construction separate from process startup makes the application easier to reason about and eventually easier to test.

### `server.ts`

Owns process lifecycle: verifies database connectivity, starts Express, starts the scheduler, handles SIGINT/SIGTERM, stops scheduling, disconnects Prisma, and exits cleanly. Process concerns do not belong in controllers or services.

### `config/`

Configuration is validated before use. Important variables include `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, admin bootstrap values, SMTP settings, and `CREDENTIAL_ENCRYPTION_KEY`. Database URL normalization also protects deployment from common connection-string formatting mistakes.

### `routes/`

Current route modules are `auth`, `users`, `workflows`, `runs`, `triggers`, `webhooks`, `credentials`, `directory`, `audit`, and `health`. Routes should stay thin: path + middleware + controller.

### `controllers/`

Controllers parse HTTP-facing data, call validators/services, select safe response fields, and assign status codes. They should not become a second persistence layer.

### `services/`

Current services include workflow, run, trigger, scheduler, webhook, credential, directory, user, authentication, logging, audit writing, and audit querying. Services are where use-case behavior lives.

### `engine/`

The engine is deliberately separate from normal CRUD services. CRUD answers questions such as “save this workflow”; the engine answers “given this graph and this run, what executes next, what context is carried, what is persisted, and what happens on failure/waiting/branching?”

### `validators/`

Validation is performed at system boundaries. This prevents malformed JSON from becoming invalid persistent state and keeps controller/service assumptions explicit.

### `middleware/`

Cross-cutting behavior is centralized: authentication, authorization, request correlation, 404s, and error normalization.

## 8. Domain Model

### User

Represents a SWITCHBOARD platform user. Stores identity, password hash, role, active state, owned workflows, and audit relationship. Passwords are never stored as plaintext.

Roles:

- `ADMIN`: platform administration and unrestricted administrative visibility.
- `OPERATOR`: operational access and permitted run/trigger actions within authorization boundaries.
- `VIEWER`: read-oriented access; mutation endpoints are restricted.

Authentication re-reads the current user from PostgreSQL for authenticated requests. Therefore disabling an account or changing a role takes effect without waiting for an old token to expire.

### Workflow

The durable automation definition. Important fields are `name`, unique `slug`, `description`, `status`, JSON `definition`, `version`, and optional `ownerId`.

Statuses are `DRAFT`, `ACTIVE`, and `ARCHIVED`. Only active workflows should be executable through operational triggers.

The graph is stored as JSON because node/edge configuration evolves more rapidly than the relational lifecycle model. This avoids schema migrations for every new node configuration property.

### Trigger

Connects an event source to a workflow. Current types are `MANUAL`, `WEBHOOK`, and `SCHEDULE`. A trigger has an enabled flag, JSON configuration, and an optional unique secret for webhooks.

Webhook secrets are not returned in normal listing responses. They are generated securely and can be rotated.

### WorkflowRun

One execution instance of a workflow. It stores trigger type/payload, mutable execution context, lifecycle timestamps, final error, steps, and logs.

Run states:

```text
QUEUED → RUNNING → SUCCEEDED
                ↘ WAITING → RUNNING
                ↘ FAILED
                ↘ CANCELLED
```

### WorkflowStep

One node execution within a run. It records node identity/type/label, status, input, output, error, attempt number, and timing. The `(runId, nodeId, attempt)` uniqueness rule allows retry history without collapsing attempts into one row.

Step states are `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `SKIPPED`, and `WAITING`.

### RunLog

Append-style operational log attached to a run, optionally to a node. It stores level, message, metadata, and timestamp. This is separate from AuditEvent because run telemetry and governance audit have different purposes.

### DirectoryUser

A local demonstration/automation directory abstraction with email, name, department, title, active state, groups, licenses, and arbitrary custom JSON. It allows identity-oriented workflow nodes to perform real persistent mutations without requiring a paid external directory during development.

### Credential

Stores a named credential type and encrypted payload. The API does not expose the encrypted payload in normal list responses. Only authorized roles can manage credentials, and mutation events are audited.

### AuditEvent

Governance record containing actor, action, entity, entity ID, metadata, source IP, and timestamp. Audit history answers “who changed what?” while RunLog answers “what happened during this workflow execution?”

## 9. Execution Engine

The execution engine converts a persisted graph into durable execution state.

High-level lifecycle:

1. A trigger identifies an active workflow.
2. A `WorkflowRun` is created with the trigger payload.
3. `executeRun` loads the workflow definition and current run state.
4. The engine identifies the appropriate starting/next node.
5. A `WorkflowStep` is created/updated for the node attempt.
6. The executor receives node configuration plus run context.
7. Output is persisted and merged/available for subsequent execution.
8. Edges determine the next node; conditions may select a branch.
9. A waiting approval pauses the run instead of pretending execution completed.
10. Failures are persisted with error state; retry/continue behavior is applied according to workflow/node semantics.
11. When no executable nodes remain, the run reaches a terminal state.

The engine supports retry attempts, `continueOnFailure`, branching, WAITING approvals, persisted context, per-step timing, and logs.

### Why persist every run and step?

Automation without durable execution history is difficult to operate. Persisting each state transition enables debugging, monitoring UI, approval continuation, retry, auditability, and future analytics.

## 10. Node Executors

The executor registry currently supports operational node types including:

- HTTP Request
- PostgreSQL operation
- Email
- SSH Action
- PowerShell-oriented remote action
- Health Check
- Condition
- Delay
- Approval
- Create User
- Disable User
- Group operations
- License operations

The important design decision is not the exact list; it is that node-specific behavior is isolated behind an executor boundary. The graph engine should not contain SMTP code, SSH code, SQL behavior, and identity logic inline.

### Adding a new executor

A new node should define a stable type identifier, validate the expected configuration, implement execution against the provided context, return serializable output, avoid leaking secrets into logs, and then be registered in the executor mapping. The engine remains unchanged unless the new node introduces genuinely new control-flow semantics.

## 11. Trigger System

### Manual

Used when an authenticated operator explicitly starts a workflow. Manual execution is useful for testing and controlled operational procedures.

### Webhook

Public event entry point with an important security boundary. A webhook requires an active workflow, enabled WEBHOOK trigger, and correct secret. Secret comparison uses a timing-safe comparison. The secret can be supplied through the supported webhook secret mechanism and can be rotated from the authenticated trigger API.

The webhook endpoint creates a run and returns `202 Accepted`; execution proceeds through the engine.

### Schedule

The application scheduler periodically scans enabled schedule triggers attached to active workflows. Current schedule configuration is interval-oriented (minutes/hours/days) with a minimum one-minute interval. It checks the latest corresponding scheduled run before creating another run.

This implementation is intentionally simple for the current deployment. At horizontal scale, a database-backed lock/durable queue or dedicated scheduler service should prevent multiple replicas from scheduling the same job.

## 12. Run Operations

Runs are not immutable black boxes. Operational APIs support:

- listing/filtering runs;
- retrieving a run with workflow, steps, and logs;
- approval continuation;
- rejection with reason;
- cancellation;
- retry of failed/cancelled executions.

Approval marks the waiting step successful and resumes execution from that point. Rejection persists the reason and terminates the run as failed. Cancellation marks pending/running/waiting work as skipped where appropriate. Retry creates a new run rather than rewriting history, preserving observability.

## 13. Authentication and Authorization

Authentication uses a signed HMAC token containing subject, identity, role, and expiration. Password verification is performed against password hashes. The API then verifies the current database user for authenticated requests, preventing disabled users from continuing to use previously issued tokens and ensuring role changes take effect.

Authorization is applied in layers:

1. authentication proves the request has a valid session token;
2. role middleware enforces coarse capability (`ADMIN`, `OPERATOR`, `VIEWER`);
3. service/controller ownership checks enforce resource-level access, such as workflow/run/trigger ownership.

This layered approach is stronger than checking roles only in the frontend. The frontend is never a security boundary.

## 14. Credential Security

`CREDENTIAL_ENCRYPTION_KEY` must be a 64-character hexadecimal value (32 bytes). Credential data is encrypted before persistence and decrypted only when backend execution needs it. Secret payloads are not returned in list APIs, and credential create/update/delete operations are restricted and audited.

Why application-level encryption? Database access alone should not automatically reveal integration secrets. In a larger enterprise deployment this abstraction can later be replaced by a managed vault/KMS without changing every workflow endpoint.

## 15. API Organization

Public/service endpoints:

```text
GET  /                         service metadata
GET  /health                   liveness
GET  /health/live              liveness
GET  /health/ready             database readiness
POST /api/auth/login           login
POST /api/webhooks/:slug       secured webhook execution
```

Authenticated API groups:

```text
/api/auth
/api/users
/api/workflows
/api/runs
/api/directory
/api/credentials
/api/audit
/api/triggers
```

Important run actions include:

```text
GET  /api/runs
GET  /api/runs/:id
POST /api/runs/:id/approve
POST /api/runs/:id/reject
POST /api/runs/:id/cancel
POST /api/runs/:id/retry
```

Trigger management includes workflow trigger listing/creation, update/delete, and admin secret rotation. Credentials expose metadata rather than plaintext/encrypted secret content.

## 16. HTTP and Middleware Pipeline

The application disables the Express technology header, trusts the deployment proxy, assigns request IDs, applies Helmet security headers, applies configured CORS, limits JSON bodies, writes access logs through Morgan, mounts public endpoints before authentication, then mounts authenticated APIs, followed by 404 and centralized error middleware.

CORS origins come from `FRONTEND_URL`, allowing deployment configuration without hardcoding a Vercel domain into source code.

Centralized error handling maps validation failures to 400, application errors to their explicit status, Prisma uniqueness conflicts to 409, missing Prisma records to 404, and unexpected failures to a generic 500 response without intentionally returning stack traces to clients.

## 17. Health and Readiness

Liveness answers whether the process is running. Readiness executes a simple database query and returns unavailable when PostgreSQL cannot be reached. These are intentionally different: a Node process can be alive while its database dependency is unavailable.

## 18. Scheduler and Process Lifecycle

The scheduler starts only after the API has successfully verified PostgreSQL connectivity. `SIGINT` and `SIGTERM` trigger graceful shutdown: scheduling stops, the HTTP server stops accepting work, Prisma disconnects, and the process exits. A forced timeout prevents indefinite shutdown.

This matters on Render and container orchestration platforms because deploys terminate old instances. Graceful shutdown reduces interrupted work and leaked connections.

## 19. Environment Variables

```env
PORT=4000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
FRONTEND_URL=http://localhost:3000
JWT_SECRET=<minimum-32-character-secret>
JWT_EXPIRES_IN=8
ADMIN_EMAIL=admin@switchboard.local
ADMIN_PASSWORD=<strong-password>
ADMIN_NAME=Switchboard Admin
CREDENTIAL_ENCRYPTION_KEY=<64-hex-characters>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Switchboard <noreply@switchboard.local>
```

Never commit real passwords, database URLs, JWT secrets, SMTP passwords, or encryption keys.

`DATABASE_URL` is the application connection string. `DIRECT_URL` is intended for direct/session database operations such as migration workflows. Hosted Supabase deployments may use the transaction pooler for application traffic and session/direct pooler for migration-oriented operations.

## 20. Local Development

```bash
npm install
npx prisma generate
npm run db:push
npm run seed
npm run dev
```

Build and production start:

```bash
npm run build
npm start
```

Database commands available in `package.json`:

```bash
npm run prisma:generate
npm run db:push
npm run db:migrate
npm run seed
```

## 21. Seed Strategy

The seed creates an initial administrator from environment-controlled bootstrap values and a realistic employee-onboarding workflow. The seed is not intended to hide production configuration inside source code; bootstrap credentials are environment-driven.

A realistic seed is valuable because it validates relationships and gives the frontend/engine a meaningful graph immediately after setup.

## 22. Deployment Architecture

```text
┌───────────────────────────────┐
│ Next.js / React Frontend      │
│ Vercel                        │
└──────────────┬────────────────┘
               │ HTTPS REST
               ▼
┌───────────────────────────────┐
│ SWITCHBOARD API               │
│ Node.js + Express + TS        │
│ Render                        │
│                               │
│ Auth / RBAC                   │
│ Workflow Services             │
│ Execution Engine              │
│ Executors                     │
│ Scheduler                     │
└──────────────┬────────────────┘
               │ Prisma
               ▼
┌───────────────────────────────┐
│ PostgreSQL                    │
│ Supabase                      │
│ workflows/runs/logs/audit/... │
└───────────────────────────────┘
```

External executors may additionally communicate with HTTP services, PostgreSQL targets, SMTP servers, or SSH-capable hosts.

## 23. Why SWITCHBOARD Is Different

SWITCHBOARD's differentiator is not “drag and drop” alone. Many workflow products can draw nodes. The project is designed around **IT operations + execution transparency + extensibility**.

Compared with ad-hoc scripts, SWITCHBOARD gives visual composition, reusable nodes, controlled credentials, roles, persistent execution history, approvals, and centralized logs.

Compared with generic no-code automation, SWITCHBOARD is deliberately oriented toward operational actions such as SSH/PowerShell, database operations, user lifecycle, groups/licenses, health checks, and administrative approvals rather than only SaaS-to-SaaS marketing integrations.

Compared with a frontend-only workflow demo, the graph is backed by a real persistence model and execution engine. Runs, attempts, failures, waits, retries, logs, and audit events are first-class backend concepts.

Compared with hardcoded IT portals, workflows are data. New processes can be assembled from nodes instead of requiring a new page/controller for every operational procedure.

## 24. Reliability Design

The current design includes durable run/step state, attempt numbers, failure persistence, retries, cancellation, approval waiting, readiness checks, graceful shutdown, and scheduler deduplication based on prior scheduled runs.

For larger production scale, the next reliability evolution would be:

```text
API → Durable Queue → Worker Pool → Executors
          ↑              ↓
      Scheduler      PostgreSQL
```

A queue would provide leases, delayed jobs, concurrency limits, retries with backoff, crash recovery, and horizontal workers. This is intentionally a future evolution rather than prematurely adding Redis/queue infrastructure to the current deployment.

## 25. Security Design Summary

- Password hashing; no plaintext passwords in the database.
- Signed expiring authentication tokens.
- Database-backed active-user/role verification.
- RBAC plus ownership checks.
- Helmet security headers.
- Configurable CORS.
- Request body size limit.
- Zod input/environment validation.
- Encrypted integration credentials.
- Credential values omitted from normal responses.
- Webhook secrets and secret rotation.
- Timing-safe webhook secret comparison.
- Audit events for sensitive administrative mutations.
- Generic server errors rather than leaking internals.
- Environment secrets kept outside source code.

## 26. Observability

SWITCHBOARD uses three complementary forms of observability:

1. **HTTP access logs** via Morgan: request-level traffic.
2. **RunLog**: execution-level events and node messages.
3. **AuditEvent**: governance-level user actions.

These should remain separate because mixing them makes operational investigation harder.

## 27. Design Trade-offs

### JSON workflow definitions

**Benefit:** new node configs can evolve rapidly and React Flow graph data maps naturally to JSON. **Trade-off:** database constraints cannot validate every internal node property, so application validation is important.

### In-process execution

**Benefit:** simple deployment and no extra queue service. **Trade-off:** long executions share the API process and crash recovery is less sophisticated than a durable worker system.

### In-process scheduler

**Benefit:** zero extra infrastructure. **Trade-off:** multiple API replicas would require distributed coordination.

### Custom signed token

**Benefit:** small dependency surface and transparent implementation. **Trade-off:** an enterprise deployment may prefer a standard identity provider/OIDC and mature token/session library.

### Local DirectoryUser abstraction

**Benefit:** real persistent identity automation can be demonstrated for free. **Trade-off:** production AD/Entra integration would require provider-specific executors and credential policies.

These trade-offs are conscious architecture decisions, not hidden limitations.

## 28. Extension Roadmap

Natural next backend improvements include a durable queue/worker layer, cron-expression schedules with timezone handling, idempotency keys for external triggers, workflow definition version snapshots per run, distributed scheduler locks, per-node timeout/circuit-breaker policies, managed secret-vault adapters, OIDC/SSO, OpenAPI generation, automated integration tests, metrics/tracing, pagination cursors, rate limiting, and provider-specific Active Directory/Entra/GitHub/ServiceNow executors.

## 29. Development Rules

When extending the backend:

1. Do not put business logic in routes.
2. Keep controllers as HTTP adapters.
3. Validate untrusted input before services execute it.
4. Put reusable use-case behavior in services.
5. Put graph semantics in the engine, not in individual controllers.
6. Put integration-specific behavior in executors.
7. Never return or log credential plaintext.
8. Apply both role and resource-level authorization where needed.
9. Persist meaningful execution state transitions.
10. Audit security-sensitive administrative mutations.
11. Keep infrastructure/runtime configuration in environment variables.
12. Prefer additive executors over special-casing workflows in the engine.

## 30. Backend Definition of Done

For the current SWITCHBOARD milestone, the backend includes the core domain schema, PostgreSQL persistence, Prisma integration, authentication, RBAC, user administration, workflow CRUD/ownership, workflow execution, run/step/log persistence, manual/webhook/schedule trigger infrastructure, secured webhook execution, schedule worker, approvals, rejection, cancellation, retry, credential encryption, directory operations, audit events, health/readiness endpoints, centralized validation/error handling, Docker-compatible startup, and graceful shutdown.

The next product layer is the frontend: the visual builder should consume these backend capabilities rather than recreate business logic in the browser.
