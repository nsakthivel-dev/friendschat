# FriendsChat

FriendsChat is a pnpm monorepo for a responsive real-time chat PWA. It includes a React/Vite/Tailwind client and a Fastify/Socket.IO API backed by PostgreSQL through Prisma.

## Quick start

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @friendschat/api prisma:generate
pnpm --filter @friendschat/api prisma:migrate -- --name init
pnpm dev
```

The API runs on `http://localhost:4000` and the web app on `http://localhost:5173`. Copy `apps/web/.env.example` to `apps/web/.env` when the API is not running at the default URL. PostgreSQL is required for persisted accounts and messages; when the API is unavailable, the web client intentionally falls back to a clearly labelled in-memory demo experience so local UI work remains possible without weakening production authentication.

## Included

- Email/password registration and login with bcrypt password hashes and signed JWTs.
- 1:1 and group conversation models, cursor-based message history, persisted messages, delivery/read receipts, and emoji reactions.
- Socket.IO conversation rooms, real-time messages, typing notifications, and Redis-backed presence with a safe no-Redis development adapter.
- S3-compatible attachment seam, restrictive CORS configuration, Zod request validation, and environment-driven secrets.
- Installable PWA manifest/service worker, responsive laptop/mobile layout, conversation search, and keyboard message composer.
- Test/build scripts for the API and production build for the web app.

## Production hardening

Use managed PostgreSQL and Redis, a random `JWT_SECRET` of at least 32 characters, HTTPS, a specific `WEB_ORIGIN`, and an S3-compatible provider with signed upload URLs. The current UI keeps message bodies readable to the API; end-to-end encryption is deliberately isolated as the next protocol layer (libsodium key exchange, device verification, rotation, and encrypted attachment metadata) rather than presenting transport encryption as E2EE.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run API and web dev servers |
| `pnpm build` | Build every workspace |
| `pnpm test` | Run backend tests |
| `pnpm db:generate` | Generate Prisma client |
