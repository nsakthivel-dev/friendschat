# FriendsChat API

Fastify + Prisma + Socket.IO backend for the real-time chat PWA.

## Run locally

```sh
cp .env.example .env
pnpm install
pnpm --filter @friendschat/api prisma:generate
pnpm --filter @friendschat/api prisma:migrate -- --name init
pnpm dev
```

The HTTP API defaults to `http://localhost:4000`; `GET /health` is unauthenticated.
Register/login returns a JWT. Send it as `Authorization: Bearer <token>` and as
`socket.io` auth `{ token }`. Socket events include `message:new`, `typing`,
`receipt:update`, and `reaction:update`; clients join rooms with
`conversation:join`.

Redis is optional in development and is used for expiring online presence keys.
Set `REDIS_URL` for production/multiple API instances. S3-compatible attachment
configuration is exposed through `S3_*`; the adapter is intentionally a small
provider seam so deployments can plug in their preferred SDK/bucket policy.

For production use a PostgreSQL datasource in `schema.prisma`, a strong
`JWT_SECRET`, HTTPS, restrictive `WEB_ORIGIN`, and an S3-compatible upload
implementation with signed URLs.
