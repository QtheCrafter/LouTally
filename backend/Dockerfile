# Pin Node.js to LTS version 18.20.4 (slim variant for smaller image)
FROM node:18.20.4-slim

# Detect architecture and install appropriate browser
ARG TARGETARCH=amd64
ARG TARGETPLATFORM

# Install Puppeteer dependencies and browser in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    if [ "$TARGETARCH" = "amd64" ]; then \
        # Modern way to add Google Chrome repository (deprecated apt-key replaced)
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
        apt-get update && \
        apt-get install -y --no-install-recommends google-chrome-stable && \
        rm -rf /var/lib/apt/lists/* && \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable' > /etc/profile.d/puppeteer.sh; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        apt-get update && \
        apt-get install -y --no-install-recommends chromium chromium-sandbox && \
        rm -rf /var/lib/apt/lists/* && \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium' > /etc/profile.d/puppeteer.sh; \
    else \
        echo "Unsupported architecture: $TARGETARCH" && exit 1; \
    fi

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies using npm ci for reproducible builds
RUN npm ci --omit=dev --no-audit --no-fund && \
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
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Start the application
CMD ["node", "src/server.js"]
