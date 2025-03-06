FROM oven/bun:latest

WORKDIR /usr/src/app

RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN apt-get install xdg-utils

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome \
    CHROME_BIN=/usr/bin/google-chrome \
    CHROME_PATH=/usr/bin/google-chrome

COPY package*.json ./
RUN bun install

COPY . .
RUN bun run build
RUN touch spotify_tokens.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD bun run healthcheck.js

CMD ["bun", "run", "start"]
