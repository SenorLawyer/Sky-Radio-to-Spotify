#!/bin/bash

# SkyRadio to Spotify Setup Script
echo "🎵 === SkyRadio to Spotify Setup === 🎵"
echo "This script will help you set up the application for first-time use."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from template..."
  cp .env.example .env
  echo "⚠️  Please edit the .env file with your Spotify credentials before continuing."
  exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker and Docker Compose first."
  exit 1
fi

# Uncomment ports in docker-compose.yml if they are commented
if grep -q "#\s*-\s*\"8888:8888\"" docker-compose.yml; then
  echo "🔌 Uncommenting ports in docker-compose.yml..."
  sed -i 's/#\s*-\s*"8888:8888"/  - "8888:8888"/g' docker-compose.yml 2>/dev/null || sed -i '' 's/#\s*-\s*"8888:8888"/  - "8888:8888"/g' docker-compose.yml
fi

echo "🏗️  Building the Docker container (this may take a minute)..."
docker compose build --no-cache

echo "🚀 Starting the application for authentication..."
echo "🌐 A browser window should open for Spotify authentication."
echo "✅ After authentication, the application will continue running."
echo ""
echo "⚠️  Press Ctrl+C to stop the application after authentication is complete."
echo "🔄 Then run 'docker-compose up -d' to start it in the background."
echo ""
echo "▶️  Starting Docker container..."
docker compose up -d
