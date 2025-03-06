@echo off
echo 🎵 === SkyRadio to Spotify Setup === 🎵
echo This script will help you set up the application for first-time use.

REM Check if .env file exists
if not exist .env (
  echo 📝 Creating .env file from template...
  copy .env.example .env
  echo ⚠️  Please edit the .env file with your Spotify credentials before continuing.
  exit /b 1
)

REM Check if docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ❌ Docker is not installed. Please install Docker and Docker Compose first.
  exit /b 1
)

REM Uncomment ports in docker-compose.yml if they are commented
findstr /C:"#  - \"8888:8888\"" docker-compose.yml >nul
if %ERRORLEVEL% equ 0 (
  echo 🔌 Uncommenting ports in docker-compose.yml...
  powershell -Command "(Get-Content docker-compose.yml) -replace '#\s*-\s*""8888:8888""', '  - ""8888:8888""' | Set-Content docker-compose.yml"
)

echo 🏗️  Building the Docker container (this may take a minute)...
docker compose build --no-cache

echo 🚀 Starting the application for authentication...
echo 🌐 A browser window should open for Spotify authentication.
echo ✅ After authentication, the application will continue running.
echo.
echo ⚠️  Press Ctrl+C to stop the application after authentication is complete.
echo 🔄 Then run 'docker-compose up -d' to start it in the background.
echo.
echo ▶️  Starting Docker container...
docker compose up -d
