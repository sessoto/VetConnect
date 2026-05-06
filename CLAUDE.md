# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**One-time setup:**
```bash
pnpm install
cp .env.example .env          # set JWT_ACCESS_SECRET + JWT_REFRESH_SECRET (≥16 chars)
pnpm approve-builds           # select: @prisma/client, prisma, @prisma/engines (blocked by pnpm security policy)
docker compose up -d          # PostgreSQL 16 on :5432
pnpm db:migrate
pnpm db:seed                  # demo clinic: admin@demo.vet / vet@demo.vet / asistente@demo.vet — all Password1234
```

**Dev (separate terminals):**
```bash
pnpm dev:api      # Express API on :3000 (tsx watch)
pnpm dev:mobile   # Expo dev server (press a/i for Android/iOS emulator)
```
For physical device set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000` in `.env`.

**Other:**
```bash
pnpm typecheck                        # tsc --noEmit all workspaces
pnpm test                             # vitest integration tests (requires live DATABASE_URL)
pnpm test -- -t "test name pattern"   # run a single test by name
pnpm build                            # compile all workspaces to dist/
pnpm db:migrate                       # run Prisma migrations (apps/api)
pnpm db:seed                          # reseed demo data
cd apps/api && npx prisma studio      # visual DB browser at :5555
```

No linter configured (typecheck serves as quality gate).

## Architecture

**pnpm monorepo** with three workspaces: `apps/api`, `apps/mobile`, `packages/shared`. Root `package.json` has the convenience scripts above.

### `packages/shared` — single source of truth for validation

Zod schemas (`schemas/`) and enums/constants (`constants.ts`) used by both the API and mobile. Zero runtime dependencies beyond Zod. When changing a schema (e.g., `careTask.ts`), the API endpoint and the mobile form are both affected.

Key constants: `TRIAGE_LEVELS` (red/yellow/green), `ROLES` (admin/vet/assistant), `CARE_TASK_TYPES` (medication/feeding/hygiene/control/other), `RECURRENCES` (none/every_n_hours/daily), `CARE_TASK_STATUSES` (pending/done/skipped), `PATIENT_STATUSES` (active/discharged).

### `apps/api` — Express + Prisma backend

- **Entry:** `src/index.ts` → `src/app.ts` (Express setup: helmet, CORS, pino-http logger with authorization header redaction, routes, error handler) + `src/scheduler/` (node-cron).
- **Routes:** `src/routes/` — `auth`, `users`, `patients`, `triage`, `careTasks`, `notes`, `audit`. Each route file imports its Zod schema from `@vetconnect/shared`. `GET /healthz` is available for health checks.
- **Auth middleware:** `src/middleware/auth.ts` exports `authRequired`. It verifies the JWT and injects `{ id, clinicId, role }` onto `req.user`. Every route filters Prisma queries by `req.user.clinicId` inline — this is the multi-tenant isolation boundary (there is no shared `clinicScope` helper).
- **Role middleware:** `src/middleware/requireRole.ts` exports `requireRole(...roles)`. Admin-only routes (user management, audit log) use this after `authRequired`.
- **Prisma:** schema at `prisma/schema.prisma`. Client singleton at `src/prisma.ts`. Run `pnpm db:migrate` inside the workspace or from root.
- **Env:** parsed and validated with Zod at startup (`src/env.ts`). Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Optional: `EXPO_ACCESS_TOKEN` (push delivery).

### `apps/mobile` — Expo (React Native)

- **Routing:** Expo Router (file-based). `app/(auth)/` for unauthenticated screens (`login`, `register-clinic`); `app/(app)/` for the authenticated tab bar (Triaje / Mis tareas / Pacientes / Más).
- **Screen map:**
  - `(app)/triage/` — triage list
  - `(app)/tasks/` — care task list for the current user
  - `(app)/patients/` — patient list, `new.tsx`, `[id]/index` (detail), `[id]/triage`, `[id]/task-new`, `[id]/note-new`, `[id]/history`
  - `(app)/more/` — admin section: `users.tsx`, `audit.tsx`
- **Auth state:** Zustand store at `src/auth/store.ts`. Tokens stored in `expo-secure-store` (Keychain/Keystore). Axios instance at `src/api/client.ts` injects the access token and handles 401 → refresh → retry automatically. On refresh failure the store clears and the user is redirected to login.
- **Push registration:** `src/notifications/register.ts` requests permission and saves the Expo push token to the API on login; handles notification deep-link routing.
- **Server state:** React Query. Queries and mutations live co-located in screen files or `src/api/` hooks.
- **Forms:** react-hook-form + `zodResolver` using shared Zod schemas — same validation rules as the API.

## Key patterns

**Multi-tenant isolation:** `authRequired` middleware sets `req.user.clinicId`; every Prisma query in route handlers filters by it inline. Tests verify that clinic A gets 404 (not 403) for clinic B's resources to avoid enumeration.

**Append-only tables:** `TriageEntry` and `AuditLog` have no update/delete endpoints. Triage history is immutable; clinicians can only add new entries. `Patient`, `CareTask`, and `Note` use soft-delete (`deletedAt`). `User` is hard-deleted.

**Care task completion:** `POST /care-tasks/:id/complete` marks the task `done` and, if it has a recurrence, creates the next occurrence atomically in the same request. Response: `{ task, nextTask }`.

**Care task scheduler:** `src/scheduler/index.ts` ticks every minute. Finds pending tasks where `scheduledAt ≤ now` and `notifiedAt IS NULL`, sends Expo Push, then stamps `notifiedAt`. If the task has a recurrence, it creates the next occurrence in the same tick. Push payload contains only `{ patientName, taskType, taskId }` — no clinical data.

**Login security:** `/auth/login` is rate-limited (20 req / 15-min window). After 5 consecutive failures the account is locked for 15 minutes (`failedLogins` + `lockedUntil` on the `User` model).

**JWT rotation:** Access token 15 min, refresh token 7 days (hash stored in DB). Mobile calls `/auth/refresh` on 401; API validates hash, issues new tokens, revokes the old refresh token hash. `/auth/logout-all` revokes every active refresh token for the user.

**Shared Zod schemas flow:** `packages/shared` → imported by both `apps/api` (request body validation via `validateBody` middleware in `src/lib/validate.ts`) and `apps/mobile` (form validation via `zodResolver`). Changing a schema in shared affects both sides.

**Audit log:** Every mutating route calls `writeAudit(req, event)` from `src/middleware/audit.ts`. AuditLog is append-only; readable only by `admin` role via `GET /audit`.

## Database schema (Prisma)

`apps/api/prisma/schema.prisma` — core models and their relationships:

```
Clinic ──< User ──< RefreshToken
       ──< Patient ──< TriageEntry
                   ──< CareTask
                   ──< Note
       ──< AuditLog
```

`CareTask` fields of note: `assignedToId` (nullable), `scheduledAt`, `notifiedAt`, `status`, `recurrence`, `recurrenceN` (hours for `every_n_hours`), and completion fields (`completedById`, `completedAt`, `completionNotes`). The scheduler and the mobile task screen both depend on this shape.
