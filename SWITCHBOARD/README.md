# SWITCHBOARD — Visual IT Automation Builder

SWITCHBOARD is a visual IT automation platform. Build workflows by connecting nodes, submit real trigger data, and execute the graph through a persistent backend engine.

## What is real in v1.0

- Visual drag-and-drop workflow builder (Next.js + React Flow)
- Express/TypeScript API
- PostgreSQL persistence with Prisma
- Graph execution engine (branching, retries, continue-on-failure, run context)
- Persistent workflow runs, steps, and logs
- Real internal directory actions: Create User, Disable User, Add Group, Assign License
- Real HTTP requests and health checks
- Real PostgreSQL query node
- Real SSH / remote PowerShell execution through SSH
- SMTP email node
- Delay and approval nodes (approval can resume a waiting run)
- Webhook trigger endpoint
- AES-256-GCM encrypted credentials store
- Server-side Next.js API proxy so the backend API key is not exposed in browser code

> Microsoft Entra ID / Microsoft 365 / Active Directory are represented by connector-ready nodes. The included internal directory makes onboarding fully executable without requiring a corporate tenant. To operate against a real enterprise tenant, add that provider's credentials/API calls instead of pretending a provisioning action succeeded.

## Project structure

```text
SWITCHBOARD/
├─ app/                         # Next.js visual frontend
│  └─ api/switchboard/          # secure server-side proxy to backend
├─ lib/                         # frontend API client
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma          # workflows, runs, steps, logs, directory, credentials
│  │  └─ seed.ts
│  └─ src/
│     ├─ config/                # env + Prisma
│     ├─ engine/
│     │  ├─ engine.ts           # graph runner
│     │  └─ executors/          # node implementations
│     ├─ middleware/            # auth + errors
│     ├─ routes/                # workflows, runs, webhooks, credentials...
│     ├─ services/
│     ├─ types/
│     └─ utils/
├─ docker-compose.yml           # local PostgreSQL
└─ .env.local.example           # frontend → backend connection
```

## Run locally on Windows

### 1. Requirements

Install:
- Node.js 20+
- Docker Desktop (easiest PostgreSQL option)

### 2. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

### 3. Configure backend

```bash
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Backend should start on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

### 4. Configure frontend

Open a second terminal in the project root:

```bash
copy .env.local.example .env.local
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The header should show **Engine connected**.

## Try the real Employee Onboarding workflow

Click **Run workflow** and enter:

```text
Full name: Ghala AlHashmi
Email: ghala@switchboard.dev
Department: IT
Job title: Software Engineer
```

The backend will persist the run and execute:

```text
New Employee
  → Create User
  → Is IT?
      TRUE  → IT Group → Assign GitHub
      FALSE → Finance Group → Assign Excel
```

For `Department = IT`, check the stored user:

```bash
curl -H "x-api-key: dev-switchboard-key" http://localhost:4000/api/directory/users
```

You will see the actual PostgreSQL-backed directory record with its group/license assignments.

## Important API routes

```text
GET    /health
GET    /api/workflows
POST   /api/workflows
PUT    /api/workflows/:id
POST   /api/workflows/:id/run
GET    /api/workflows/:id/runs
GET    /api/runs/:id
POST   /api/runs/:id/approve
POST   /api/webhooks/:workflowSlug
GET    /api/directory/users
GET    /api/credentials
POST   /api/credentials
PUT    /api/credentials/:id
DELETE /api/credentials/:id
```

Protected `/api/*` routes require `x-api-key`. Webhook endpoints are intentionally callable without the API key; for a production deployment, add per-workflow signing secrets/HMAC verification before exposing sensitive workflows publicly.

## Node configuration examples

### HTTP Request

```json
{
  "url": "https://httpbin.org/post",
  "method": "POST",
  "headers": { "content-type": "application/json" },
  "body": { "email": "{{trigger.email}}" }
}
```

### Health Check

```json
{
  "url": "https://example.com",
  "timeoutMs": 8000
}
```

### Condition

```json
{
  "field": "trigger.department",
  "operator": "equals",
  "value": "IT"
}
```

Condition outgoing edges use:

```json
{ "data": { "when": "true" } }
```

or

```json
{ "data": { "when": "false" } }
```

### PostgreSQL

Prefer an encrypted Credential and reference it from the node instead of putting passwords into workflow JSON.

Credential data:

```json
{
  "connectionString": "postgresql://...",
  "ssl": true
}
```

Node config:

```json
{
  "credentialRef": "CREDENTIAL_ID",
  "query": "select now() as server_time"
}
```

### SSH / PowerShell

Credential data:

```json
{
  "host": "server.example.internal",
  "port": 22,
  "username": "automation",
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----..."
}
```

Node config:

```json
{
  "credentialRef": "CREDENTIAL_ID",
  "command": "hostname"
}
```

For PowerShell on a remote Windows host, use an SSH-enabled Windows server and a command such as:

```json
{
  "credentialRef": "CREDENTIAL_ID",
  "command": "powershell -NoProfile -Command \"Get-Service | Select-Object -First 5\""
}
```

## Deploy

Recommended free/low-cost split:

- **Frontend:** Vercel
- **Backend:** Render
- **PostgreSQL:** Neon / Supabase / Render PostgreSQL

### Backend environment variables

Set all values from `backend/.env.example`, especially:

```text
DATABASE_URL
FRONTEND_URL=https://your-switchboard.vercel.app
API_KEY=<long-random-secret>
CREDENTIAL_ENCRYPTION_KEY=<64-hex-character-key>
```

Render build command:

```bash
npm install && npx prisma generate && npm run build
```

Render start command:

```bash
npm start
```

Set the Render root directory to:

```text
backend
```

Run `npx prisma db push` once against the production database (or switch to migrations before production use), then `npm run seed` if you want the sample onboarding workflow.

### Frontend environment variables on Vercel

```text
SWITCHBOARD_API_URL=https://YOUR-BACKEND.onrender.com/api
SWITCHBOARD_API_KEY=<same backend API key>
```

The API key stays on the Next.js server proxy and is not referenced through a `NEXT_PUBLIC_*` variable.

## Security notes

This is an automation engine, so treat credentials and remote-execution nodes as privileged infrastructure. Do not put production passwords directly in workflow JSON, restrict the backend network/API, use dedicated least-privilege service accounts, add signed webhooks before production exposure, and isolate SSH/PowerShell runners when connecting to real corporate systems.
