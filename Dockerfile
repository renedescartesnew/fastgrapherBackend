
# Use Debian-based Node image for better compatibility
FROM node:18-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies with fixed time synchronization
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm install --include=dev && \
    npm cache clean --force

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Set the PORT environment variable explicitly
ENV PORT=8080
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

EXPOSE 8080

# Run as node user for security
USER node

# Start the application
CMD ["node", "dist/main.js"]
