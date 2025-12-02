FROM node:18-slim

# Detect architecture and install appropriate browser
ARG TARGETARCH
ARG TARGETPLATFORM

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    wget \
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
    && rm -rf /var/lib/apt/lists/*

# Install browser based on architecture
# For AMD64/x86_64: Install Google Chrome
# For ARM64/aarch64: Install Chromium (Chrome not available for ARM)
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
        sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
        apt-get update && \
        apt-get install -y google-chrome-stable && \
        rm -rf /var/lib/apt/lists/*; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        apt-get update && \
        apt-get install -y chromium chromium-sandbox && \
        rm -rf /var/lib/apt/lists/*; \
    else \
        echo "Unsupported architecture: $TARGETARCH" && exit 1; \
    fi

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set executable path based on architecture
# For ARM64, use Chromium; for AMD64, use Chrome
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium' >> /etc/profile.d/puppeteer.sh; \
    else \
        echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable' >> /etc/profile.d/puppeteer.sh; \
    fi

# Set default (will be overridden by runtime detection in scraper.js)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Start the application
CMD ["node", "src/server.js"]

