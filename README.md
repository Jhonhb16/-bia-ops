# BIA OPS

BIA OPS es una plataforma operativa para la gestion de clientes, campanas, alertas, reportes y seguimiento financiero.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Supabase CLI para trabajar con la base local y aplicar migraciones
- Un VPS con Git, Node.js y PM2 para produccion

## Setup local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno:

```powershell
Copy-Item .env.example .env
```

3. Configura las variables requeridas en `.env`.

4. Arranca la base local de Supabase desde el paquete de base de datos:

```bash
npm run db:start -w @bia-ops/database
```

5. Levanta la aplicacion:

```bash
npm run dev
```

## Variables de entorno

Variables compartidas:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Integraciones:

- `META_APP_ID`
- `META_APP_SECRET`
- `CLAUDE_API_KEY`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_EXPERT_CHAT_ID`
- `RESEND_API_KEY`
- `HOTMART_WEBHOOK_SECRET`
- `ONBOARDING_WEBHOOK_SECRET`
- `INTERNAL_API_SECRET`
- `MAKE_WEBHOOK_SECRET`
- `MAKE_WEBHOOK_URL`

Runtime:

- `API_PORT`
- `ENABLE_CRON` o `ENABLE_CRON_JOBS`

Seguridad de endpoints:

- Si `HOTMART_WEBHOOK_SECRET` existe, `/webhooks/hotmart` exige `x-webhook-secret`, `x-hotmart-webhook-secret` o `Authorization: Bearer <secret>`.
- Si `ONBOARDING_WEBHOOK_SECRET` existe, `/webhooks/onboarding` exige `x-webhook-secret`, `x-onboarding-webhook-secret` o `Authorization: Bearer <secret>`.
- Si `INTERNAL_API_SECRET` existe, `/meta`, `/alerts` y `/reports` exigen `x-api-secret`, `x-internal-secret` o `Authorization: Bearer <secret>`.
- Si `MAKE_WEBHOOK_SECRET` existe, `/webhooks/make` exige `x-make-secret`.
- Sin esos secretos configurados, el modo local demo queda abierto para facilitar pruebas.

## Scripts

Raiz del repo:

- `npm run dev`
- `npm run dev:web`
- `npm run dev:api`
- `npm run build`
- `npm run start`
- `npm test`
- `npm run lint`
- `npm run typecheck`

Base de datos:

- `npm run db:start -w @bia-ops/database`
- `npm run db:stop -w @bia-ops/database`
- `npm run db:reset -w @bia-ops/database`
- `npm run db:push -w @bia-ops/database`
- `npm run db:status -w @bia-ops/database`
- `npm run db:new -w @bia-ops/database`

## Supabase

La migracion principal vive en:

`packages/database/supabase/migrations/20260420000100_init.sql`

La base incluye enums, tablas, indices, RLS, policies, triggers de `updated_at` y funciones para tokens de acceso de cliente.

Para aplicar cambios en un proyecto remoto de Supabase, primero ejecuta `supabase link` dentro de `packages/database` y luego corre `npm run db:push -w @bia-ops/database`.

## Deploy a VPS

### Preparacion del servidor

1. Instala Node.js 20, Git, PM2 y Nginx.
2. Clona este repositorio en el directorio que usaras como `APP_DIR`.
3. Configura las variables de entorno en el servidor.
4. Asegura que Nginx apunte a los puertos que usa tu app web y tu API.

### PM2

Ejemplo de arranque:

```bash
pm2 start npm --name bia-ops -- run start
pm2 save
```

Si el proceso ya existe, el flujo de deploy lo reinicia con `pm2 restart bia-ops --update-env`.

### Nginx

Configura Nginx como reverse proxy hacia la app. Una estructura tipica es:

- web -> `127.0.0.1:3000`
- api -> `127.0.0.1:4000`

### GitHub Actions

El workflow `.github/workflows/deploy.yml` usa estos secrets:

- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SSH_PORT`
- `APP_DIR`

En cada push a `main`, el workflow entra por SSH al VPS, actualiza el repo, instala dependencias, ejecuta el build y reinicia PM2.
