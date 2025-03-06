#!/bin/bash

# SkyRadio to Spotify Status Checker
echo "🎵 === SkyRadio to Spotify Status === 🎵"

# Check if container is running
echo "🔍 Checking if container is running..."
if docker ps | grep -q "skyradio-spotify"; then
  echo "✅ Container is running!"
else
  echo "❌ Container is NOT running!"
  echo "   To start it, run: docker-compose up -d"
  exit 1
fi

# Get recent logs
echo ""
echo "📋 Recent activity (last 20 log lines):"
echo "----------------------------------------"
docker logs skyradio-spotify --tail 20
echo "----------------------------------------"

# Check for errors in logs
echo ""
echo "🔍 Checking for errors in logs..."
ERROR_COUNT=$(docker logs skyradio-spotify --tail 100 2>&1 | grep -i "error\|exception\|fail" | wc -l)

if [ $ERROR_COUNT -gt 0 ]; then
  echo "⚠️  Found $ERROR_COUNT errors in the last 100 log lines!"
  echo "   Here are the last 10 errors:"
  echo "----------------------------------------"
  docker logs skyradio-spotify --tail 100 2>&1 | grep -i "error\|exception\|fail" | tail -10
  echo "----------------------------------------"
else
  echo "✅ No errors found in recent logs!"
fi

# Check health status
echo ""
echo "💓 Checking container health..."
HEALTH_STATUS=$(docker inspect skyradio-spotify | grep "\"Status\": \"healthy\"" | wc -l)

if [ $HEALTH_STATUS -gt 0 ]; then
  echo "✅ Health check is passing!"
else
  echo "⚠️  Health check is NOT passing!"
  echo "   Check the logs for more details."
fi

# Check if fallback method is being used
echo ""
echo "🔄 Checking if fallback method is being used..."
FALLBACK_COUNT=$(docker logs skyradio-spotify 2>&1 | grep -i "fallback method" | wc -l)

if [ $FALLBACK_COUNT -gt 0 ]; then
  echo "ℹ️  Fallback method has been used $FALLBACK_COUNT times."
  echo "   This is normal if Puppeteer has had issues."
else
  echo "✅ Primary scraping method is working correctly."
fi

echo ""
echo "📊 Status Summary:"
echo "----------------------------------------"
echo "✅ Container running: $(docker ps | grep -q "skyradio-spotify" && echo "Yes" || echo "No")"
echo "✅ Health check: $([ $HEALTH_STATUS -gt 0 ] && echo "Passing" || echo "Not passing")"
echo "✅ Recent errors: $ERROR_COUNT"
echo "✅ Using fallback: $([ $FALLBACK_COUNT -gt 0 ] && echo "Yes ($FALLBACK_COUNT times)" || echo "No")"
echo "----------------------------------------"

echo ""
echo "🔍 For full logs, run: docker logs skyradio-spotify"
echo "🔄 To restart, run: docker-compose restart"
echo "🛑 To stop, run: docker-compose down"
