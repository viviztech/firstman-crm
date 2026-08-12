# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Coolify can inject NODE_ENV=production at build time. Explicitly retain build
# tooling (Next.js, TypeScript, Husky) in this stage regardless of that value.
RUN npm ci --include=dev

# Full (untraced) production node_modules — Next's standalone output only bundles
# what its own import graph reaches, which misses src/db/migrate.ts (a CLI entry
# point Next never sees). This stage covers that script's dependencies instead.
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# Husky is a devDependency, so its prepare hook is unavailable in this
# production-only stage. Package lifecycle scripts are not needed at runtime.
RUN npm ci --omit=dev --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrate.ts ./src/db/migrate.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/env.ts ./src/lib/env.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000

# Coolify's health check hits /api/health; migrations run once before the server starts.
CMD ["sh", "-c", "node_modules/.bin/tsx src/db/migrate.ts && node server.js"]
