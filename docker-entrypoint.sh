#!/bin/sh

if [ ! -f /usr/src/app/spotify_tokens.json ]; then
  touch /usr/src/app/spotify_tokens.json
fi

chown pptruser:pptruser /usr/src/app/spotify_tokens.json
chmod 666 /usr/src/app/spotify_tokens.json

exec bun run start
