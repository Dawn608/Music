import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import NodeID3 from 'node-id3';
import { createServer as createViteServer } from 'vite';
import { initTelegramBot, getTelegramBotStatus, sendTelegramAudio } from './server/telegramBot';

const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache directory for downloaded MP3s
const CACHE_DIR = '/tmp/spotify_cache';
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Track metadata in-memory store for downloaded files
interface TrackMetaStore {
  title: string;
  artist: string;
  album: string;
  year?: string;
  coverUrl?: string;
  duration?: string;
}
const metaStore = new Map<string, TrackMetaStore>();

function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function parseDurationString(str: string): number {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

// Extract Spotify Track ID from varied URL formats
async function extractSpotifyTrackId(inputUrl: string): Promise<string | null> {
  const trimmed = inputUrl.trim();
  
  // Direct ID check (22 alphanumeric characters)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle spotify:track:xxx uri
  const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]{22})/);
  if (uriMatch) return uriMatch[1];

  // Handle open.spotify.com/track/xxx or intl-xx/track/xxx
  const webMatch = trimmed.match(/(?:open\.spotify\.com\/(?:[a-zA-Z0-9-]+\/)?track\/)([a-zA-Z0-9]{22})/);
  if (webMatch) return webMatch[1];

  // Handle spotify.link shorteners
  if (trimmed.includes('spotify.link') || trimmed.includes('spoti.fi')) {
    try {
      const res = await fetch(trimmed, { redirect: 'follow' });
      const finalUrl = res.url;
      const match = finalUrl.match(/(?:track\/)([a-zA-Z0-9]{22})/);
      if (match) return match[1];
    } catch {
      // ignore
    }
  }

  return null;
}

// Fetch Spotify track metadata without API key
async function fetchTrackMetadata(trackId: string) {
  // 1. Try Spotify embed page (rich NEXT_DATA)
  try {
    const embedRes = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (embedRes.ok) {
      const html = await embedRes.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (nextDataMatch) {
        const data = JSON.parse(nextDataMatch[1]);
        const entity = data.props?.pageProps?.state?.data?.entity;
        if (entity) {
          const title = entity.title || entity.name || 'Unknown Track';
          const artists = Array.isArray(entity.artists)
            ? entity.artists.map((a: any) => a.name).join(', ')
            : 'Unknown Artist';
          
          let coverUrl = '';
          const images = entity.visualIdentity?.image;
          if (Array.isArray(images) && images.length > 0) {
            // Find highest resolution
            const sorted = [...images].sort((a, b) => (b.maxHeight || 0) - (a.maxHeight || 0));
            coverUrl = sorted[0]?.url || '';
          }

          const durationMs = Number(entity.duration) || 0;
          const releaseDate = entity.releaseDate?.isoString || '';

          return {
            id: trackId,
            title,
            artist: artists,
            album: entity.album?.name || title,
            duration_ms: durationMs,
            duration_formatted: formatDuration(durationMs),
            release_date: releaseDate ? releaseDate.slice(0, 10) : undefined,
            cover_url: coverUrl,
            preview_url: entity.audioPreview?.url || null,
            spotify_url: `https://open.spotify.com/track/${trackId}`,
            is_explicit: Boolean(entity.isExplicit),
          };
        }
      }
    }
  } catch (err) {
    console.error('Embed metadata fetch error:', err);
  }

  // 2. Fallback to Spotify oEmbed
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      return {
        id: trackId,
        title: oembed.title || 'Spotify Track',
        artist: oembed.author_name || 'Spotify Artist',
        album: oembed.title || 'Spotify Album',
        duration_ms: 0,
        duration_formatted: '0:00',
        cover_url: oembed.thumbnail_url || '',
        preview_url: null,
        spotify_url: `https://open.spotify.com/track/${trackId}`,
        is_explicit: false,
      };
    }
  } catch (err) {
    console.error('oEmbed fallback error:', err);
  }

  return null;
}

// Find yt-dlp binary path
function getYtDlpPath(): string {
  const localPath = path.resolve(process.cwd(), 'bin/yt-dlp');
  if (fs.existsSync(localPath)) return localPath;
  const tmpPath = '/tmp/yt-dlp';
  if (fs.existsSync(tmpPath)) return tmpPath;
  return 'yt-dlp';
}

