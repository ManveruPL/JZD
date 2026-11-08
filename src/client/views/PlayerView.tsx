import React, { useState, useEffect } from 'react';
import { GameStage, GameState, Question, Player, Stage3Phase } from '../../types/index.js';
import { TimerState } from '../../types/socket.js';
import { ChanceIndicators } from '../components/ChanceIndicators.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { Send, Zap, Award, Flame, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface PlayerViewProps {
  roomCode: string;
  myPlayerId: string | null;
  gameState: GameState | null;
  timerState: TimerState;
  currentQuestion: Question | null;
  buzzerPlayerId: string | null;
  onSubmitAnswer: (text: string) => void;
  onBuzz: () => void;
  onNominate: (targetPlayerId: string) => void;
  onLeave: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  roomCode,
  myPlayerId,
  gameState,
  timerState,
  currentQuestion,
  buzzerPlayerId,
  onSubmitAnswer,
  onBuzz,
  onNominate,
  onLeave
}) => {
  const [answerInput, setAnswerInput] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const me: Player | undefined = gameState?.players.find((p) => p.id === myPlayerId);
  const stage = gameState?.stage || GameStage.LOBBY;
  const isLobby = stage === GameStage.LOBBY;
  const isEliminated = me?.isEliminated || (me ? me.chances <= 0 : false);

  const isActive = gameState?.activePlayerId === myPlayerId;
  const isBuzzered = buzzerPlayerId === myPlayerId;
  const activePlayer = gameState?.players.find((p) => p.id === gameState?.activePlayerId);

  // Can buzz in Stage 3 Phase 1 when nobody has the floor
  const canBuzz =
    stage === GameStage.STAGE_3 &&
    gameState?.stage3Phase === Stage3Phase.BUZZER &&
    !gameState?.activePlayerId &&
    !buzzerPlayerId &&
    !isEliminated;

  // Haptic feedback when it becomes player's turn
  useEffect(() => {
    if (isActive && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {}
    }
  }, [isActive]);

  // Clear submitted answer when active player or question changes
  useEffect(() => {
    setSubmittedAnswer(null);
    setAnswerInput('');
  }, [currentQuestion?.id, gameState?.activePlayerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerInput.trim() && isActive) {
      sounds.playTick();
      onSubmitAnswer(answerInput.trim());
      setSubmittedAnswer(answerInput.trim());
    }
  };

  const handleBuzzClick = () => {
    if (canBuzz) {
      sounds.playBuzzer();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(200);
        } catch {}
      }
      onBuzz();
    }
  };

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
  };

  return (
    <div className="min-h-screen bg-theme-black text-white flex flex-col justify-between p-4 sm:p-6 select-none max-w-lg mx-auto">
      {/* Top contestant badge */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <button
            onClick={onLeave}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Wyjdź
          </button>
          <span className="font-mono text-xs text-zinc-400">POKÓJ: {roomCode}</span>
        </div>

        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
        </button>
      </header>

      {/* Contestant Status Card */}
      {me && (
        <div
          className={`my-3 p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
            isEliminated
              ? 'bg-zinc-950 border-zinc-800 opacity-60 grayscale'
              : isActive
              ? 'bg-gradient-to-r from-cyan-950/60 to-zinc-900 border-status-active glow-cyan ring-1 ring-cyan-400'
              : isBuzzered
              ? 'bg-gradient-to-r from-amber-950/60 to-zinc-900 border-status-warning glow-amber'
              : 'bg-theme-card border-theme-border'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                isActive ? 'bg-status-active text-black' : 'bg-zinc-800 text-white'
              }`}
            >
              #{me.position || 1}
            </span>
            <div>
              <h2 className="font-bold text-base text-white truncate max-w-[150px]">{me.name}</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>{me.score} pkt</span>
              </div>
            </div>
          </div>

          <ChanceIndicators chances={me.chances} size="md" />
        </div>
      )}

      {/* LOBBY VIEW */}
      {isLobby && (
        <div className="my-auto py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Jesteś w teleturnieju!</h2>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-6">
            Poczekaj, aż Mistrz Gry rozpocznie pierwszy etap rozgrywki.
          </p>

          <div className="bg-theme-card border border-zinc-800 rounded-xl p-4 text-left">
            <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">Gracze w pokoju:</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {gameState?.players.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-900">
                  <span className="font-semibold">{p.name}</span>
                  {p.id === myPlayerId && (
                    <span className="text-emerald-400 font-mono text-[10px]">(TY)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ELIMINATED VIEW */}
      {!isLobby && isEliminated && (
        <div className="my-auto py-8 text-center bg-theme-darker border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-rose-400 mb-2">Koniec szans</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Utraciłeś wszystkie 3 szanse, ale wciąż możesz kibicować pozostałym zawodnikom!
          </p>
          <div className="text-xs font-mono text-zinc-500">
            Twój końcowy wynik: <span className="text-white font-bold">{me?.score || 0} pkt</span>
          </div>
        </div>
      )}

      {/* ACTIVE GAME VIEW */}
      {!isLobby && !isEliminated && (
        <main className="my-auto py-4 flex flex-col justify-center">
          {/* Question card */}
          {currentQuestion && (
            <div className="bg-theme-darker border border-zinc-800 rounded-2xl p-5 mb-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 inline-block mb-3">
                {currentQuestion.category}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                {currentQuestion.question}
              </h3>
            </div>
          )}

          {/* Countdown timer */}
          <div className="my-2">
            <TimerDisplay
              remaining={timerState.remaining}
              duration={timerState.duration}
              isRunning={timerState.isRunning}
              size="normal"
            />
          </div>

          {/* SITUATION 1: IT IS MY TURN TO ANSWER */}
          {isActive && (
            <div className="mt-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border-2 border-status-active glow-cyan text-center mb-3">
                <span className="text-xs uppercase font-extrabold text-status-active tracking-wider animate-pulse block">
                  TWOJA KOLEJ NA ODPOWIEDŹ!
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  Wpisz odpowiedź lub odpowiedz ustnie do Mistrza Gry
                </span>
              </div>

              {submittedAnswer ? (
                <div className="p-4 rounded-xl bg-zinc-900 border border-emerald-500/50 text-center">
                  <span className="text-xs text-zinc-400 block mb-1">Przesłano do Mistrza Gry:</span>
                  <span className="text-base font-bold text-emerald-400">{submittedAnswer}</span>
                  <span className="text-[10px] text-zinc-500 block mt-2">Oczekiwanie na werdykt...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Wpisz swoją odpowiedź..."
                    autoFocus
                    data-testid="input-contestant-answer"
                    className="flex-1 px-4 py-3 rounded-xl bg-theme-card border border-zinc-700 text-white font-medium focus:outline-none focus:border-status-active"
                  />
                  <button
                    type="submit"
                    data-testid="btn-submit-contestant-answer"
                    className="px-5 py-3 rounded-xl bg-status-active text-black font-bold hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1 shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Nomination options in Stage 3 Phase 2 */}
              {stage === GameStage.STAGE_3 && gameState?.stage3Phase === Stage3Phase.NOMINATING && me && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider block mb-2 text-center">
                    Masz prawo wyznaczenia:
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onNominate(me.id)}
                      data-testid="btn-contestant-nominate-self"
                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase text-sm hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      <Flame className="w-4 h-4 fill-black" />
                      Wyznaczam siebie (+20 pkt)
                    </button>

                    {gameState.players
                      .filter((p) => p.id !== me.id && !p.isEliminated)
                      .map((opponent) => (
                        <button
                          key={opponent.id}
                          onClick={() => onNominate(opponent.id)}
                          className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700 flex items-center justify-between"
                        >
                          <span>Wyznacz rywala: #{opponent.position || 1} {opponent.name}</span>
                          <span className="text-zinc-400 font-mono">(+10 pkt)</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SITUATION 2: STAGE 3 BUZZER BUTTON */}
          {canBuzz && (
            <div className="mt-4 text-center animate-fade-in">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 block mb-3 animate-pulse">
                KTO PIERWSZY TEN LEPSZY! ZGŁOŚ SIĘ!
              </span>

              <button
                onClick={handleBuzzClick}
                data-testid="btn-final-buzzer"
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full mx-auto bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white font-black text-2xl uppercase tracking-wider shadow-2xl border-4 border-white/80 active:scale-95 transition-all flex flex-col items-center justify-center glow-rose animate-pulse"
              >
                <Zap className="w-12 h-12 mb-1 fill-white" />
                <span>ZGŁASZAM SIĘ!</span>
              </button>
            </div>
          )}

          {/* SITUATION 3: WAITING FOR ANOTHER PLAYER */}
          {!isActive && !canBuzz && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-1">Aktualnie odpowiada:</span>
              <span className="text-base font-bold text-white">
                {activePlayer ? `Gracz #${activePlayer.position || 1} ${activePlayer.name}` : 'Oczekiwanie na pytanie...'}
              </span>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="pt-3 border-t border-zinc-900 text-center text-[10px] text-zinc-600">
        Jeden z Dziesięciu • Panel zawodnika
      </footer>
    </div>
  );
};
