# Pin Node.js to version 24 (slim variant for smaller image, includes npm 11)
FROM node:24-slim

# Detect architecture and install appropriate browser
ARG TARGETARCH
ARG TARGETPLATFORM

# Install Puppeteer dependencies and browser in a single layer
# Auto-detect architecture if TARGETARCH is not provided
RUN ARCH=$(dpkg --print-architecture) && \
    # Use TARGETARCH if set, otherwise detect from dpkg
    if [ -n "$TARGETARCH" ]; then \
        DETECTED_ARCH="$TARGETARCH"; \
    else \
        DETECTED_ARCH="$ARCH"; \
    fi && \
    apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && \
    # Install browser based on architecture
    if [ "$DETECTED_ARCH" = "amd64" ] || [ "$DETECTED_ARCH" = "x86_64" ]; then \
        echo "Installing Chrome for amd64/x86_64 architecture" && \
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
        apt-get update && \
        apt-get install -y --no-install-recommends google-chrome-stable && \
        rm -rf /var/lib/apt/lists/* && \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable' > /etc/profile.d/puppeteer.sh; \
    elif [ "$DETECTED_ARCH" = "arm64" ] || [ "$DETECTED_ARCH" = "aarch64" ]; then \
        echo "Installing Chromium for arm64/aarch64 architecture" && \
        apt-get update && \
        apt-get install -y --no-install-recommends chromium chromium-sandbox && \
        rm -rf /var/lib/apt/lists/* && \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium' > /etc/profile.d/puppeteer.sh; \
    else \
        echo "Unsupported architecture: DETECTED_ARCH=$DETECTED_ARCH, ARCH=$ARCH, TARGETARCH=$TARGETARCH" && exit 1; \
    fi

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
# Copy package-lock.json if it exists (for reproducible builds)
COPY package-lock.json* ./

# Install dependencies - try npm ci first, fall back to npm install if lock file is out of sync
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund; \
    else \
        npm install --omit=dev --no-audit --no-fund; \
    fi && \
    npm cache clean --force

# Copy application code
COPY src/ ./src/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production

# Set default executable path (will be overridden by runtime detection in scraper.js)
# Default to chromium for ARM64 compatibility, Chrome for AMD64
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start the application
CMD ["node", "src/server.js"]
