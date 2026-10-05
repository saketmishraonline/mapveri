# Multi-stage Dockerfile for MapVeri Full-Stack Application

# Stage 1: Workspace Dependency Installation & Building
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate

# Copy workspace dependency configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib/ ./lib/
COPY apps/ ./apps/
COPY tsconfig.base.json tsconfig.json ./

# Vite build environment arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build libraries and all apps (api-server, mapveri frontend)
RUN pnpm run build

# ==============================================================================
# Stage 2: Production API Server Runner
# ==============================================================================
FROM node:22-alpine AS api

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules and bundled output from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-server/dist ./apps/api-server/dist
COPY --from=builder /app/apps/api-server/package.json ./apps/api-server/
COPY --from=builder /app/package.json ./

EXPOSE 5000

CMD ["node", "apps/api-server/dist/index.mjs"]

# ==============================================================================
# Stage 3: Production Web Frontend (Nginx static server + API Reverse Proxy)
# ==============================================================================
FROM nginx:alpine AS web

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend assets from builder stage
COPY --from=builder /app/apps/mapveri/dist/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
