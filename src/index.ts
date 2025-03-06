import { SkyRadioService } from "./services/skyRadioService";
import { SpotifyService } from "./services/spotifyService";

const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || "60000", 10);

class SkyRadioToSpotify {
  private skyRadioService: SkyRadioService;
  private spotifyService: SpotifyService;
  private isRunning: boolean = false;

  constructor() {
    this.skyRadioService = new SkyRadioService();
    this.spotifyService = new SpotifyService();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      await this.spotifyService.initialize();
    } catch (error) {
      console.error("Failed to initialize application:", error);
      process.exit(1);
    }
  }

  /**
   * Start monitoring Sky Radio and adding songs to Spotify
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.checkForNewSong();
    } catch (error) {
      console.error("Error in initial song check:", error);
    }

    setInterval(async () => {
      try {
        await this.checkForNewSong();
      } catch (error) {
        console.error("Error in scheduled song check:", error);
      }
    }, CHECK_INTERVAL);
  }

  /**
   * Check for a new song and add it to Spotify if found
   */
  private async checkForNewSong(): Promise<void> {
    try {
      const songData = await this.skyRadioService.getCurrentlyPlayingSong();

      if (!songData) {
        return;
      }

      if (this.skyRadioService.hasSongChanged(songData)) {
        const track = await this.spotifyService.searchSong(songData);

        if (track) {
          await this.spotifyService.addTrackToPlaylist(track);
        }
      }
    } catch {}
  }
}

(async () => {
  try {
    console.log("Starting SkyRadio to Spotify application...");
    const app = new SkyRadioToSpotify();
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error("Fatal error in application:", error);
    process.exit(1);
  }
})();
