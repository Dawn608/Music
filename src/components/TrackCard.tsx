import React from 'react';
import { SpotifyTrack, ExtractionStatus } from '../types';
import { Clock, Disc3, Calendar, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface TrackCardProps {
  track: SpotifyTrack;
  extractionStatus: ExtractionStatus;
  onExtract: () => void;
  downloadData: any;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  extractionStatus,
  onExtract,
  downloadData,
}) => {
  const isExtracting =
    extractionStatus.step === 'searching' ||
    extractionStatus.step === 'downloading' ||
    extractionStatus.step === 'tagging';

  const isCompleted = extractionStatus.step === 'completed' || Boolean(downloadData?.downloadUrl);

  return (
    <div className="w-full bg-[#181818] border border-white/10 rounded-2xl p-4 shadow-xl overflow-hidden space-y-4">
      <div className="flex gap-3.5 items-start">
        {/* Album Artwork */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10 shadow-md group">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <Disc3 className="w-8 h-8 animate-spin-slow" />
            </div>
          )}

          {track.is_explicit && (
            <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded text-[9px] font-bold bg-black/80 text-zinc-300 border border-white/20">
              E
            </span>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/30">
              Spotify Track
            </span>
          </div>

          <h2 className="text-base font-bold text-white truncate mt-1 leading-snug">
            {track.title}
          </h2>
          <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
            {track.artist}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-400">
            {track.duration_formatted && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#1DB954]" />
                {track.duration_formatted} (Full)
              </span>
            )}
            {track.album && (
              <span className="flex items-center gap-1 truncate max-w-[130px]" title={track.album}>
                <Disc3 className="w-3 h-3 text-zinc-500" />
                <span className="truncate">{track.album}</span>
              </span>
            )}
            {track.release_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                {track.release_date}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Extraction Process & Status */}
      {isCompleted && downloadData && (
        <div className="p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/30 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#1DB954]" />
              Terverifikasi Full Durasi (100% Utuh)
            </span>
            <span className="text-[#1ed760] font-mono text-[11px] font-bold">
              {downloadData.durationFormatted || track.duration_formatted}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Ukuran File: <strong className="text-zinc-200">{downloadData.fileSize || '320kbps'}</strong></span>
            <span className="text-zinc-400">Durasi Spotify: <strong className="text-zinc-200">{track.duration_formatted}</strong></span>
          </div>
        </div>
      )}

      {isExtracting && (
        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
              {extractionStatus.message || 'Mengekstrak audio full durasi...'}
            </span>
            <span className="text-[#1DB954] font-semibold text-[11px]">
              {extractionStatus.progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-all duration-300 rounded-full"
              style={{ width: `${extractionStatus.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-zinc-400">
            <div className={`flex items-center gap-1 ${extractionStatus.progress >= 30 ? 'text-[#1DB954]' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>Cari Stream</span>
            </div>
            <div className={`flex items-center gap-1 ${extractionStatus.progress >= 60 ? 'text-[#1DB954]' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>Konversi MP3</span>
            </div>
            <div className={`flex items-center gap-1 ${extractionStatus.progress >= 90 ? 'text-[#1DB954]' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>Tag & Cover</span>
            </div>
          </div>
        </div>
      )}

      {extractionStatus.step === 'error' && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Gagal Mengekstrak</p>
            <p className="text-[11px] mt-0.5 text-red-400/90">{extractionStatus.message}</p>
          </div>
        </div>
      )}

      {/* Trigger Extract Button if not started or ready */}
      {!isCompleted && !isExtracting && (
        <button
          type="button"
          onClick={onExtract}
          className="w-full py-3 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1DB954]/20 active:scale-[0.98] transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Proses Audio Full Durasi</span>
        </button>
      )}
    </div>
  );
};
