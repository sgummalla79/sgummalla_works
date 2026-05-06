# ── Stage 1: Build client ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ui/package.json ./packages/ui/
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile

COPY packages/ui ./packages/ui
COPY client ./client
COPY server ./server

RUN pnpm --filter @sgw/ui build
RUN pnpm --filter @sgw/client build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN npm install -g tsx pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ui/package.json ./packages/ui/
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN pnpm install --prod --no-frozen-lockfile

COPY server/src ./server/src
COPY server/tsconfig.json ./server/

COPY --from=builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["tsx", "server/src/index.ts"]
