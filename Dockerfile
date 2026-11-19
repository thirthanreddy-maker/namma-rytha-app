# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS dependencies
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=1

FROM dependencies AS build
WORKDIR /app
COPY . .

RUN pnpm run check \
  && pnpm test \
  && pnpm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# The application reads DATABASE_URL, OAuth, storage, Redis, and provider
# credentials at runtime. Do not bake .env files or secrets into this image.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',res=>process.exit(res.statusCode>=200&&res.statusCode<400?0:1)).on('error',()=>process.exit(1))"

USER node
CMD ["node", "dist/index.js"]
