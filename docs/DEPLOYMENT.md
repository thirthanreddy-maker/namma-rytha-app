# Namma Rytha production release

## Runtime requirements

- Node.js 20 or newer
- pnpm 10 or newer
- MySQL-compatible database
- Redis for OTP rate-limit coverage and production phone authentication
- Object storage credentials for uploaded avatars, crop images, community media, and audio
- OAuth configuration for browser sign-in
- Provider credentials for phone OTP, notifications, and any enabled external data APIs

## Environment variables

Configure these at runtime; do not commit `.env` or production secrets:

- `DATABASE_URL`
- `REDIS_URL`
- `OAUTH_SERVER_URL`
- `VITE_APP_ID` / `APP_ID` as required by the project environment
- `COOKIE_SECRET`
- Storage configuration used by `server/storage.ts`
- Phone OTP and notification provider variables used by `server/phoneOtp.ts` and `server/notifications.ts`
- Optional integrations such as `IOT_MOISTURE_API_URL` and market-data provider credentials

Use the project environment's canonical variable names if they are already provisioned. The server reads configuration at runtime, so private credentials are not needed during the frontend build.

## Reproducible build

From the project root:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
```

`pnpm run build` creates the production frontend in `dist/public` and bundles the server as `dist/index.js`.

## Database migration

Apply migrations only against the intended release database:

```bash
pnpm run db:push
```

Review the generated migration files and database target before running this command in production. The project uses Drizzle with MySQL.

## Start production

```bash
NODE_ENV=production PORT=3000 pnpm start
```

The server listens on `PORT` (default `3000`) and serves both the API and `dist/public`.

For a process manager, use the bundled server directly after the build:

```bash
NODE_ENV=production PORT=3000 node dist/index.js
```

Put TLS termination, the public hostname, and any required reverse proxy in front of the Node process. Forward `/api/*` and `/manus-storage/*` to the same server and preserve `X-Forwarded-Proto` so secure-cookie and HSTS behavior remains correct.

## Release smoke test

After startup, verify the public landing page and protected-route redirect:

```bash
curl -fsS http://127.0.0.1:3000/ >/dev/null
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/app
```

Then sign in through the configured OAuth or phone OTP flow and verify:

- `/api/trpc/auth.me`
- Dashboard navigation across Overview, Field Lab, Irrigation, Community, Announcements, and Profile
- File upload flows and object-storage reads
- IoT ingestion with `x-iot-device-token`
- Scheduled irrigation callback authentication
- Redis-backed OTP rate limiting

## Production checklist

1. Run the frozen-lockfile install, type-check, tests, and build in CI.
2. Configure all runtime secrets in the deployment platform.
3. Run the database migration against the release database.
4. Start the new server and verify its health/landing response.
5. Complete an authenticated smoke test before routing public traffic.
6. Keep the previous server available during rollout so existing requests can drain safely.

## Production build script

For a complete release build on a CI runner or deployment host:

```bash
pnpm run build:production
```

This installs the frozen dependency graph, runs the TypeScript check and test suite, builds the frontend/server bundle, and verifies `dist/public/index.html` plus `dist/index.js`.

## Containerized deployment

Build the production image from the project root:

```bash
docker build --tag namma-rytha:latest .
```

Run it with runtime configuration supplied by the deployment platform or an environment file kept outside the image:

```bash
docker run --rm \
  --name namma-rytha \
  --env-file .env.production \
  -e PORT=3000 \
  -p 3000:3000 \
  namma-rytha:latest
```

The image uses Node 20, runs as the non-root `node` user, exposes port `3000`, and includes a Docker health check against `/`. Secrets are intentionally read at runtime and are not copied into the image.

For a registry release:

```bash
docker build --pull --tag "$REGISTRY/namma-rytha:$VERSION" .
docker push "$REGISTRY/namma-rytha:$VERSION"
```

Deploy the pushed image with the same runtime variables listed above. Run `pnpm run db:push` as a controlled release step against the target database before routing traffic to a new container.

## GitHub Actions CI/CD

The workflow at `.github/workflows/ci.yml` runs on pull requests and pushes to `main` or `master`. It:

1. Installs Node 20 and pnpm 10.18.0.
2. Installs the frozen dependency graph.
3. Runs the TypeScript check, test suite, and production build.
4. Verifies the frontend and server artifacts.
5. Builds the Docker image with Buildx and GitHub Actions layer caching.

Pushing a semantic version tag such as `v1.0.0` also logs in to GitHub Container Registry and publishes:

```text
ghcr.io/<owner>/<repository>:sha-<commit>
ghcr.io/<owner>/<repository>:latest
```

The normal branch and pull-request workflows build the image but do not push it. The publish job uses the automatic `GITHUB_TOKEN`; no long-lived registry token is stored in the repository.

## Permanent public URL

A GitHub Actions image publish creates a container artifact, not a public web URL. A permanent URL requires deploying that image to a hosting provider, or publishing the project through a connected managed WebDev project. Configure the provider's domain/hostname and runtime secrets separately from this repository workflow. Do not treat the temporary sandbox forwarding URL as a production address.
