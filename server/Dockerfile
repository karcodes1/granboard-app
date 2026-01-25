# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests and root lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

# Install dependencies for the server workspace (includes dev deps for build)
RUN npm ci --workspace server

# Copy server source after dependencies for better caching
COPY server ./server

# Build the server workspace (outputs to server/dist)
RUN npm run build:server

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy manifests and install only server production dependencies
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev --workspace server

# Copy built artifacts from builder
COPY --from=builder /app/server/dist ./server/dist

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/server

EXPOSE 8080

# Run the server
CMD ["node", "dist/index.js"]
