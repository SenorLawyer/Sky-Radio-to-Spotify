export interface SongData {
  title: string;
  artist: string;
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
}

export interface SpotifyPlaylistResponse {
  items: SpotifyPlaylistTrack[];
  next: string | null;
}
