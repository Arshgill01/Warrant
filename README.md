# Warrant

Warrant is a demo-first Auth0 for AI Agents hackathon project built around one thesis:

**OAuth was designed for apps. AI agents need warrants.**

This scaffold establishes the shared repo foundation only. It intentionally does not implement product behavior yet.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Vitest

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to a local env file and replace the placeholder values before wiring Auth0, OpenAI, or database integrations.

## Directory guide

- `src/app`: App Router entrypoints and page shell
- `src/components`: Shared UI used by the scaffold
- `src/contracts`: Cross-worktree types and coordination contracts
- `src/auth`: Auth and session boundary
- `src/connections`: External provider connection boundary
- `src/warrants`: Warrant issuance and validation boundary
- `src/agents`: Planner and child-agent orchestration boundary
- `src/approvals`: Sensitive-action approval boundary
- `src/actions`: Executable action boundary and capability checks
- `src/graph`: Delegation tree UI boundary
- `src/audit`: Lineage, receipts, and event log boundary
- `src/demo-fixtures`: Deterministic demo fixtures and shared placeholder data

## Intended worktree split

- Auth worktree: `src/auth`, `src/connections`
- Warrant engine worktree: `src/warrants`, `src/contracts/warrant.ts`, `src/contracts/action.ts`
- Agents worktree: `src/agents`, `src/actions`
- Approval worktree: `src/approvals`
- Graph UI worktree: `src/graph`
- Audit worktree: `src/audit`
- Demo stability worktree: `src/demo-fixtures`
- Shared coordination changes: `src/contracts`, `src/app`, `src/components`

## Validation

Foundation validation commands:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```
