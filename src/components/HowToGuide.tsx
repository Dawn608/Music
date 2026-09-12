import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Share, Copy, CheckCircle2, Rocket } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface HowToGuideProps {
  onOpenTelegramGuide?: () => void;
}

export const HowToGuide: React.FC<HowToGuideProps> = ({ onOpenTelegramGuide }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    triggerHaptic('light');
    setIsOpen(!isOpen);
  };

  return (
    <div className="w-full space-y-2.5">
      {onOpenTelegramGuide && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenTelegramGuide();
          }}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#229ED9]/15 to-[#1DB954]/15 border border-[#229ED9]/30 flex items-center justify-between text-xs text-white hover:border-[#229ED9]/50 transition group text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center flex-shrink-0">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] group-hover:text-[#229ED9] transition">
                Cara Launch di Telegram (BotFather)
              </p>
              <p className="text-[10px] text-zinc-400">
                Panduan pasang bot & Mini App dengan URL Anda
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#229ED9] bg-[#229ED9]/20 px-2.5 py-1 rounded-lg flex-shrink-0">
            Lihat &rarr;
          </span>
        </button>
      )}

      <div className="w-full rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <button
          type="button"
          onClick={toggle}
          className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#1DB954]" />
            <span>Cara Menyalin Link Lagu Spotify</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-1 space-y-3 text-xs text-zinc-400 border-t border-white/5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                1
              </span>
              <p className="pt-0.5">
                Buka aplikasi <span className="text-white font-medium">Spotify</span> di ponsel atau desktop Anda.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                2
              </span>
              <p className="pt-0.5">
                Pilih lagu yang ingin diunduh, klik tanda titik tiga (<span className="text-white font-medium">•••</span>) atau tombol <span className="text-white font-medium">Bagikan (Share)</span>.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                3
              </span>
              <p className="pt-0.5">
                Pilih <span className="text-[#1ed760] font-semibold">Salin Tautan (Copy Link)</span>.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#1DB954]/20 text-[#1ed760] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                4
              </span>
              <p className="pt-0.5">
                Kembali ke Mini App ini, klik <span className="text-[#1ed760] font-semibold">Tempel</span> lalu tekan tombol panah untuk mengekstrak lagu full durasi!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
