# VetConnect

Aplicación móvil que conecta clínicas veterinarias con sus funcionarios como vía oficial de traspaso de información clínica.

## Objetivo

Reemplazar canales informales (WhatsApp, papel, memoria) con una herramienta que centralice el estado de los pacientes y permita a los equipos coordinarse durante turnos y cambios de guardia.

## Funcionalidades principales

- **Sistema de triaje** — clasifica a cada paciente por prioridad de atención (rojo / amarillo / verde) según criterios clínicos. Cada paciente además registra un **motivo de consulta** (atropello, dolor de estómago, etc.).
- **Notificaciones de cuidados** — alertas configurables por paciente para recordar administración de medicación, alimentación, higiene y controles, con recurrencia (cada N horas o diaria).
- **Gestión de pacientes** — alta, ficha clínica, evolución, asignación de responsables y traspaso entre turnos.
- **Registro y trazabilidad** — `AuditLog` append-only para todas las mutaciones (quién, qué, cuándo) e historial inmutable de cuidados realizados por paciente.

## Stack

- **Mobile**: Expo (React Native) + Expo Router + React Query + Zustand + react-hook-form + Zod
- **API**: Node.js + Express + Prisma (PostgreSQL) + JWT (acceso + refresh) + helmet + rate-limit + node-cron
- **Push**: Expo Push Notifications via `expo-server-sdk`
- **Shared**: monorepo pnpm con `packages/shared` (schemas Zod compartidos entre mobile y API)

## Estructura

```
apps/
  api/         Express + Prisma + scheduler de notificaciones
  mobile/      Expo Router app
packages/
  shared/      Schemas Zod, tipos TS, constantes (TRIAGE_LEVELS, ROLES, ...)
```

## Setup local

Requisitos: Node 20+, pnpm 10+, Docker (para Postgres) y un dispositivo físico o simulador con Expo Go (las push reales requieren dispositivo físico).

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env
# Edita .env y define al menos:
#   JWT_ACCESS_SECRET y JWT_REFRESH_SECRET (≥16 chars, p. ej. `openssl rand -base64 48`)

# 3. Levantar PostgreSQL
docker compose up -d

# 4. Migrar y sembrar
pnpm db:migrate
pnpm db:seed
# Crea una clínica demo con usuarios:
#   admin@demo.vet / Password1234
#   vet@demo.vet   / Password1234
#   asistente@demo.vet / Password1234

# 5. Levantar API (puerto 3000) y mobile (Expo) en terminales separadas
pnpm dev:api
pnpm dev:mobile
```

Para apuntar la app móvil a una IP específica del API (necesario en dispositivo físico), define `EXPO_PUBLIC_API_URL` en `.env`, por ejemplo `http://192.168.1.10:3000`.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev:api` | API en modo watch |
| `pnpm dev:mobile` | Expo dev server |
| `pnpm db:migrate` | Aplicar migraciones Prisma |
| `pnpm db:seed` | Sembrar clínica demo |
| `pnpm typecheck` | TypeScript en todos los workspaces |
| `pnpm test` | Vitest (requiere `DATABASE_URL` activa para tests de API) |

## Smoke E2E

1. Registrar clínica desde la app móvil o usar la sembrada
2. Crear paciente con motivo de consulta ("atropello"); asignarle triaje rojo → aparece arriba en la cola de triaje, motivo visible en la tarjeta
3. Crear dos care tasks: `feeding` ("ración húmeda 100g", recurrencia cada 8h) y `medication` ("meloxicam 0.1mg/kg", `scheduledAt = now + 2min`), asignadas a otro usuario
4. El otro usuario en otro dispositivo recibe push a los ~2 min, abre la notificación y aterriza en la ficha del paciente
5. Marcar la tarea como completada con notas ("aceptó comida") → la fila queda con `completedAt`/`completedById`/`completionNotes`; si era recurrente, aparece la siguiente ocurrencia
6. Abrir **Historial de cuidados** del paciente y verificar que la entrada aparece con tipo, descripción, quién y cuándo; filtrar por `feeding` y `medication`
7. Confirmar en `Más → Auditoría` (rol admin) que se registran las acciones

## Seguridad

Datos clínicos sensibles → controles concretos:

- **Auth**: bcrypt cost 12, política mínima de contraseña, JWT acceso 15 min + refresh 7 días con rotación y revocación; rate-limit y bloqueo de cuenta tras 5 intentos fallidos
- **Tokens en mobile**: `expo-secure-store` (Keychain/Keystore), nunca AsyncStorage
- **Aislamiento multi-tenant**: middleware `clinicScope` filtra todas las queries; tests dedicados verifican que clínica A no vea recursos de B (responde 404 para no filtrar existencia)
- **Input**: Zod en cuerpo, query y params en cada endpoint; Prisma parametriza queries
- **Push payload**: solo `{ patientName, taskType, taskId }` — sin datos clínicos sensibles
- **AuditLog append-only**: sin endpoints de update/delete; soft-delete en `Patient`/`CareTask`/`Note`
- **Headers**: `helmet` + CORS allowlist; HTTPS y HSTS en producción
- **Logs**: redacción automática de `password`, `token`, `authorization`

## Roles

- `admin`: gestiona usuarios, ve auditoría
- `vet` / `assistant`: triaje, pacientes, tareas, notas

Toda la administración se hace desde la app móvil (no hay panel web).
