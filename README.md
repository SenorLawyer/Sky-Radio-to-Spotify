# SkyRadio to Spotify

This application monitors Sky Radio's currently playing song and automatically adds it to a specified Spotify playlist.

## Features

- Scrapes Sky Radio's website to get the currently playing song
- Searches for the song on Spotify
- Adds the song to a specified Spotify playlist if it's not already there
- Runs continuously, checking for new songs at regular intervals
- Uses a fallback method if the primary scraping method fails

## Prerequisites

- [Node.js](https://nodejs.org/en)
- [Bun.sh](https://bun.sh/)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Spotify Developer Account](https://developer.spotify.com/dashboard)
- Spotify API credentials (Client ID, Client Secret)
- A Spotify playlist to add songs to

## Setup

1. Clone this repository:

   ```
   git clone git@github.com:SenorLawyer/Sky-Radio-to-Spotify.git
   cd Sky-Radio-to-Spotify
   ```

2. Create a `.env` file based on the `.env.example` template:

   ```
   cp .env.example .env
   ```

3. Edit the `.env` file with your Spotify API credentials and playlist ID:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
   SPOTIFY_PLAYLIST_ID=your_spotify_playlist_id
   ```

## Running with Docker

### First Run (Authentication Required)

For the first run, you need to authenticate with Spotify:

1. Run the setup script:

   **Linux/Mac:**

   ```
   ./setup.sh
   ```

   **Windows:**

   ```
   ./setup.bat
   ```

   Or manually:

   1. Uncomment the ports section in `docker-compose.yml`:
      ```yaml
      ports:
        - "8888:8888" # Uncomment this for the first run to allow authentication
      ```
   2. Build and start the container:
      ```
      docker-compose build --no-cache
      docker-compose up
      ```

2. The application will open a browser window for Spotify authentication. Log in and authorize the application.

3. After successful authentication, the tokens will be saved to `spotify_tokens.json`.

### Subsequent Runs

After the initial authentication:

1. Comment out the ports section in `docker-compose.yml` if you want
2. Build and start the container in detached mode:
   ```
   docker-compose build
   docker-compose up -d
   ```

The application will now run continuously in the background, checking for new songs on Sky Radio and adding them to your Spotify playlist.

## Checking Status

To check the status of the application:

**Linux/Mac:**

```
./check-status.sh
```

**Windows:**

```
./check-status.bat
```

## Stopping the Application

To stop the application:

```
docker-compose down
```

## Logs

To view the logs:

```
docker-compose logs -f
```

## Troubleshooting

### Puppeteer Issues

If you encounter issues with Puppeteer (browser crashes, connection errors), the application will automatically fall back to using a simpler method to scrape the website. You can check the logs to see if this is happening:

```
docker logs skyradio-spotify | grep "fallback method"
```

### Memory Issues

If the container is crashing due to memory issues, you can increase the memory limit in the `docker-compose.yml` file:

```yaml
deploy:
  resources:
    limits:
      memory: 2G # Increase this value
    reservations:
      memory: 512M
```

### Authentication Issues

If you're having trouble with Spotify authentication:

1. Make sure your Spotify API credentials are correct
2. Check that the redirect URI in your Spotify Developer Dashboard matches the one in your `.env` file
3. Try running the setup script again to re-authenticate

## License

MIT
