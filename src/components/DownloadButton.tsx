import React, { useState } from 'react';
import { Download, Share2, Copy, Check, Send, Loader2, CheckCircle2 } from 'lucide-react';
import {
  triggerHaptic,
  triggerMonetagAd,
  getTelegramUser,
  activateMonetagInAppInterstitial,
} from '../lib/telegram';

interface DownloadButtonProps {
  downloadUrl: string;
  fileName: string;
  fileSize?: string;
  songTitle: string;
  artist: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  downloadUrl,
  fileName,
  fileSize,
  songTitle,
  artist,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSendingToTg, setIsSendingToTg] = useState(false);
  const [sendTgSuccess, setSendTgSuccess] = useState(false);

  // Extract clean track ID from downloadUrl: /api/download/file/:id
  const trackId = downloadUrl.split('/').pop()?.replace(/\?.*$/, '') || '';
  const tgUser = getTelegramUser();

  const handleDownload = async () => {
    triggerHaptic('medium');
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSuccess(false);

    // Activate Monetag In-App Interstitial (Zone 11780436)
    activateMonetagInAppInterstitial();
    triggerMonetagAd().catch(() => {});

    // Auto-send audio directly to user's Telegram chat so it delivers continuously
    if (trackId && tgUser?.id) {
      fetch('/api/telegram/send-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, chatId: tgUser.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setSendTgSuccess(true);
            setTimeout(() => setSendTgSuccess(false), 5000);
          }
        })
        .catch(() => {});
    }

    try {
      // 1. Fetch binary as Blob in-place (strictly avoids top-level window redirect and Google 403)
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const contentLength = res.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      let blob: Blob;
      if (res.body && totalBytes > 0) {
        const reader = res.body.getReader();
        let received = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setDownloadProgress(Math.min(100, Math.round((received / totalBytes) * 100)));
        }
        blob = new Blob(chunks, { type: 'audio/mpeg' });
      } else {
        blob = await res.blob();
      }

      // 2. Create in-memory object URL
      const blobUrl = window.URL.createObjectURL(blob);
      const safeName = fileName || `${artist} - ${songTitle}.mp3`;

      // 3. Programmatic anchor click on local blob: URL (guarantees local device file save)
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', safeName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL after 60s
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);

      triggerHaptic('success');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err: any) {
      console.warn('In-memory blob download error, trying direct fallback:', err);
      try {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName || `${artist} - ${songTitle}.mp3`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {}
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleSendToTelegramChat = async () => {
    if (!trackId) return;
    const chatId = tgUser?.id;

    if (!chatId) {
      // If user is running outside Telegram WebApp, open bot chat with track deep link
      const botName = 'SpotifyDWDFreeBot';
      window.open(`https://t.me/${botName}?start=dl_${trackId}`, '_blank');
      return;
    }

    triggerHaptic('medium');
    setIsSendingToTg(true);
    setSendTgSuccess(false);

    try {
      const res = await fetch('/api/telegram/send-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, chatId }),
      });
      const data = await res.json();
      if (data.success) {
        triggerHaptic('success');
        setSendTgSuccess(true);
        setTimeout(() => setSendTgSuccess(false), 6000);
      } else {
        triggerHaptic('error');
        alert(data.message || 'Gagal mengirim lagu ke Telegram');
      }
    } catch {
      triggerHaptic('error');
      alert('Koneksi ke bot Telegram terganggu. Silakan coba tombol Unduh File MP3.');
    } finally {
      setIsSendingToTg(false);
    }
  };

  const handleShareToTelegram = () => {
    triggerHaptic('light');
    const shareText = encodeURIComponent(`🎵 Dengarkan & Unduh lagu "${songTitle}" oleh ${artist} (Full Durasi MP3 320kbps) via Spotify Downloader Mini App!`);
    const shareUrl = encodeURIComponent('https://ais-pre-tu4qfeesmy7pn5oaf4zchw-667383718096.asia-southeast1.run.app');
    const tgUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
  };

  const handleCopyLink = async () => {
    triggerHaptic('light');
    try {
      const fullUrl = `${window.location.origin}${downloadUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Primary Direct Download Button */}
      <button
        type="button"
        id="btn-download-mp3"
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-extrabold text-base flex items-center justify-between shadow-xl shadow-[#1DB954]/25 active:scale-[0.98] transition group disabled:opacity-80"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black/15 flex items-center justify-center group-hover:scale-105 transition shrink-0">
            {isDownloading ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : downloadSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-black" />
            ) : (
              <Download className="w-5 h-5 text-black" />
            )}
          </div>
          <div className="text-left">
            <span className="block leading-tight text-sm font-extrabold">
              {isDownloading
                ? downloadProgress !== null
                  ? `Mengunduh... ${downloadProgress}%`
                  : 'Menyiapkan file MP3...'
                : downloadSuccess
                ? 'Berhasil Diunduh! ✓'
                : 'Unduh File MP3'}
            </span>
            <span className="text-[11px] font-semibold opacity-80">
              {downloadSuccess
                ? 'File tersimpan di folder Unduhan'
                : 'Full Durasi • 320kbps MP3 • ID3 Tags'}
            </span>
          </div>
        </div>

        {fileSize && !isDownloading && (
          <span className="px-2.5 py-1 rounded-lg bg-black/20 text-xs font-bold font-mono tracking-tight shrink-0">
            {fileSize}
          </span>
        )}
      </button>

      {/* Send directly to Telegram Chat Button */}
      <button
        type="button"
        id="btn-send-telegram"
        onClick={handleSendToTelegramChat}
        disabled={isSendingToTg}
        className="w-full py-3 px-4 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-white font-bold text-xs flex items-center justify-between active:scale-[0.98] transition group disabled:opacity-60"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#229ED9] flex items-center justify-center shrink-0 shadow-sm shadow-[#229ED9]/40">
            {isSendingToTg ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : sendTgSuccess ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Send className="w-4 h-4 text-white -translate-x-0.5" />
            )}
          </div>
          <div className="text-left">
            <span className="block leading-tight font-bold text-xs text-white">
              {isSendingToTg
                ? 'Mengirim lagu ke chat Telegram...'
                : sendTgSuccess
                ? 'Terkirim ke Chat Telegram Anda! ✓'
                : 'Kirim File MP3 ke Chat Telegram'}
            </span>
            <span className="text-[10px] text-zinc-400">
              {sendTgSuccess
                ? 'Buka pesan dari @SpotifyDWDFreeBot'
                : 'Audio langsung bisa diputar & disimpan di Telegram'}
            </span>
          </div>
        </div>
        <span className="text-[11px] text-[#229ED9] font-bold group-hover:translate-x-0.5 transition">
          {sendTgSuccess ? '✓' : '→'}
        </span>
      </button>

      {/* Share & Copy Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          id="btn-share-telegram"
          onClick={handleShareToTelegram}
          className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Share2 className="w-3.5 h-3.5 text-[#229ED9]" />
          <span>Bagi ke Telegram</span>
        </button>

        <button
          type="button"
          id="btn-copy-link"
          onClick={handleCopyLink}
          className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#1DB954]" />
              <span className="text-[#1DB954]">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Salin Link File</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

