
# Stage 1: Builder
FROM node:20-bullseye as builder

# Install only essential build tools (removed TensorFlow native deps)
RUN apt-get update && apt-get install -y \
    python3 make g++ pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json tsconfig*.json ./

# Install dependencies with optimizations
RUN npm ci --include=dev --legacy-peer-deps

COPY . .
RUN npm run build

# Prune dev dependencies and clean npm cache
RUN npm prune --production && npm cache clean --force

# Stage 2: Runtime (optimized for faster startup)
FROM node:20-bullseye-slim

# Install only curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /usr/src/app

# Copy built application
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./

# Environment variables for production
ENV PORT=8080
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose port
EXPOSE $PORT

# Optimized health check with longer startup period
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Use existing node user (no need to create it)
RUN chown -R node:node /usr/src/app
USER node

# Optimized startup command
CMD ["node", "--max-old-space-size=512", "--optimize-for-size", "dist/main.js"]
