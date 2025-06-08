
# Stage 1: Builder
FROM node:20-bullseye as builder

# Install build tools
RUN apt-get update && apt-get install -y \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json tsconfig*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Runtime
FROM node:20-bullseye-slim

# Runtime deps
RUN apt-get update && apt-get install -y \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libjpeg62-turbo libgif7 librsvg2-2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json .

# Critical environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE $PORT

# Health check with startup delay
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Non-root user
RUN chown -R node:node .
USER node

CMD ["node", "--max-old-space-size=1536", "dist/main.js"]
