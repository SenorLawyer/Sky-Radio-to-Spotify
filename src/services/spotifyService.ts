import SpotifyWebApi from "spotify-web-api-node";
import { SongData, SpotifyPlaylistResponse, SpotifyTrack } from "../types";
import fs from "fs";
import path from "path";
import http from "http";
import url from "url";
import { exec } from "child_process";

function openBrowser(url: string): void {
  if (process.env.NODE_ENV === "production" || process.env.SKIP_BROWSER === "true") {
    console.log(
      `Running in production or SKIP_BROWSER is set. Please open this URL manually:\n${url}`
    );
    return;
  }

  const command =
    process.platform === "win32"
      ? `start "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`);
      console.log(`Please open this URL manually: ${url}`);
    }
  });
}

const TOKEN_PATH = path.join(process.cwd(), "spotify_tokens.json");

export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private playlistId: string;
  private playlistTracks: Set<string> = new Set();
  private isInitialized: boolean = false;
  private tokenExpirationTime: number = 0;

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });

    this.playlistId = process.env.SPOTIFY_PLAYLIST_ID || "";

    if (!this.playlistId) {
      throw new Error("SPOTIFY_PLAYLIST_ID is not defined in .env file");
    }
  }

  /**
   * Initialize the Spotify API by getting an access token
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!(await this.loadSavedTokens())) {
        await this.startAuthorizationFlow();
      }

      await this.loadPlaylistTracks();

      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load saved tokens from file
   */
  private async loadSavedTokens(): Promise<boolean> {
    try {
      if (!fs.existsSync(TOKEN_PATH)) {
        return false;
      }

      const data = fs.readFileSync(TOKEN_PATH, "utf8");
      const tokens = JSON.parse(data);

      if (!tokens.accessToken || !tokens.refreshToken) {
        return false;
      }

      this.spotifyApi.setAccessToken(tokens.accessToken);
      this.spotifyApi.setRefreshToken(tokens.refreshToken);
      this.tokenExpirationTime = tokens.expirationTime || 0;

      if (this.tokenExpirationTime <= Date.now()) {
        await this.refreshAccessToken();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start the authorization flow to get tokens
   */
  private async startAuthorizationFlow(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = http.createServer(async (req, res) => {
          try {
            const parsedUrl = url.parse(req.url || "", true);

            if (parsedUrl.pathname === "/callback") {
              const code = parsedUrl.query.code as string;

              if (!code) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>Authentication failed!</h1><p>No authorization code received.</p>");
                server.close();
                reject(new Error("No authorization code received"));
                return;
              }

              const data = await this.spotifyApi.authorizationCodeGrant(code);

              this.spotifyApi.setAccessToken(data.body.access_token);
              this.spotifyApi.setRefreshToken(data.body.refresh_token);

              this.tokenExpirationTime = Date.now() + data.body.expires_in * 1000 - 300000;

              this.saveTokens();

              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Authentication successful!</h1><p>You can close this window now.</p>");

              server.close();

              resolve();
            } else {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end("<h1>Not found</h1>");
            }
          } catch (error) {
            console.error("Error in callback authentication: ", error);
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(
              "<h1>Authentication error!</h1><p>An error occurred during authentication.</p>"
            );
            server.close();
            reject(error);
          }
        });

        server.listen(8888, () => {
          console.log("Authorization server listening on http://localhost:8888");

          const scopes = [
            "playlist-read-private",
            "playlist-modify-private",
            "playlist-modify-public",
          ];

          const authorizeURL = this.spotifyApi.createAuthorizeURL(scopes, "state");
          console.log(`Opening browser to authorize URL: ${authorizeURL}`);
          openBrowser(authorizeURL);
        });

        server.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const data = await this.spotifyApi.refreshAccessToken();

      this.spotifyApi.setAccessToken(data.body.access_token);
      this.tokenExpirationTime = Date.now() + data.body.expires_in * 1000 - 300000;

      this.saveTokens();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save tokens to file
   */
  private saveTokens(): void {
    const tokenData = {
      accessToken: this.spotifyApi.getAccessToken(),
      refreshToken: this.spotifyApi.getRefreshToken(),
      expirationTime: this.tokenExpirationTime,
    };

    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const stats = fs.statSync(TOKEN_PATH);
        if (stats.isDirectory()) {
          fs.rmdirSync(TOKEN_PATH, { recursive: true });
        } else {
          fs.unlinkSync(TOKEN_PATH);
        }
      }
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
    } catch (error) {
      console.error("Failed to save tokens:", error);
      throw error;
    }
  }

  /**
   * Load all tracks from the playlist to avoid adding duplicates
   */
  private async loadPlaylistTracks(offset: number = 0): Promise<void> {
    try {
      await this.ensureValidToken();

      const response = await this.spotifyApi.getPlaylistTracks(this.playlistId, {
        offset,
        limit: 100,
      });
      const data = response.body as unknown as SpotifyPlaylistResponse;

      data.items.forEach((item) => {
        if (item.track) {
          this.playlistTracks.add(item.track.uri);
        }
      });

      if (data.next) {
        await this.loadPlaylistTracks(offset + 100);
      }
    } catch {}
  }

  /**
   * Search for a song on Spotify
   * @param songData The song data to search for
   * @returns Promise<SpotifyTrack | null> The found track or null
   */
  async searchSong(songData: SongData): Promise<SpotifyTrack | null> {
    try {
      await this.ensureValidToken();

      let track = await this.searchWithExactQuery(songData);

      if (!track) {
        track = await this.searchWithRelaxedQuery(songData);
      }

      return track;
    } catch (error) {
      return null;
    }
  }

  /**
   * Search with exact query using track and artist filters
   */
  private async searchWithExactQuery(songData: SongData): Promise<SpotifyTrack | null> {
    const query = `track:"${songData.title}" artist:"${songData.artist}"`;
    const response = await this.spotifyApi.searchTracks(query, { limit: 1 });

    if (!response.body.tracks || response.body.tracks.items.length === 0) {
      return null;
    }

    const track = response.body.tracks.items[0];
    return {
      uri: track.uri,
      name: track.name,
      artists: track.artists.map((artist) => ({ name: artist.name })),
    };
  }

  /**
   * Search with relaxed query (just the title and artist as keywords)
   */
  private async searchWithRelaxedQuery(songData: SongData): Promise<SpotifyTrack | null> {
    const query = `${songData.title} ${songData.artist}`;
    const response = await this.spotifyApi.searchTracks(query, { limit: 10 });

    if (!response.body.tracks || response.body.tracks.items.length === 0) {
      return null;
    }

    const tracks = response.body.tracks.items;

    const exactTitleWithArtistMatch = tracks.find(
      (t) =>
        t.name.toLowerCase() === songData.title.toLowerCase() &&
        t.artists.some(
          (artist) =>
            artist.name.toLowerCase().includes(songData.artist.split(" ")[0].toLowerCase()) ||
            songData.artist.toLowerCase().includes(artist.name.toLowerCase())
        )
    );

    if (exactTitleWithArtistMatch) {
      return {
        uri: exactTitleWithArtistMatch.uri,
        name: exactTitleWithArtistMatch.name,
        artists: exactTitleWithArtistMatch.artists.map((artist) => ({ name: artist.name })),
      };
    }

    const exactTitleMatch = tracks.find(
      (t) => t.name.toLowerCase() === songData.title.toLowerCase()
    );

    if (exactTitleMatch) {
      const artistNameMatches = exactTitleMatch.artists.some(
        (artist) =>
          artist.name.toLowerCase().includes(songData.artist.split(" ")[0].toLowerCase()) ||
          songData.artist.toLowerCase().includes(artist.name.toLowerCase())
      );

      if (artistNameMatches) {
        return {
          uri: exactTitleMatch.uri,
          name: exactTitleMatch.name,
          artists: exactTitleMatch.artists.map((artist) => ({ name: artist.name })),
        };
      }
    }

    return null;
  }

  /**
   * Add a track to the playlist if it's not already there
   * @param track The track to add
   * @returns Promise<boolean> True if the track was added
   */
  async addTrackToPlaylist(track: SpotifyTrack): Promise<boolean> {
    try {
      await this.ensureValidToken();

      if (this.playlistTracks.has(track.uri)) {
        return false;
      }

      await this.spotifyApi.addTracksToPlaylist(this.playlistId, [track.uri]);

      this.playlistTracks.add(track.uri);
      return true;
    } catch {}

    return false;
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (Date.now() > this.tokenExpirationTime) {
      await this.refreshAccessToken();
    }
  }
}
