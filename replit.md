# MapVeri

MapVeri is a community-powered open map where people add, verify, and maintain local places together.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mapveri` — React/Vite app with auth, map workspace, profile, and admin console
- `artifacts/api-server` — Express API routes and JWT-backed MapVeri behavior
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema` — Drizzle schema for users, pins, and verifications
- `lib/api-client-react/src/generated` — generated React Query client

## Architecture decisions

- The frontend uses the generated OpenAPI client so request and response shapes stay aligned with the API.
- Map coordinates are stored as fixed-precision numeric latitude/longitude values and proximity is calculated with the Haversine formula.
- JWTs are kept in local storage for the browser client and attached through the generated fetch client's token getter.
- An empty development database is seeded with one admin, one contributor, and four pins for a useful first run.

## Product

- Browse and search community pins with status and trust signals.
- Add a place, inspect its history, and confirm or dispute it.
- Track contributor levels and recent pins on a profile page.
- Review pins, manage users, and inspect map status layers in the admin console.

## User preferences

- No additional user preferences have been provided.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Use the shared artifact workflows instead of starting Vite or the API with a root-level command.
- The admin demo credentials are development-only and should be replaced before any public launch.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
