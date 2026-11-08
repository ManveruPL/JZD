import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Award, Star } from 'lucide-react';
import { Player } from '../../types/index.js';
import { sounds } from '../utils/sound.js';

interface WinnerCelebrationProps {
  players: Player[];
  onNewGame: () => void;
  onHome: () => void;
}

export const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  players,
  onNewGame,
  onHome
}) => {
  // Sort players by score descending
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  useEffect(() => {
    sounds.playFanfare();

    // Fire confetti bursts
    const end = Date.now() + 3000;
    const colors = ['#00e5ff', '#10b981', '#f59e0b', '#ffffff'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-theme-darker border-2 border-amber-500/60 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden text-center">
        {/* Glow backdrop */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-4 animate-bounce">
          <Trophy className="w-12 h-12" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide uppercase">
          Koniec Wielkiego Finału!
        </h2>
        <p className="text-zinc-400 mt-2 text-sm sm:text-base">
          Zwycięzcą teleturnieju zostaje:
        </p>

        {/* Winner Highlight Banner */}
        {winner && (
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-500/20 border border-amber-500/40 glow-amber inline-block w-full">
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
              <Star className="w-5 h-5 fill-amber-400" />
              <span className="text-xs uppercase tracking-widest font-bold">Mistrz JZD</span>
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{winner.name}</h3>
            <div className="mt-2 text-xl font-mono text-amber-300 font-bold">
              {winner.score} <span className="text-sm font-normal text-zinc-400">punktów</span>
            </div>
          </div>
        )}

        {/* Final Standings Table */}
        <div className="bg-theme-card/80 rounded-xl border border-zinc-800 p-4 mb-6">
          <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-3 text-left flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> Tabela wyników finału
          </h4>
          <div className="space-y-2">
            {sorted.slice(0, 5).map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-black'
                        : idx === 1
                        ? 'bg-zinc-300 text-black'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-zinc-200">{player.name}</span>
                </div>
                <div className="font-mono font-bold text-zinc-300">
                  {player.score} <span className="text-xs text-zinc-500 font-normal">pkt</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onNewGame}
            data-testid="btn-new-game"
            className="px-6 py-3 rounded-xl bg-status-active text-black font-bold hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" /> Zagraj ponownie
          </button>
          <button
            onClick={onHome}
            data-testid="btn-home"
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors flex items-center justify-center gap-2 border border-zinc-700"
          >
            <Home className="w-4 h-4" /> Menu główne
          </button>
        </div>
      </div>
    </div>
  );
};
