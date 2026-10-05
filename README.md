# MapVeri

MapVeri is a community-powered open map where people discover, add, and verify local places together. Nearby residents confirm or dispute points of interest, and administrators keep the public record accurate with moderation tools.

---

## Architecture & Workspaces

This project is structured as a modern **pnpm workspace monorepo**:

```text
├── apps/
│   ├── mapveri/         # React 19 + Vite 7 SPA (interactive map, auth, profile, admin)
│   └── api-server/      # Express 5 REST API server (JWT auth, mapveri endpoints)
├── lib/
│   ├── api-client-react/# Auto-generated React Query API client
│   ├── api-spec/        # OpenAPI 3.0 specification (`openapi.yaml`)
│   ├── api-zod/         # Generated Zod validation schemas
│   └── db/              # Drizzle ORM schema and migrations (PostgreSQL)
└── scripts/             # Database migration and utility scripts
```

### Stack Highlights
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, MapLibre GL, Radix UI primitives, Lucide icons, Sonner
- **Backend API**: Node.js 24, Express 5, TypeScript 5.9, Pino logger, esbuild
- **Database & ORM**: PostgreSQL, Drizzle ORM, Drizzle Zod
- **API Contracts**: OpenAPI 3.0 source of truth (`lib/api-spec/openapi.yaml`) with Orval codegen
- **Authentication**: JWT authentication with bcrypt password hashing + optional Supabase Online OAuth (Google / Microsoft Azure)

---

## Getting Started

### Prerequisites
- **Node.js** >= 20 (recommended: Node.js 24)
- **pnpm** >= 9
- **PostgreSQL** (local instance, Docker container, or Supabase Online database)

### Environment Variables
Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string (local or Supabase cloud)
- `JWT_SECRET`: Random 32-byte secret for signing API tokens
- `PORT`: API server port (default: `5000`)
- `VITE_SUPABASE_URL`: (Optional) Supabase project URL for cloud authentication
- `VITE_SUPABASE_ANON_KEY`: (Optional) Supabase anonymous public key

---

## Development Commands

Run all commands from the repository root:

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Runs both the API server and Vite frontend concurrently |
| `pnpm --filter @workspace/api-server run dev` | Runs only the Express API server (port 5000) |
| `pnpm --filter @workspace/mapveri run dev` | Runs only the React frontend (port 5173) |
| `pnpm run build` | Builds both apps and all workspace packages |
| `pnpm run typecheck` | Runs TypeScript type checking across all workspace packages |
| `pnpm --filter @workspace/db run push` | Pushes Drizzle schema directly to PostgreSQL |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerates React Query hooks & Zod schemas from OpenAPI |

---

## Database Seeding & Demo Account

The development server automatically seeds a small demo dataset when connecting to an empty database:

- **Admin Email**: `admin@mapveri.local`
- **Password**: `demo-password`

To manually create an admin user in PostgreSQL:
```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('MapVeri Admin', 'admin@example.com', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'admin');
```

---

## Verification & Trust System

MapVeri uses a community-driven trust score system:
- **Pin Creation**: New pins start with status `unverified`.
- **Contributor Weights**: Verification votes add points based on contributor level:
  - Level C = 1 point
  - Level B = 2 points (unlocked at 50 pins or 100 verifications)
  - Level A = 3 points (unlocked at 100 pins or 250 verifications)
- **Community Verification**: Pins with 6 or more points graduate to `community_verified`.
- **Admin Moderation**: Admins can set status to `admin_verified` or reject/hide disputed pins.
- **Fairness Rules**: Creators cannot verify their own pins, and users cannot vote more than once per pin.

---

## Docker & Deployment

### Docker Stack
Run the full production stack (PostgreSQL + API + Nginx Web SPA) via Docker Compose:
```bash
docker compose up --build
```

If using a hosted Supabase database instead of a local PostgreSQL container:
```bash
docker compose -f docker-compose.supabase.yml up --build
```

### Vercel Deployment
The frontend is configured for Vercel deployment with `vercel.json` routing all SPA routes to `index.html`.