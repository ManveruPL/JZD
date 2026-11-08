import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Clock } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface TimerDisplayProps {
  remaining?: number;
  duration?: number;
  remainingSeconds?: number;
  totalSeconds?: number;
  isRunning: boolean;
  showControls?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  onAddSeconds?: (seconds: number) => void;
  size?: 'normal' | 'large';
  label?: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remaining,
  duration,
  remainingSeconds: rSec,
  totalSeconds: tSec,
  isRunning,
  showControls = false,
  onPause,
  onResume,
  onReset,
  onAddSeconds,
  size = 'normal',
  label = 'CZAS NA ODPOWIEDŹ'
}) => {
  const currentSeconds = remaining !== undefined ? remaining : rSec !== undefined ? rSec : 0;
  const maxSeconds = duration !== undefined ? duration : tSec !== undefined ? tSec : 30;
  const percentage = maxSeconds > 0 ? Math.max(0, Math.min(100, (currentSeconds / maxSeconds) * 100)) : 0;
  const isUrgent = currentSeconds <= 5 && currentSeconds > 0;
  const isWarning = currentSeconds <= 10 && currentSeconds > 5;
  const lastSecondRef = useRef(currentSeconds);

  useEffect(() => {
    if (isRunning && currentSeconds !== lastSecondRef.current) {
      if (currentSeconds <= 5 && currentSeconds > 0) {
        sounds.playTick(true);
      } else if (currentSeconds <= 10 && currentSeconds > 0) {
        sounds.playTick(false);
      }
      lastSecondRef.current = currentSeconds;
    }
  }, [currentSeconds, isRunning]);

  const colorClass = isUrgent
    ? 'text-status-danger border-status-danger glow-rose'
    : isWarning
    ? 'text-status-warning border-status-warning glow-amber'
    : 'text-status-active border-status-active glow-cyan';

  const barColorClass = isUrgent
    ? 'bg-status-danger'
    : isWarning
    ? 'bg-status-warning'
    : 'bg-status-active';

  return (
    <div className="flex flex-col items-center select-none">
      {label && (
        <span className="text-xs uppercase tracking-widest font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {label}
        </span>
      )}

      {/* Main Counter Display */}
      <div
        data-testid="timer-display"
        className={`relative flex items-center justify-center font-mono font-bold rounded-2xl border-2 bg-theme-darker px-8 py-3 transition-all duration-200 ${colorClass} ${
          isUrgent ? 'animate-pulse' : ''
        } ${size === 'large' ? 'text-6xl min-w-[200px]' : 'text-4xl min-w-[150px]'}`}
      >
        <span>{currentSeconds}</span>
        <span className="text-xl ml-1 text-zinc-500 font-normal">s</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs mt-3 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <div
          className={`h-full transition-all duration-300 ease-linear rounded-full ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Host Controls */}
      {showControls && (
        <div className="flex items-center gap-2 mt-3">
          {isRunning ? (
            <button
              onClick={onPause}
              data-testid="btn-pause-timer"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors border border-zinc-700 text-xs flex items-center gap-1"
              title="Zatrzymaj timer"
            >
              <Pause className="w-3.5 h-3.5" /> Pauza
            </button>
          ) : (
            <button
              onClick={onResume}
              data-testid="btn-resume-timer"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 transition-colors border border-zinc-700 text-xs flex items-center gap-1"
              title="Wznów timer"
            >
              <Play className="w-3.5 h-3.5" /> Wznów
            </button>
          )}

          <button
            onClick={() => onAddSeconds?.(5)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 hover:text-cyan-300 transition-colors border border-zinc-700 text-xs flex items-center gap-1"
            title="Dodaj 5 sekund"
          >
            <Plus className="w-3.5 h-3.5" /> +5s
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 text-xs flex items-center gap-1"
            title="Resetuj do wartości początkowej"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      )}
    </div>
  );
};
