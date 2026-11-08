import React, { useState } from 'react';
import { GameStage, GameState, Question, Stage3Phase } from '../../types/index.js';
import { TimerState, SubmittedAnswer } from '../../types/socket.js';
import { ChanceIndicators } from '../components/ChanceIndicators.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface TvViewProps {
  roomCode: string;
  gameState: GameState | null;
  timerState: TimerState;
  currentQuestion: Question | null;
  buzzerPlayerId: string | null;
  submittedAnswer?: SubmittedAnswer | null;
}

export const TvView: React.FC<TvViewProps> = ({
  roomCode,
  gameState,
  timerState,
  currentQuestion,
  buzzerPlayerId,
  submittedAnswer
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const stage = gameState?.stage || 'LOBBY';
  const activePlayer = gameState?.players.find((p) => p.id === gameState?.activePlayerId);
  const buzzeredPlayer = gameState?.players.find((p) => p.id === buzzerPlayerId);
  const nominator =
    !activePlayer &&
    ((stage === GameStage.STAGE_2 && !!gameState?.nominationHolderId) ||
      (stage === GameStage.STAGE_3 && gameState?.stage3Phase === Stage3Phase.NOMINATING))
      ? gameState?.players.find((p) => p.id === gameState?.nominationHolderId)
      : null;

  return (
    <div className="min-h-screen bg-theme-black text-white studio-grid flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Top TV Studio Header */}
      <header className="flex items-center justify-between pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white text-black font-black flex items-center justify-center text-lg shadow-lg">
            1/10
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white">
              Jeden z Dziesięciu
            </h1>
            <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
              Studio Teleturniejowe • Kod: {roomCode}
            </span>
          </div>
        </div>

        {/* Stage Badge */}
        <div className="flex items-center gap-3">
          {stage === GameStage.STAGE_1 && (
            <div className="px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold text-sm tracking-wide uppercase">
              Etap 1: Eliminacje
            </div>
          )}
          {stage === GameStage.STAGE_2 && (
            <div className="px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500 text-cyan-300 font-bold text-sm tracking-wide uppercase">
              Etap 2: Wskazywanie
            </div>
          )}
          {stage === GameStage.STAGE_3 && (
            <div className="px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500 text-amber-300 font-bold text-sm tracking-wide uppercase">
              Etap 3: Wielki Finał ({gameState ? gameState.finalQuestionsTotal - gameState.finalQuestionsRemaining : 0}/40)
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            title="Dźwięk"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            title="Pełny ekran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Center Screen */}
      <main className="my-auto py-8 max-w-5xl w-full mx-auto text-center flex flex-col items-center">
        {stage === GameStage.LOBBY ? (
          <div className="py-12">
            <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-4">
              Teleturniej rozpocznie się za chwilę
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto mb-8">
              Prowadzący przygotowuje stanowiska dla zawodników...
            </p>
            <div className="inline-block px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 font-mono text-lg text-status-active">
              PIN POKOJU: {roomCode}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Active Contestant Spotlight */}
            <div className="mb-4 h-12 flex items-center justify-center">
              {activePlayer ? (
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-status-active/10 border-2 border-status-active text-status-active font-black text-lg tracking-wider uppercase glow-cyan animate-pulse">
                  <span>Odpowiada: Stanowisko #{activePlayer.position || 1} {activePlayer.name}</span>
                </div>
              ) : buzzeredPlayer ? (
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-400 font-black text-lg tracking-wider uppercase glow-amber animate-pulse">
                  <span>Zgłoszenie: #{buzzeredPlayer.position || 1} {buzzeredPlayer.name}</span>
                </div>
              ) : nominator ? (
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-400 font-black text-lg tracking-wider uppercase glow-amber animate-pulse">
                  <span>Wskazuje rywala: Stanowisko #{nominator.position || 1} {nominator.name}</span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">
                  Oczekiwanie na zgłoszenie
                </span>
              )}
            </div>

            {/* Central Question Display */}
            <div className="bg-theme-darker/90 border-2 border-zinc-800 rounded-3xl p-8 sm:p-12 mb-6 shadow-2xl relative">
              <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 inline-block mb-4">
                Kategoria: {currentQuestion?.category || 'Wiedza ogólna'}
              </span>

              <h2
                data-testid="tv-question-text"
                className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-normal"
              >
                {currentQuestion?.question || 'Pytanie teleturnieju...'}
              </h2>

              {submittedAnswer && (
                <div className="mt-6 inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold text-xs sm:text-sm tracking-wide animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Odpowiedź zawodnika ({submittedAnswer.playerName}) wpłynęła do Mistrza Gry...</span>
                </div>
              )}
            </div>

            {/* TV Countdown Timer */}
            <TimerDisplay
              remaining={timerState.remaining}
              duration={timerState.duration}
              isRunning={timerState.isRunning}
              size="large"
              label={stage === GameStage.STAGE_3 && !activePlayer ? 'CZAS NA ZGŁOSZENIE (BUZZER)' : 'CZAS NA ODPOWIEDŹ'}
            />
          </div>
        )}
      </main>

      {/* Contestant Stations Bar at Bottom */}
      <footer className="pt-6 border-t border-zinc-900">
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 max-w-7xl mx-auto">
          {gameState?.players.map((p, idx) => {
            const isElim = p.isEliminated || p.chances <= 0;
            const isAct = p.id === gameState.activePlayerId;

            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border text-center transition-all duration-300 ${
                  isElim
                    ? 'bg-zinc-950/60 border-zinc-900 opacity-30 grayscale'
                    : isAct
                    ? 'bg-cyan-950/50 border-status-active glow-cyan ring-1 ring-cyan-400'
                    : 'bg-theme-card border-theme-border'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className={`font-bold ${isAct ? 'text-status-active' : 'text-zinc-400'}`}>
                    #{p.position || idx + 1}
                  </span>
                  <span className="font-bold text-zinc-300">{p.score} pkt</span>
                </div>

                <div className="font-semibold text-xs text-white truncate mb-1.5" title={p.name}>
                  {p.name}
                </div>

                <div className="flex justify-center">
                  <ChanceIndicators chances={p.chances} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