// Resolve Spotify Link API
app.post('/api/spotify/resolve', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'URL Spotify tidak boleh kosong' });
    }

    const trackId = await extractSpotifyTrackId(url);
    if (!trackId) {
      // If user typed a search query directly, e.g. "Taylor Swift Cruel Summer"
      // Let's resolve via yt-dlp search to synthesize track info
      try {
        const ytDlp = getYtDlpPath();
        const searchQuery = `ytsearch1:${url.trim()}`;
        const { stdout } = await execFileAsync(ytDlp, [
          '--js-runtimes', 'node',
          '--get-title',
          '--get-duration',
          '--get-id',
          '--get-thumbnail',
          searchQuery
        ]);
        const lines = stdout.trim().split('\n').filter(Boolean);
        if (lines.length >= 3) {
          const title = lines[0];
          const durationStr = lines[1];
          const videoId = lines[2];
          const thumb = lines[3] || '';
          
          const syntheticId = `yt_${videoId}`;
          const durationMs = parseDurationString(durationStr);

          const trackData = {
            id: syntheticId,
            title: title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim() || title,
            artist: 'YouTube Music Search',
            album: 'Single / Web Stream',
            duration_ms: durationMs,
            duration_formatted: durationStr,
            release_date: new Date().toISOString().slice(0, 10),
            cover_url: thumb,
            preview_url: null,
            spotify_url: `https://www.youtube.com/watch?v=${videoId}`,
            is_explicit: false,
          };

          return res.json({ success: true, track: trackData });
        }
      } catch (searchErr) {
        console.error('Search query fallback failed:', searchErr);
      }

      return res.status(400).json({
        success: false,
        message: 'Tautan tidak valid. Masukkan tautan lagu Spotify (contoh: https://open.spotify.com/track/...)',
      });
    }

    const track = await fetchTrackMetadata(trackId);
    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Lagu tidak ditemukan di Spotify. Pastikan link aktif dan publik.',
      });
    }

    return res.json({ success: true, track });
  } catch (error: any) {
    console.error('Resolve error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memproses link Spotify' });
  }
});

// Helper: obtain exact audio duration in seconds using ffprobe
async function getAudioDurationSec(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-i', filePath,
      '-show_entries', 'format=duration',
      '-v', 'quiet',
      '-of', 'csv=p=0',
    ]);
    const parsed = parseFloat(stdout.trim());
    return isNaN(parsed) ? 0 : parsed;
  } catch (err) {
    return 0;
  }
}

