#  FROM node:18-alpine AS builder
#  WORKDIR /app
#  COPY package*.json ./
#  RUN npm install
#  COPY . .
#  RUN npm run build

#  FROM node:18-alpine AS runner
#  WORKDIR /app
#  COPY --from=builder /app/dist ./dist
#  COPY package*.json ./
#  RUN npm ci --only=production
#  EXPOSE 3000
#  CMD ["node", "dist/main.js"]








# # Stage 1: Build Stage
# FROM node:18-alpine AS builder
# WORKDIR /app

# # Install dependencies and build the app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Stage 2: Runner Stage
# FROM node:18-alpine AS runner
# WORKDIR /app

# # Copy the built code and only necessary files
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/package.json ./
# COPY --from=builder /app/node_modules ./node_modules

# # Ensure the app uses Cloud Run's PORT variable
# ENV NODE_ENV=production
# ENV PORT=8080

# # Expose port 8080
# EXPOSE 8080

# # Start the application
# CMD ["node", "dist/main"]



# Base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./


# Install dependencies
RUN npm install

# Build argument for MongoDB URL
ARG MONGODB_URL

# Pass MongoDB URL as an environment variable
ENV MONGODB_URL=${MONGODB_URL}

# Copy app source
COPY . .

# Build the app (optional for compiled apps)
RUN npm run build

# Expose port 8080
EXPOSE 8080

# Start the app
CMD ["node", "dist/main.js"]
