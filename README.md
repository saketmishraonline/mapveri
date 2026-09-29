# MapVeri

MapVeri is a community-powered open map. People add local places, nearby residents confirm or dispute them, and admins keep the public record accurate.

## Stack

- React + Vite + Tailwind CSS frontend
- Express API server with typed OpenAPI-generated clients
- PostgreSQL + Drizzle ORM
- JWT authentication with bcrypt password hashing
- OpenStreetMap-style map workspace and proximity verification logic

## Setup

1. Clone the repository.
2. Provision PostgreSQL and set `DATABASE_URL`.
3. Push the development schema:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Install workspace dependencies:

   ```bash
   pnpm install
   ```

5. Start the API and frontend in separate terminals:

   ```bash
   pnpm --filter @workspace/api-server run dev
   pnpm --filter @workspace/mapveri run dev
   ```

The Replit workflows already provide the required `PORT` and `BASE_PATH` values.

## Demo account

The development server seeds a small dataset on an empty database:

- Admin: `admin@mapveri.local`
- Password: `demo-password`

To create another admin directly in PostgreSQL, insert a user with a bcrypt password hash and `role = 'admin'`:

```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('MapVeri Admin', 'admin@example.com', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'admin');
```

## Verification rules

- New pins begin as `unverified`.
- Confirm votes add points according to the contributor's level: C = 1, B = 2, A = 3.
- Six or more points move a pin to `community_verified`.
- Admin approval moves it to `admin_verified`; rejection hides it from regular users.
- Users cannot verify their own pins or vote twice on the same pin.
- Level B requires 50 pins or 100 verifications. Level A requires 100 pins or 250 verifications.