// Extract and prepare full-duration MP3 download
app.post('/api/spotify/extract', async (req, res) => {
  try {
    const { trackId, title, artist, album, coverUrl, releaseDate, durationMs } = req.body;
    if (!trackId || !title) {
      return res.status(400).json({ success: false, message: 'Data track tidak lengkap' });
    }

    const safeTrackId = trackId.replace(/[^a-zA-Z0-9_-]/g, '');
    const finalMp3Path = path.join(CACHE_DIR, `${safeTrackId}.mp3`);
    const tempRawPath = path.join(CACHE_DIR, `${safeTrackId}_raw.%(ext)s`);

    const targetDurationSec = durationMs ? Math.round(durationMs / 1000) : 0;

    // Store metadata for serving
    metaStore.set(safeTrackId, {
      title: title || 'Song',
      artist: artist || 'Artist',
      album: album || title || 'Album',
      year: releaseDate ? releaseDate.slice(0, 4) : undefined,
      coverUrl,
    });

    // Check if file already cached and has valid full duration (not a snippet!)
    if (fs.existsSync(finalMp3Path)) {
      const stats = fs.statSync(finalMp3Path);
      const cachedDur = await getAudioDurationSec(finalMp3Path);
      
      // If Spotify song is > 60s, ensure cached audio is at least 60s and > 1MB
      const isValidDuration = targetDurationSec > 60 ? (cachedDur >= 55 && stats.size > 800000) : stats.size > 200000;

      if (isValidDuration) {
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
        const durFormatted = formatDuration(Math.round(cachedDur * 1000));
        return res.json({
          success: true,
          downloadUrl: `/api/download/file/${safeTrackId}`,
          streamUrl: `/api/download/file/${safeTrackId}?play=1`,
          fileSize: sizeMb,
          fileName: `${artist} - ${title}.mp3`,
          durationSec: cachedDur,
          durationFormatted: durFormatted,
          isFullDuration: true,
          source: 'cache',
          cached: true,
        });
      } else {
        // Cached file was a snippet or corrupted, delete and re-extract
        try { fs.unlinkSync(finalMp3Path); } catch {}
      }
    }

    const ytDlp = getYtDlpPath();
    let downloadSuccess = false;
    let sourceUsed = '';
    let finalDuration = 0;

    // Clean query keywords
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = (artist || '').replace(/\(.*?\)/g, '').trim();

    // Strategy: Search SoundCloud with targeted candidate duration matching
    const searchQueries = [
      `scsearch15:${cleanArtist} ${cleanTitle}`,
      `scsearch15:${cleanArtist} - ${cleanTitle}`,
      `scsearch10:${cleanTitle}`,
    ];

    interface CandidateTrack {
      title: string;
      duration: number;
      url: string;
      score: number;
      diff: number;
    }

    const candidatePool: CandidateTrack[] = [];
    const seenUrls = new Set<string>();

    for (const query of searchQueries) {
      if (candidatePool.length >= 8) break;
      try {
        console.log(`[Extract] Searching for full duration: "${query}" (Target: ${targetDurationSec}s)`);
        const { stdout } = await execFileAsync(ytDlp, [
          query,
          '-j',
          '--flat-playlist',
        ], { timeout: 15000 });

        const lines = stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            const candUrl = item.url || item.webpage_url;
            const candDur = item.duration || 0;
            if (!candUrl || seenUrls.has(candUrl)) continue;
            seenUrls.add(candUrl);

            // STRICT FILTER: Discard snippets! If target is > 60s, discard anything < 55s
            if (targetDurationSec > 60 && candDur < 55) {
              continue;
            }

            // Discard super long mixes/loops (> 1.6x Spotify duration or > 12 minutes if track is < 5 mins)
            if (targetDurationSec > 0 && candDur > Math.max(targetDurationSec * 1.6, 600)) {
              continue;
            }

            const diff = targetDurationSec > 0 ? Math.abs(candDur - targetDurationSec) : 0;
            let penalty = 0;
            const candTitle = (item.title || '').toLowerCase();
            const targetTitleLower = title.toLowerCase();

            // Penalties for unintended versions if original isn't one
            if (!targetTitleLower.includes('remix') && (candTitle.includes('remix') || candTitle.includes('mashup') || candTitle.includes('bootleg'))) {
              penalty += 50;
            }
            if (!targetTitleLower.includes('cover') && candTitle.includes('cover')) {
              penalty += 45;
            }
            if (!targetTitleLower.includes('acoustic') && candTitle.includes('acoustic')) {
              penalty += 35;
            }
            if (!targetTitleLower.includes('live') && candTitle.includes('live')) {
              penalty += 30;
            }
            if (candTitle.includes('slowed') || candTitle.includes('nightcore') || candTitle.includes('reverb') || candTitle.includes('sped up')) {
              penalty += 80;
            }
            if (candTitle.includes('instrumental') && !targetTitleLower.includes('instrumental')) {
              penalty += 70;
            }

            // Bonus if title matches closely
            if (candTitle.includes(cleanTitle.toLowerCase())) {
              penalty -= 8;
            }

            candidatePool.push({
              title: item.title,
              duration: candDur,
              url: candUrl,
              score: diff + penalty,
              diff,
            });
          } catch {}
        }
      } catch (err: any) {
        console.warn(`[Extract] Search query "${query}" notice:`, err?.message?.slice(0, 100));
      }
    }

    // Sort candidate pool by best score (closest duration & least penalties)
    candidatePool.sort((a, b) => a.score - b.score);
    console.log(`[Extract] Total valid candidates found: ${candidatePool.length}`);
    if (candidatePool.length > 0) {
      console.log(`[Extract] Best candidate: "${candidatePool[0].title}" (duration: ${candidatePool[0].duration}s, target: ${targetDurationSec}s)`);
    }

    const rawMp3 = path.join(CACHE_DIR, `${safeTrackId}_raw.mp3`);

    // Download top candidate (try up to 3 candidates if any fails verification)
    for (const cand of candidatePool.slice(0, 3)) {
      try {
        console.log(`[Extract] Attempting download: ${cand.title} (${cand.duration}s)...`);
        // Clean previous raw file if any
        if (fs.existsSync(rawMp3)) {
          try { fs.unlinkSync(rawMp3); } catch {}
        }

        await execFileAsync(ytDlp, [
          cand.url,
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', tempRawPath,
          '--no-playlist',
        ], { timeout: 45000 });

        if (fs.existsSync(rawMp3) && fs.statSync(rawMp3).size > 400000) {
          const verifiedDur = await getAudioDurationSec(rawMp3);
          console.log(`[Extract] Verified downloaded duration: ${verifiedDur}s (Target: ${targetDurationSec}s)`);

          // Verification check: ensure it's not a 30s snippet
          if (targetDurationSec > 60 && verifiedDur < 55) {
            console.warn('[Extract] Downloaded file is too short (likely snippet), rejecting.');
            try { fs.unlinkSync(rawMp3); } catch {}
            continue;
          }

          downloadSuccess = true;
          sourceUsed = 'Full Track Stream';
          finalDuration = verifiedDur;
          break;
        }
      } catch (dlErr: any) {
        console.warn(`[Extract] Candidate download failed for ${cand.title}:`, dlErr?.message?.slice(0, 100));
      }
    }

    // Strictly DO NOT fall back to 30-second Spotify preview clips!
    if (!downloadSuccess || !fs.existsSync(rawMp3)) {
      throw new Error(
        'Audio lagu full durasi yang sesuai belum dapat ditemukan secara otomatis. Pastikan lagu ini tersedia publik atau coba lagu lain.'
      );
    }

    // Embed rich ID3 metadata tags (Title, Artist, Album, Year, Cover Artwork)
    try {
      const id3Tags: NodeID3.Tags = {
        title: title || 'Song',
        artist: artist || 'Artist',
        album: album || title || 'Spotify Download',
        year: releaseDate ? releaseDate.slice(0, 4) : undefined,
      };

      if (coverUrl) {
        try {
          const imgRes = await fetch(coverUrl);
          if (imgRes.ok) {
            const arrayBuf = await imgRes.arrayBuffer();
            id3Tags.image = {
              mime: 'image/jpeg',
              type: { id: 3, name: 'front cover' },
              description: 'Cover',
              imageBuffer: Buffer.from(arrayBuf),
            };
          }
        } catch (imgErr) {
          console.warn('Could not fetch album cover for tagging:', imgErr);
        }
      }

      NodeID3.write(id3Tags, rawMp3);
    } catch (tagErr) {
      console.warn('ID3 tag write warning:', tagErr);
    }

    // Move to cached final destination
    fs.renameSync(rawMp3, finalMp3Path);

    const stats = fs.statSync(finalMp3Path);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
    const durFormatted = formatDuration(Math.round(finalDuration * 1000));

    return res.json({
      success: true,
      downloadUrl: `/api/download/file/${safeTrackId}`,
      streamUrl: `/api/download/file/${safeTrackId}?play=1`,
      fileSize: sizeMb,
      fileName: `${artist} - ${title}.mp3`,
      durationSec: finalDuration,
      durationFormatted: durFormatted,
      isFullDuration: true,
      source: sourceUsed,
      cached: false,
    });
  } catch (err: any) {
    console.error('Audio extraction error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal mengekstrak lagu full durasi. Silakan coba lagi.',
    });
  }
});

