FROM node:20-alpine
WORKDIR /app

# Dependency layer — cached until package files change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Source layer — changes often, so it comes last
COPY . .

# AWS RDS CA bundle, so prod can verify the database certificate
# (DATABASE_SSL=true, DATABASE_SSL_CA=/etc/ssl/rds-global-bundle.pem)
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/rds-global-bundle.pem
RUN chmod 644 /etc/ssl/rds-global-bundle.pem

ENV NODE_ENV=production
EXPOSE 4000

# Lab 1: container-level health, used by compose and by any orchestrator
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O- "http://localhost:${PORT:-4000}/api/health" || exit 1

# Lab 3: migrations run on every start (idempotent), then the seed password is
# replaced if DEMO_USER_PASSWORD is set, then the server takes PID 1
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/rotateDemoPasswords.js && exec node src/server.js"]
