import React, { useState, useEffect } from 'react';
import { SpotifyTrack, ExtractionStatus, RecentDownloadItem, DownloadResponse } from './types';
import { Header } from './components/Header';
import { LinkInput } from './components/LinkInput';
import { TrackCard } from './components/TrackCard';
import { AudioPlayer } from './components/AudioPlayer';
import { DownloadButton } from './components/DownloadButton';
import { RecentDownloads } from './components/RecentDownloads';
import { HowToGuide } from './components/HowToGuide';
import { TelegramLaunchModal } from './components/TelegramLaunchModal';
import { initTelegramWebApp, triggerHaptic, triggerMonetagAd } from './lib/telegram';
import { Music, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [downloadData, setDownloadData] = useState<DownloadResponse | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>({
    step: 'idle',
    progress: 0,
    message: '',
  });
  const [recentDownloads, setRecentDownloads] = useState<RecentDownloadItem[]>([]);

  // Initialize Telegram WebApp, fetch bot status, and load recent downloads from localStorage
  useEffect(() => {
    initTelegramWebApp();

    // Check if Telegram bot is connected
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.configured && data.username) {
          setBotUsername(data.username);
        }
      })
      .catch(() => {});

    try {
      const stored = localStorage.getItem('spotify_tg_recent');
      if (stored) {
        setRecentDownloads(JSON.parse(stored));
      }
    } catch {}

    // Check if launched with a query parameter (e.g. from Telegram Bot / inline button)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const trackParam = searchParams.get('track') || searchParams.get('url');
      if (trackParam) {
        setUrl(trackParam);
        handleResolve(trackParam);
      }
    } catch {}
  }, []);

  const saveRecent = (newTrack: SpotifyTrack, size?: string) => {
    try {
      const newItem: RecentDownloadItem = {
        id: newTrack.id,
        track: newTrack,
        downloadedAt: Date.now(),
        fileSize: size,
      };
      setRecentDownloads((prev) => {
        const filtered = prev.filter((p) => p.id !== newTrack.id);
        const updated = [newItem, ...filtered].slice(0, 10);
        localStorage.setItem('spotify_tg_recent', JSON.stringify(updated));
        return updated;
      });
    } catch {}
  };

  const handleClearRecent = () => {
    setRecentDownloads([]);
    try {
      localStorage.removeItem('spotify_tg_recent');
    } catch {}
  };

  // Step 1: Resolve Spotify track link
  const handleResolve = async (overrideUrl?: string) => {
    const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : url;
    if (!targetUrl.trim()) return;

    setIsResolving(true);
    setTrack(null);
    setDownloadData(null);
    setExtractionStatus({
      step: 'resolving',
      progress: 15,
      message: 'Menghubungkan ke server Spotify...',
    });

    try {
      const res = await fetch('/api/spotify/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.track) {
        throw new Error(data.message || 'Gagal mengenali lagu dari tautan ini.');
      }

      setTrack(data.track);
      triggerHaptic('success');

      // Automatically initiate extraction for seamless Telegram UX
      handleExtract(data.track);
    } catch (err: any) {
      triggerHaptic('error');
      setExtractionStatus({
        step: 'error',
        progress: 0,
        message: err.message || 'Gagal memproses tautan Spotify.',
      });
    } finally {
      setIsResolving(false);
    }
  };

  // Step 2: Extract full-duration audio
  const handleExtract = async (targetTrack?: SpotifyTrack) => {
    const currentTrack = targetTrack || track;
    if (!currentTrack) return;

    setExtractionStatus({
      step: 'searching',
      progress: 35,
      message: 'Mencari stream audio full durasi...',
    });

    // Simulate steady progress increments while backend processes
    const progressTimer = setInterval(() => {
      setExtractionStatus((prev) => {
        if (prev.step === 'idle' || prev.step === 'completed' || prev.step === 'error') {
          return prev;
        }
        const nextProgress = Math.min(prev.progress + 6, 88);
        let nextMsg = prev.message;
        if (nextProgress > 50 && prev.progress <= 50) {
          nextMsg = 'Mengonversi ke MP3 320kbps...';
        } else if (nextProgress > 75 && prev.progress <= 75) {
          nextMsg = 'Menyematkan cover HD & ID3 tags...';
        }
        return {
          ...prev,
          progress: nextProgress,
          message: nextMsg,
        };
      });
    }, 600);

    try {
      const res = await fetch('/api/spotify/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          coverUrl: currentTrack.cover_url,
          releaseDate: currentTrack.release_date,
          durationMs: currentTrack.duration_ms,
          previewUrl: currentTrack.preview_url,
        }),
      });

      clearInterval(progressTimer);
      const data: DownloadResponse = await res.json();

      if (!res.ok || !data.success || !data.downloadUrl) {
        throw new Error(data.message || 'Gagal mengekstrak audio full durasi.');
      }

      setDownloadData(data);
      setExtractionStatus({
        step: 'completed',
        progress: 100,
        message: 'Lagu siap diunduh dan didengarkan!',
      });
      triggerHaptic('success');
      saveRecent(currentTrack, data.fileSize);

      // Trigger Monetag Ad SDK
      triggerMonetagAd();
    } catch (err: any) {
      clearInterval(progressTimer);
      triggerHaptic('error');
      setExtractionStatus({
        step: 'error',
        progress: 0,
        message: err.message || 'Gagal mengekstrak audio lagu full durasi.',
      });
    }
  };

  const handleSelectRecent = (item: RecentDownloadItem) => {
    setUrl(item.track.spotify_url);
    setTrack(item.track);
    handleExtract(item.track);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans selection:bg-[#1DB954] selection:text-black">
      <Header
        onOpenTelegramGuide={() => setIsTelegramModalOpen(true)}
        botUsername={botUsername}
      />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Input Card */}
        <LinkInput
          url={url}
          setUrl={setUrl}
          onResolve={handleResolve}
          isLoading={isResolving}
        />

        {/* Feature Highlights */}
        {!track && (
          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <Zap className="w-4 h-4 text-[#1DB954] mb-1" />
              <span className="text-[11px] font-bold text-zinc-200">Full Durasi</span>
              <span className="text-[9px] text-zinc-500">100% lagu utuh</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <CheckCircle2 className="w-4 h-4 text-[#1DB954] mb-1" />
              <span className="text-[11px] font-bold text-zinc-200">320 kbps</span>
              <span className="text-[9px] text-zinc-500">Kualitas HQ</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
              <ShieldCheck className="w-4 h-4 text-[#1DB954] mb-1" />
              <span className="text-[11px] font-bold text-zinc-200">Cover & Tag</span>
              <span className="text-[9px] text-zinc-500">ID3 Lengkap</span>
            </div>
          </div>
        )}

        {/* Track Card */}
        {track && (
          <TrackCard
            track={track}
            extractionStatus={extractionStatus}
            onExtract={() => handleExtract()}
            downloadData={downloadData}
          />
        )}

        {/* Audio Player */}
        {downloadData?.streamUrl && track && (
          <AudioPlayer
            streamUrl={downloadData.streamUrl}
            title={track.title}
            artist={track.artist}
          />
        )}

        {/* Download Button */}
        {downloadData?.downloadUrl && track && (
          <DownloadButton
            downloadUrl={downloadData.downloadUrl}
            fileName={downloadData.fileName || `${track.artist} - ${track.title}.mp3`}
            fileSize={downloadData.fileSize}
            songTitle={track.title}
            artist={track.artist}
          />
        )}

        {/* How To Guide */}
        <HowToGuide onOpenTelegramGuide={() => setIsTelegramModalOpen(true)} />

        {/* Recent Downloads */}
        <RecentDownloads
          items={recentDownloads}
          onSelectTrack={handleSelectRecent}
          onClear={handleClearRecent}
        />
      </main>

      {/* Telegram Launch Modal */}
      <TelegramLaunchModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        botUsername={botUsername}
      />

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-zinc-600 border-t border-white/5">
        <p>Spotify Downloader Mini App • Monetag Zone 11775264</p>
      </footer>
    </div>
  );
}
