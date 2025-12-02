#!/bin/bash
# Build script that auto-detects architecture and builds accordingly

# Detect architecture
ARCH=$(uname -m)

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    echo "Detected ARM64 architecture"
    echo "Building with TARGETARCH=arm64..."
    TARGETARCH=arm64 docker-compose build
    docker-compose up -d
elif [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "amd64" ]; then
    echo "Detected AMD64 architecture"
    echo "Building with TARGETARCH=amd64..."
    TARGETARCH=amd64 docker-compose build
    docker-compose up -d
else
    echo "Unknown architecture: $ARCH"
    echo "Attempting default build..."
    docker-compose up -d --build
fi

