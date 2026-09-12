import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Send, Bot, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface TelegramLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername?: string | null;
}

export const TelegramLaunchModal: React.FC<TelegramLaunchModalProps> = ({
  isOpen,
  onClose,
  botUsername,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  // Use the current public preview origin or fallback
  const webAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}`
      : 'https://ais-pre-tu4qfeesmy7pn5oaf4zchw-667383718096.asia-southeast1.run.app';

  const copyToClipboard = async (text: string, type: string) => {
    triggerHaptic('light');
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedCmd(type);
        setTimeout(() => setCopiedCmd(null), 2000);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/30 flex items-center justify-center">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Status & Launch Bot Telegram
              </h2>
              <p className="text-[11px] text-zinc-400">
                {botUsername ? `@${botUsername} telah aktif & siap dipakai` : 'Jadikan Mini App & Bot Telegram dalam 2 Menit'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-zinc-300">
          {/* Active Bot Status Banner */}
          {botUsername && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1DB954]/20 via-[#1DB954]/10 to-transparent border border-[#1DB954]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#1DB954]" />
                  Bot Telegram Terhubung & Online:
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold text-[10px] border border-[#1DB954]/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Token API bot Anda (<span className="text-[#1ed760] font-mono">@{botUsername}</span>) telah terpasang di backend server. Tombol menu <span className="text-white font-medium">"🎵 Unduh Lagu"</span> dan perintah <span className="text-white font-medium">/start</span> sudah otomatis aktif.
              </p>
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('medium')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition active:scale-[0.98] shadow-lg shadow-[#1DB954]/20"
              >
                <Send className="w-4 h-4" />
                <span>Buka Bot @{botUsername} di Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </a>
            </div>
          )}

          {/* Web App URL to Copy */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1ed760] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                URL Web App Mini App:
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-xl p-2 font-mono text-[11px] text-zinc-200 break-all">
              <span className="flex-1 truncate">{webAppUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(webAppUrl, 'url')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] flex-shrink-0 transition active:scale-95"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#229ED9]/20 text-[#229ED9] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                1
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-white">Buka BotFather di Telegram</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Cari akun bot resmi <span className="text-white font-medium">@BotFather</span> di Telegram atau klik tombol di bawah untuk membukanya langsung.
                </p>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/30 font-medium text-[11px] transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Buka @BotFather di Telegram</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#229ED9]/20 text-[#229ED9] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                2
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-white">Buat Bot Baru (Jika Belum Punya)</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Kirim perintah berikut ke @BotFather:
                </p>
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-[11px]">
                  <span>/newbot</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('/newbot', 'newbot')}
                    className="text-zinc-400 hover:text-white"
                  >
                    {copiedCmd === 'newbot' ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Ikuti instruksi BotFather untuk memberi nama bot dan username (misal: <code>spotify_dl_bot</code>).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                3
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-white">Daftarkan Mini App (/newapp)</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Kirim perintah pendaftaran Mini App ke @BotFather:
                </p>
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-[11px]">
                  <span>/newapp</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('/newapp', 'newapp')}
                    className="text-zinc-400 hover:text-white"
                  >
                    {copiedCmd === 'newapp' ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400 pt-1">
                  <li>Pilih bot yang baru Anda buat.</li>
                  <li>Ketik judul aplikasi, misal: <span className="text-white">Spotify Downloader HD</span></li>
                  <li>Ketik deskripsi singkat.</li>
                  <li>Upload gambar cover (atau kirim <code>/empty</code> jika ingin dilewati).</li>
                  <li>Saat diminta <span className="text-[#1ed760] font-semibold">Web App URL</span>, tempel URL Web App di atas!</li>
                  <li>Ketik short name, misal: <span className="text-white font-mono">app</span></li>
                </ol>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                4
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-white">Pasang Tombol Menu di Bot</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Agar pengguna dapat membuka aplikasi langsung dari pojok kiri bawah chat bot:
                </p>
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-[11px]">
                  <span>/setmenubutton</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('/setmenubutton', 'menubtn')}
                    className="text-zinc-400 hover:text-white"
                  >
                    {copiedCmd === 'menubtn' ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Pilih bot Anda &gt; Masukkan URL Web App &gt; Masukkan teks tombol (misal: <code>🎵 Unduh Spotify</code>).
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-3 p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20">
              <div className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold flex items-center justify-center flex-shrink-0 text-xs">
                ✓
              </div>
              <div className="space-y-1 flex-1">
                <p className="font-bold text-white">Selesai! Mini App Siap Digunakan</p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Buka bot Anda di aplikasi Telegram, klik tombol menu di pojok kiri bawah atau link <code>t.me/your_bot/app</code> untuk mulai mengunduh lagu full durasi!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141414] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1DB954]" />
            Monetag Ad Zone 11775264 Terintegrasi
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
