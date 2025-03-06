@echo off
echo 🎵 === SkyRadio to Spotify Status === 🎵

REM Check if container is running
echo 🔍 Checking if container is running...
docker ps | findstr "skyradio-spotify" >nul
if %ERRORLEVEL% equ 0 (
  echo ✅ Container is running!
) else (
  echo ❌ Container is NOT running!
  echo    To start it, run: docker-compose up -d
  exit /b 1
)

REM Get recent logs
echo.
echo 📋 Recent activity (last 20 log lines):
echo ----------------------------------------
docker logs skyradio-spotify --tail 20
echo ----------------------------------------

REM Check for errors in logs
echo.
echo 🔍 Checking for errors in logs...
for /f %%i in ('docker logs skyradio-spotify --tail 100 2^>^&1 ^| findstr /i "error exception fail" ^| find /c /v ""') do set ERROR_COUNT=%%i

if %ERROR_COUNT% gtr 0 (
  echo ⚠️  Found %ERROR_COUNT% errors in the last 100 log lines!
  echo    Here are the last 10 errors:
  echo ----------------------------------------
  docker logs skyradio-spotify --tail 100 2>&1 | findstr /i "error exception fail" | powershell -Command "$input | select -Last 10"
  echo ----------------------------------------
) else (
  echo ✅ No errors found in recent logs!
)

REM Check health status
echo.
echo 💓 Checking container health...
docker inspect skyradio-spotify | findstr """Status"": ""healthy""" >nul
if %ERRORLEVEL% equ 0 (
  echo ✅ Health check is passing!
  set HEALTH_STATUS=Passing
) else (
  echo ⚠️  Health check is NOT passing!
  echo    Check the logs for more details.
  set HEALTH_STATUS=Not passing
)

REM Check if fallback method is being used
echo.
echo 🔄 Checking if fallback method is being used...
for /f %%i in ('docker logs skyradio-spotify 2^>^&1 ^| findstr /i "fallback method" ^| find /c /v ""') do set FALLBACK_COUNT=%%i

if %FALLBACK_COUNT% gtr 0 (
  echo ℹ️  Fallback method has been used %FALLBACK_COUNT% times.
  echo    This is normal if Puppeteer has had issues.
  set FALLBACK_STATUS=Yes (%FALLBACK_COUNT% times)
) else (
  echo ✅ Primary scraping method is working correctly.
  set FALLBACK_STATUS=No
)

REM Check if container is running for summary
docker ps | findstr "skyradio-spotify" >nul
if %ERRORLEVEL% equ 0 (
  set CONTAINER_STATUS=Yes
) else (
  set CONTAINER_STATUS=No
)

echo.
echo 📊 Status Summary:
echo ----------------------------------------
echo ✅ Container running: %CONTAINER_STATUS%
echo ✅ Health check: %HEALTH_STATUS%
echo ✅ Recent errors: %ERROR_COUNT%
echo ✅ Using fallback: %FALLBACK_STATUS%
echo ----------------------------------------

echo.
echo 🔍 For full logs, run: docker logs skyradio-spotify
echo 🔄 To restart, run: docker-compose restart
echo 🛑 To stop, run: docker-compose down
