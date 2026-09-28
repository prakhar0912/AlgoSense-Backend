# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json vite.config.ts ./
COPY build-scripts ./build-scripts
COPY src ./src

RUN npm run build
RUN npm run build-mcp-resources


FROM base AS production-dependencies

ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules

COPY --from=build --chown=node:node /app/dist ./dist

COPY --from=build --chown=node:node /app/dist-mcp-resources ./dist-mcp-resources

COPY --chown=node:node package.json package-lock.json ./

USER node

EXPOSE 3000 3001 3002

STOPSIGNAL SIGTERM

CMD ["node", "dist/server.js"]
