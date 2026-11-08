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
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive = false,
  isBuzzered = false,
  canNominate = false,
  onNominate,
  showScore = true,
  compact = false
}) => {
  const isEliminated = player.isEliminated || player.chances <= 0;

  return (
    <div
      data-testid={`player-card-${player.id}`}
      className={`relative rounded-xl border transition-all duration-300 flex flex-col justify-between ${
        compact ? 'p-3' : 'p-4'
      } ${
        isEliminated
          ? 'bg-zinc-950/70 border-zinc-850 opacity-40 grayscale'
          : isActive
          ? 'bg-gradient-to-b from-cyan-950/40 to-theme-darker border-status-active glow-cyan ring-1 ring-cyan-400'
          : isBuzzered
          ? 'bg-gradient-to-b from-amber-950/40 to-theme-darker border-status-warning glow-amber animate-pulse'
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
            onClick={() => onNominate(player.id)}
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
