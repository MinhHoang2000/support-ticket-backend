# Multi-stage build for optimized image size

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (skip postinstall; prisma generate runs later via npm run build)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and lockfile
COPY package.json package-lock.json ./

# Install only production dependencies (skip postinstall; we copy generated Prisma client from builder)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy generated Prisma Client (from builder)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy Prisma schema, config, and migrations (for migrate deploy at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Copy entrypoint: wait for DB, run migrations, then start app
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Run migrations then start server (DB must be up first)
ENTRYPOINT ["./docker-entrypoint.sh"]