// Stream or download MP3 file
app.get('/api/download/file/:id', (req, res) => {
  try {
    const { id } = req.params;
    const isPlay = req.query.play === '1';
    const safeTrackId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(CACHE_DIR, `${safeTrackId}.mp3`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File audio tidak ditemukan atau telah kedaluwarsa.' });
    }

    const meta = metaStore.get(safeTrackId);
    const rawFileName = meta ? `${meta.artist} - ${meta.title}.mp3` : `spotify_${safeTrackId}.mp3`;
    const cleanFileName = rawFileName.replace(/[<>:"/\\|?*]/g, '_');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support HTTP 206 Partial Content for in-app audio seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const disposition = isPlay ? 'inline' : `attachment; filename="${encodeURIComponent(cleanFileName)}"`;
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': disposition,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
        'Cache-Control': 'public, max-age=86400',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('File serve error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengirim file audio' });
  }
});

// Endpoint to send audio directly to user's Telegram chat
app.post('/api/telegram/send-audio', async (req, res) => {
  try {
    const { trackId, chatId } = req.body;
    if (!trackId || !chatId) {
      return res.status(400).json({ success: false, message: 'trackId dan chatId wajib diisi.' });
    }

    const safeTrackId = String(trackId).replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(CACHE_DIR, `${safeTrackId}.mp3`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File audio tidak ditemukan di server. Silakan unduh ulang.' });
    }

    const meta = metaStore.get(safeTrackId) || {
      title: 'Spotify Track',
      artist: 'Unknown Artist',
    };

    const duration = await getAudioDurationSec(filePath);
    const result = await sendTelegramAudio(chatId, filePath, {
      title: meta.title,
      artist: meta.artist,
      duration,
    });

    if (result.ok) {
      return res.json({ success: true, message: 'Audio berhasil dikirim ke Telegram chat Anda!' });
    } else {
      return res.status(500).json({
        success: false,
        message: result.description || 'Gagal mengirim audio ke Telegram bot.',
      });
    }
  } catch (err: any) {
    console.error('Send audio error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Gagal mengirim file ke Telegram' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ytDlpAvailable: fs.existsSync(getYtDlpPath()),
  });
});

// Telegram bot status endpoint
app.get('/api/telegram/status', (req, res) => {
  res.json(getTelegramBotStatus());
});

// Vite middleware setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    const rawUrl =
      process.env.APP_URL ||
      'https://ais-pre-tu4qfeesmy7pn5oaf4zchw-667383718096.asia-southeast1.run.app';
    const publicAppUrl = rawUrl.replace('ais-dev-', 'ais-pre-');
    initTelegramBot(publicAppUrl);
  });
}

start();
