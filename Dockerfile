# Stage 1: Builder - explicitly set to x86 platform
FROM --platform=linux/amd64 node:20-bullseye AS builder

# Install only essential build tools
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean
    
WORKDIR /usr/src/app
COPY package*.json tsconfig*.json ./

# Install dependencies
RUN npm ci --include=dev --legacy-peer-deps

COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production && npm cache clean --force

# Stage 2: Runtime - explicitly set to x86 platform
FROM --platform=linux/amd64 node:20-bullseye-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /usr/src/app

# Copy built application
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/package.json ./

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Use existing node user
USER node

# Use exec form for better signal handling
ENTRYPOINT ["node"]
CMD ["dist/main.js"]