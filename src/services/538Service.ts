import puppeteer from "puppeteer";
import { SongData } from "../types";
import axios from "axios";
import * as cheerio from "cheerio";

export class Radio538Service {
  private readonly url: string = "https://www.538.nl/";
  private lastSong: string = "";
  private puppeteerFailCount: number = 0;
  private readonly MAX_PUPPETEER_FAILS: number = 3;

  /**
   * Scrapes the Radio 538 website to get the currently playing song using Puppeteer
   * @returns Promise<SongData | null> The song data or null if not found
   */
  async getCurrentlyPlayingSong(): Promise<SongData | null> {
    try {
      if (this.puppeteerFailCount >= this.MAX_PUPPETEER_FAILS) {
        return this.getCurrentlyPlayingSongFallback();
      }

      const songData = await this.getCurrentlyPlayingSongWithPuppeteer();

      if (songData) {
        this.puppeteerFailCount = 0;
        return songData;
      } else {
        this.puppeteerFailCount++;
        return this.getCurrentlyPlayingSongFallback();
      }
    } catch (error) {
      this.puppeteerFailCount++;
      return this.getCurrentlyPlayingSongFallback();
    }
  }

  /**
   * Get the currently playing song using Puppeteer
   * @returns Promise<SongData | null> The song data or null if not found
   */
  private async getCurrentlyPlayingSongWithPuppeteer(): Promise<SongData | null> {
    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process",
          "--no-zygote",
          "--disable-extensions",
          "--disable-features=site-per-process",
          "--ignore-certificate-errors",
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        timeout: 30000,
      });

      page = await browser.newPage();

      page.setDefaultNavigationTimeout(30000);
      page.setDefaultTimeout(30000);

      await page.goto(this.url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for the now playing container to load
      await page.waitForSelector('div[class*="Component-title-"][class*="Component-nowPlaying-"]', {
        timeout: 30000,
      });

      const songData = await page.evaluate(() => {
        const titleElement = document.querySelector(
          'div[class*="Component-title-"][class*="Component-nowPlaying-"]'
        );

        if (!titleElement) {
          return null;
        }

        // Find the artist element which is a sibling of the title element
        const artistElement = titleElement.nextElementSibling;

        if (!artistElement || !artistElement.classList.contains("Component-artist-")) {
          return null;
        }

        return {
          title: titleElement.textContent?.trim() || "",
          artist: artistElement.textContent?.trim() || "",
        };
      });

      if (!songData) {
        return null;
      }

      return songData;
    } catch {
      return null;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {}
      }

      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }
  }

  /**
   * Fallback method to get the currently playing song using axios and cheerio
   * @returns Promise<SongData | null> The song data or null if not found
   */
  private async getCurrentlyPlayingSongFallback(): Promise<SongData | null> {
    try {
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);

      // Find the title element using a partial class match
      const titleElement = $(
        'div[class*="Component-title-"][class*="Component-nowPlaying-"]'
      ).first();

      if (!titleElement.length) {
        return null;
      }

      // Find the artist element which is the next sibling with the artist class
      const artistElement = titleElement.next('div[class*="Component-artist-"]').first();

      if (!artistElement.length) {
        return null;
      }

      const title = titleElement.text().trim();
      const artist = artistElement.text().trim();

      if (!title || !artist) {
        return null;
      }

      const songData = {
        title: title,
        artist: artist,
      };

      return songData;
    } catch {
      return null;
    }
  }

  /**
   * Checks if the song has changed since the last check
   * @param songData The current song data
   * @returns boolean True if the song has changed
   */
  hasSongChanged(songData: SongData | null): boolean {
    if (!songData) return false;

    const songKey = `${songData.title} - ${songData.artist}`;
    const hasChanged = songKey !== this.lastSong;

    if (hasChanged) {
      this.lastSong = songKey;
    }

    return hasChanged;
  }
}
