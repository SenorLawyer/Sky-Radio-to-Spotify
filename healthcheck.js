console.log("Health check running...");

const requiredEnvVars = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "SPOTIFY_PLAYLIST_ID",
  "PUPPETEER_EXECUTABLE_PATH",
];

let allVarsPresent = true;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing environment variable: ${envVar}`);
    allVarsPresent = false;
  }
}

const fs = require("fs");
const path = require("path");
const tokenPath = path.join(process.cwd(), "spotify_tokens.json");

if (!fs.existsSync(tokenPath)) {
  console.error("spotify_tokens.json file not found. Authentication may be required.");
  process.exit(1);
}

if (!allVarsPresent) {
  process.exit(1);
}

console.log("Health check passed!");
process.exit(0);
