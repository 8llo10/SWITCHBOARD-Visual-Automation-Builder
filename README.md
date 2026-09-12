# SWITCHBOARD — Visual IT Automation Builder

SWITCHBOARD is a visual IT automation platform for building and executing real workflows using drag-and-drop nodes, system integrations, and live execution.

## What it does

Users can compose operational workflows on a visual canvas, connect actions and conditions, configure each node, and run the workflow through an execution engine with step-level status and logs.

Example workflow:

`New Employee → Create User → Condition → Add Group / Install Apps → Send Welcome`

## Planned node types

- HTTP Request
- PostgreSQL
- Webhook
- SSH Action
- PowerShell
- Email
- Approval
- Condition
- Delay
- Create User
- Disable User
- Health Check

## Triggers

- Manual run
- Incoming webhook
- Scheduled execution

## Stack

- Next.js
- React Flow
- Node.js / Express
- Prisma ORM
- PostgreSQL
- Docker

## Project goal

The goal is to provide a practical automation workspace for IT operations rather than a static workflow prototype: workflows are intended to be persisted, executed, and observed through real run logs and step states.
