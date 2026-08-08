FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/tmp/cryptolyst-build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run db:init && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 10001 -S nodejs && adduser -S cryptolyst -u 10001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules
RUN chmod +x /app/scripts/docker-entrypoint.sh \
    && mkdir -p /data \
    && chown -R cryptolyst:nodejs /data /app
USER cryptolyst
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["/app/scripts/docker-entrypoint.sh"]
