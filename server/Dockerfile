FROM node:20-alpine
WORKDIR /app

# Dependency layer — cached until package files change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Source layer — changes often, so it comes last
COPY . .

ENV NODE_ENV=production
EXPOSE 4000

# Lab 1: container-level health, used by compose and by any orchestrator
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O- http://localhost:4000/api/health || exit 1

# Lab 3: migrations run on every start (idempotent), then the server takes PID 1
CMD ["sh", "-c", "node src/db/migrate.js && exec node src/server.js"]
