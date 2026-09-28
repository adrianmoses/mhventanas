# Production image for Fly.io (B5). One image serves two roles:
#   - the app: the Nitro Node server built into .output/ (self-contained bundle)
#   - the release step: `npm run release` (migrate + ingest) via fly.toml's
#     release_command, which needs src/, content/, drizzle/ and prod node_modules.

FROM node:24-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# Build: full install (vite, react, etc. are devDependencies) and compile.
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Release-step dependencies only (tsx, dotenv, drizzle, postgres, mdx, ...).
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-slim
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY content ./content
COPY drizzle ./drizzle
COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000
ENV PORT=3000
CMD ["node", ".output/server/index.mjs"]
