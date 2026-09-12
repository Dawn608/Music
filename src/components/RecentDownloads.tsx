import React from 'react';
import { RecentDownloadItem } from '../types';
import { History, Trash2, Download, Play, Music } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface RecentDownloadsProps {
  items: RecentDownloadItem[];
  onSelectTrack: (item: RecentDownloadItem) => void;
  onClear: () => void;
}

export const RecentDownloads: React.FC<RecentDownloadsProps> = ({
  items,
  onSelectTrack,
  onClear,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="w-full space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          <History className="w-3.5 h-3.5 text-[#1DB954]" />
          <span>Riwayat Unduhan ({items.length})</span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClear();
          }}
          className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            onClick={() => {
              triggerHaptic('light');
              onSelectTrack(item);
            }}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 cursor-pointer active:scale-[0.99] transition group"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10">
                {item.track.cover_url ? (
                  <img
                    src={item.track.cover_url}
                    alt={item.track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Music className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate group-hover:text-[#1ed760] transition">
                  {item.track.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {item.track.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {item.fileSize && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {item.fileSize}
                </span>
              )}
              <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-[#1DB954] flex items-center justify-center text-zinc-400 group-hover:text-black transition">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
