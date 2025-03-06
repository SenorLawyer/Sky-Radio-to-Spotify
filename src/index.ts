import { SpotifyService } from "./services/spotifyService";
import { SkyRadioService } from "./services/skyRadioService";
import { SlamService } from "./services/slamService";
import { Radio538Service } from "./services/538Service";

const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || "60000", 10);

class RadioToSpotify {
  private skyRadioService: SkyRadioService;
  private slamService: SlamService;
  private radio538Service: Radio538Service;
  private spotifyService: SpotifyService;
  private isRunning: boolean = false;

  constructor() {
    this.skyRadioService = new SkyRadioService();
    this.slamService = new SlamService();
    this.radio538Service = new Radio538Service();
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
   * Start monitoring radio stations and adding songs to Spotify
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.checkForNewSongs();
    } catch (error) {
      console.error("Error in initial song check:", error);
    }

    setInterval(async () => {
      try {
        await this.checkForNewSongs();
      } catch (error) {
        console.error("Error in scheduled song check:", error);
      }
    }, CHECK_INTERVAL);
  }

  /**
   * Process a song from a radio station
   */
  private async processSong(songData: any, hasSongChanged: boolean): Promise<void> {
    if (songData && hasSongChanged) {
      const track = await this.spotifyService.searchSong(songData);
      if (track) {
        await this.spotifyService.addTrackToPlaylist(track);
      }
    }
  }

  /**
   * Check for new songs on all radio stations and add them to Spotify if found
   */
  private async checkForNewSongs(): Promise<void> {
    try {
      // Run all radio station checks in parallel
      await Promise.all([
        // Check SkyRadio
        (async () => {
          try {
            const skyRadioSong = await this.skyRadioService.getCurrentlyPlayingSong();
            await this.processSong(skyRadioSong, this.skyRadioService.hasSongChanged(skyRadioSong));
          } catch (error) {
            console.error("Error checking SkyRadio:", error);
          }
        })(),

        // Check Slam
        (async () => {
          try {
            const slamSong = await this.slamService.getCurrentlyPlayingSong();
            await this.processSong(slamSong, this.slamService.hasSongChanged(slamSong));
          } catch (error) {
            console.error("Error checking Slam:", error);
          }
        })(),

        // Check Radio 538
        (async () => {
          try {
            const radio538Song = await this.radio538Service.getCurrentlyPlayingSong();
            await this.processSong(radio538Song, this.radio538Service.hasSongChanged(radio538Song));
          } catch (error) {
            console.error("Error checking Radio 538:", error);
          }
        })(),
      ]);
    } catch (error) {
      console.error("Error checking for new songs:", error);
    }
  }
}

(async () => {
  try {
    console.log("Starting Radio to Spotify application...");
    const app = new RadioToSpotify();
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error("Fatal error in application:", error);
    process.exit(1);
  }
})();
