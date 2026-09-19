# SWITCHBOARD — Visual IT Automation Builder

A workflow-first automation workspace for IT operations, built with Next.js 15, React 19, React Flow, Express 5, Prisma and PostgreSQL.

The editor supports real persisted runs, conditional and parallel branches, approvals, manual/webhook/schedule triggers, encrypted integration credentials, directory actions and audited access controls. PostgreSQL provides the queue and distributed scheduler coordination without an additional paid service.

- [Application and local setup](SWITCHBOARD/README.md)
- [Backend execution and security](SWITCHBOARD/backend/README.md)
- [Release configuration and verification](SWITCHBOARD/RELEASE.md)
- [Safe baseline for the existing production database](SWITCHBOARD/backend/MIGRATIONS.md)
- [Automated checks](https://github.com/8llo10/SWITCHBOARD-Visual-Automation-Builder/actions/workflows/verify.yml)

Production deployment remains gated on verifying the existing database baseline and environment. Do not reset, seed or recreate the production database.
