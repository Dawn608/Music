import React from 'react';
import { Music, Sparkles, Rocket, Send } from 'lucide-react';
import { getTelegramUser, triggerHaptic } from '../lib/telegram';

interface HeaderProps {
  onOpenTelegramGuide?: () => void;
  botUsername?: string | null;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTelegramGuide, botUsername }) => {
  const user = getTelegramUser();

  return (
    <header className="w-full pt-4 pb-3 px-4 flex items-center justify-between border-b border-white/10 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1DB954] to-[#1ed760] flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
          <Music className="w-5 h-5 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              Spotify Downloader
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/30">
              HD
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse"></span>
            {user ? `Halo, ${user.first_name}` : botUsername ? `@${botUsername} Aktif` : 'Telegram Mini App • Full Durasi'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => triggerHaptic('light')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/30 text-[11px] font-medium transition active:scale-95"
            title={`Buka @${botUsername} di Telegram`}
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">@{botUsername}</span>
            <span className="sm:hidden">Bot</span>
          </a>
        ) : onOpenTelegramGuide ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenTelegramGuide();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/30 text-[11px] font-medium transition active:scale-95"
            title="Panduan Launch di Telegram"
          >
            <Rocket className="w-3 h-3" />
            <span className="hidden sm:inline">Launch Bot</span>
            <span className="sm:hidden">Launch</span>
          </button>
        ) : null}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300">
          <Sparkles className="w-3 h-3 text-[#1DB954]" />
          <span>320kbps</span>
        </div>
      </div>
    </header>
  );
};

