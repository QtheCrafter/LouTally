# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files (includes package.json and package-lock.json)
COPY package*.json ./

# Install dependencies using npm ci for reproducible builds
RUN npm ci

# Copy source code
COPY . .

# Set environment variable for production build (use relative paths via nginx proxy)
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

