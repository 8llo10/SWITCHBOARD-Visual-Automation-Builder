# SWITCHBOARD — Visual IT Automation Builder

SWITCHBOARD is a full-stack visual IT automation control plane: design node-based workflows, persist them, execute real integrations, inspect step/run logs, and manage access through authenticated roles.

## Production feature set

- Next.js 15 + React 19 + React Flow visual workflow editor
- Express/TypeScript backend with PostgreSQL + Prisma
- Signed session authentication with scrypt password hashing
- RBAC: `ADMIN`, `OPERATOR`, `VIEWER`
- Workflow ownership, authorization, definition validation and versioning
- Persistent workflow runs, steps and structured logs
- Branching, retries, continue-on-failure and execution context
- Manual and webhook triggers
- Internal directory: Create/Disable User, Add Group, Assign License
- HTTP Request + Health Check executors
- PostgreSQL query executor
- SSH and remote PowerShell executors
- SMTP Email executor
- Delay and Approval/wait nodes
- AES-256-GCM encrypted credential store
- Audit events for privileged/domain changes
- Admin user-management API
- Responsive visual editor and login experience

Microsoft Entra ID / Microsoft 365 / Active Directory nodes are connector-ready. The internal directory keeps the demo fully executable without falsely claiming access to a corporate tenant.

## Architecture

```text
Browser / Next.js
  ├── Login + visual workflow editor
  └── /api/switchboard/* proxy
              │ Bearer session
              ▼
Express API
  ├── Auth / RBAC / ownership
  ├── Workflows + Triggers
  ├── Runs + Approvals
  ├── Directory + Credentials
  └── Audit
              │
              ▼
Execution Engine
  ├── graph traversal / routing
  ├── retry / failure policy
  └── executors (HTTP, DB, SSH, PowerShell, Email, IT actions)
              │
              ▼
PostgreSQL / Prisma
```

## Local setup

### Database + backend

```bash
cd SWITCHBOARD/backend
cp .env.example .env
npm install
npm run prisma:generate
npm run db:push
npm run seed
npm run dev
```

Generate a 64-character hexadecimal `CREDENTIAL_ENCRYPTION_KEY`. Change `JWT_SECRET` and `ADMIN_PASSWORD` before exposing the service.

### Frontend

```bash
cd SWITCHBOARD
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000/login` and use the admin credentials configured in the backend environment.

## Deployment

### Frontend — Vercel

The repository root contains `vercel.json`, so importing the GitHub repository directly is supported. Alternatively set Vercel **Root Directory** to `SWITCHBOARD`.

Required frontend environment variable:

```env
SWITCHBOARD_API_URL=https://YOUR-BACKEND/api
```

### Backend — Render / Docker

Deploy `SWITCHBOARD/backend` using the included `Dockerfile` (or `render.yaml`). Configure:

```env
DATABASE_URL=postgresql://...
FRONTEND_URL=https://YOUR-VERCEL-DOMAIN
JWT_SECRET=at-least-32-random-characters
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=a-strong-password
CREDENTIAL_ENCRYPTION_KEY=64-hex-characters
```

Optional SMTP variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

After first database provisioning run:

```bash
npm run db:push
npm run seed
```

## API surface

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/workflows`
- `POST /api/workflows/:id/run`, `GET /api/workflows/:id/runs`
- `GET /api/runs/:id`, approval/resume operations
- `/api/directory` IT directory operations
- `/api/credentials` encrypted credential management
- `/api/users` admin-only account management
- `/api/webhooks/*` public trigger boundary with trigger secrets

## Security notes

Never commit `.env` files or production credentials. Keep database/SSH/SMTP secrets in the encrypted credential store or deployment environment. Use HTTPS in production, rotate secrets after accidental exposure, and restrict infrastructure credentials to least privilege.
