#!/bin/bash

# Railway build script for LibreChat
echo "Starting Railway build for LibreChat..."

# Install dependencies first
echo "Installing dependencies..."
npm install

# Build workspace packages
echo "Building workspace packages..."
npm run build:data-provider
npm run build:data-schemas
npm run build:api

# Build frontend (this will also build the workspace packages again, but that's okay)
echo "Building frontend..."
npm run frontend

echo "Build completed successfully!" 