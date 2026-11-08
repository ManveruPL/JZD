import React from 'react';
import { User, Award, CheckCircle, Flame } from 'lucide-react';
import { ChanceIndicators } from './ChanceIndicators.js';
import { Player } from '../../types/index.js';

interface PlayerCardProps {
  player: Player;
  isActive?: boolean;
  isBuzzered?: boolean;
  canNominate?: boolean;
  onNominate?: (playerId: string) => void;
  showScore?: boolean;
  compact?: boolean;
  hotkeyLabel?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive = false,
  isBuzzered = false,
  canNominate = false,
  onNominate,
  showScore = true,
  compact = false,
  hotkeyLabel
}) => {
  const isEliminated = player.isEliminated || player.chances <= 0;
  const isClickableNominate = canNominate && !isEliminated && !!onNominate;

  const handleClick = () => {
    if (isClickableNominate) {
      onNominate(player.id);
    }
  };

  return (
    <div
      data-testid={`player-card-${player.id}`}
      onClick={handleClick}
      className={`relative rounded-xl border transition-all duration-200 flex flex-col justify-between ${
        compact ? 'p-3' : 'p-4'
      } ${
        isEliminated
          ? 'bg-zinc-950/70 border-zinc-850 opacity-40 grayscale'
          : isActive
          ? 'bg-gradient-to-b from-cyan-950/40 to-theme-darker border-status-active glow-cyan ring-1 ring-cyan-400'
          : isBuzzered
          ? 'bg-gradient-to-b from-amber-950/40 to-theme-darker border-status-warning glow-amber animate-pulse'
          : isClickableNominate
          ? 'bg-theme-card border-cyan-700/60 hover:border-status-active hover:scale-[1.02] cursor-pointer hover:glow-cyan ring-1 ring-cyan-500/30'
          : 'bg-theme-card border-theme-border hover:border-zinc-700'
      }`}
    >
      {/* Top row: Number badge & Chances */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
              isActive
                ? 'bg-status-active text-black'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            #{player.position || 1}
          </span>
          {hotkeyLabel && isClickableNominate && (
            <span
              className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300"
              title={`Klawisz skrótu: ${hotkeyLabel}`}
            >
              [{hotkeyLabel}]
            </span>
          )}
          {player.isConnected !== undefined && (
            <span
              className={`w-2 h-2 rounded-full ${
                player.isConnected ? 'bg-status-success' : 'bg-zinc-600'
              }`}
              title={player.isConnected ? 'Połączony' : 'Rozłączony'}
            />
          )}
        </div>

        <ChanceIndicators chances={player.chances} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Center: Player Name & Status info */}
      <div className="my-2">
        <div className="flex items-center gap-1.5">
          <User className={`w-4 h-4 ${isActive ? 'text-status-active' : 'text-zinc-500'}`} />
          <h4
            className={`font-semibold truncate text-sm sm:text-base ${
              isActive ? 'text-white font-bold' : 'text-zinc-200'
            }`}
            title={player.name}
          >
            {player.name}
          </h4>
        </div>

        {/* Stage 1 question progress */}
        {player.stage1QuestionsAnswered !== undefined && player.stage1QuestionsAnswered > 0 && !isEliminated && (
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Etap 1: {player.stage1QuestionsAnswered}/2 pytań</span>
          </div>
        )}
      </div>

      {/* Bottom row: Score & Action button */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 mt-1">
        {showScore ? (
          <div className="flex items-center gap-1 text-xs font-mono">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-sm text-zinc-100">{player.score}</span>
            <span className="text-zinc-500 text-[10px]">pkt</span>
          </div>
        ) : <div />}

        {canNominate && !isEliminated && onNominate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNominate(player.id);
            }}
            data-testid={`btn-nominate-${player.id}`}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-status-active text-black hover:bg-cyan-300 transition-colors flex items-center gap-1 shadow-sm"
          >
            <Flame className="w-3 h-3" />
            Wyznacz
          </button>
        )}
      </div>
    </div>
  );
};
