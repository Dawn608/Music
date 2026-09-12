import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface AudioPlayerProps {
  streamUrl: string;
  title: string;
  artist: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  streamUrl,
  title,
  artist,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [streamUrl]);

  const togglePlay = () => {
    triggerHaptic('light');
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    triggerHaptic('light');
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRestart = () => {
    triggerHaptic('light');
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full p-4 rounded-2xl bg-[#141414] border border-white/10 space-y-3 shadow-lg">
      <audio ref={audioRef} src={streamUrl} preload="metadata" />

      <div className="flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1ed760]">
              In-App Preview Player
            </span>
          </div>
          <p className="text-xs text-white font-semibold truncate mt-0.5">
            {title}
          </p>
        </div>

        {/* Playing Waveform Graphic */}
        <div className="flex items-end gap-0.5 h-4">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-[#1DB954] transition-all duration-200 ${
                isPlaying
                  ? 'animate-pulse'
                  : 'h-1.5 opacity-40'
              }`}
              style={{
                height: isPlaying ? `${Math.sin(i * 1.2 + 1) * 8 + 10}px` : '4px',
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
        />
        <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleRestart}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
          title="Ulangi dari awal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/25 active:scale-90 transition"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleMute}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
