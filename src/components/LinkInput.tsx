import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface LinkInputProps {
  url: string;
  setUrl: (url: string) => void;
  onResolve: () => void;
  isLoading: boolean;
}

const SAMPLE_TRACKS = [
  { name: 'Rick Astley', url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' },
  { name: 'Coldplay - Yellow', url: 'https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg' },
  { name: 'Queen - Bohemian', url: 'https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J' },
];

export const LinkInput: React.FC<LinkInputProps> = ({
  url,
  setUrl,
  onResolve,
  isLoading,
}) => {
  const [pasteFeedback, setPasteFeedback] = useState(false);

  const handlePaste = async () => {
    triggerHaptic('light');
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setPasteFeedback(true);
        setTimeout(() => setPasteFeedback(false), 1200);
      }
    } catch {
      // Fallback
    }
  };

  const handleClear = () => {
    triggerHaptic('light');
    setUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    triggerHaptic('medium');
    onResolve();
  };

  return (
    <div className="w-full space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-[#181818] border border-white/10 focus-within:border-[#1DB954] rounded-2xl transition-all shadow-inner overflow-hidden">
          <div className="pl-3.5 pr-2 text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Tempel tautan lagu Spotify..."
            disabled={isLoading}
            className="w-full py-3.5 pr-2 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />

          <div className="flex items-center gap-1 pr-2">
            {url ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Hapus"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 border border-white/10 active:scale-95 transition"
              >
                <Clipboard className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>{pasteFeedback ? 'Ditempel!' : 'Tempel'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!url.trim() || isLoading}
              className="flex items-center justify-center p-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-40 disabled:hover:bg-[#1DB954] text-black font-semibold transition active:scale-95 shadow-md shadow-[#1DB954]/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <ArrowRight className="w-4 h-4 text-black" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Sample Links */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap pl-0.5">
          Contoh:
        </span>
        {SAMPLE_TRACKS.map((sample, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setUrl(sample.url);
            }}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-[11px] whitespace-nowrap active:scale-95 transition"
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
};
