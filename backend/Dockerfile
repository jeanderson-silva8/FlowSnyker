# ═══════════════════════════════════════════════════════════
# FlowSnyker Backend — Multi-stage Dockerfile
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifests primeiro (cache de dependências)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copiar código e compilar
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ── Stage 2: Production ──────────────────────────────────
FROM node:20-alpine AS production

# Segurança: não rodar como root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copiar apenas production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copiar JS compilado do stage anterior
COPY --from=builder /app/dist ./dist

# Ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Expose
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/live || exit 1

# Start
CMD ["node", "dist/server.js"]
