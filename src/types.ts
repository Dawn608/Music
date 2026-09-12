export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration_ms: number;
  duration_formatted: string;
  release_date?: string;
  cover_url: string;
  preview_url?: string | null;
  spotify_url: string;
  is_explicit?: boolean;
}

export interface DownloadResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
  streamUrl?: string;
  fileSize?: string;
  fileName?: string;
  duration?: string;
  durationSec?: number;
  durationFormatted?: string;
  isFullDuration?: boolean;
}

export interface ExtractionStatus {
  step: 'idle' | 'resolving' | 'searching' | 'downloading' | 'tagging' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface RecentDownloadItem {
  id: string;
  track: SpotifyTrack;
  downloadedAt: number;
  fileSize?: string;
}
