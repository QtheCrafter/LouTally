# Build stage - Pin Node.js to version 24 (includes npm 11)
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
# Copy package-lock.json if it exists (for reproducible builds)
COPY package-lock.json* ./

# Install dependencies - use npm ci if lock file exists, otherwise npm install
RUN if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund; \
    else \
        npm install --no-audit --no-fund; \
    fi && \
    npm cache clean --force

# Copy source code
COPY . .

# Set environment variable for production build (use relative paths via nginx proxy)
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Production stage - Pin nginx to stable version
FROM nginx:1.25-alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

