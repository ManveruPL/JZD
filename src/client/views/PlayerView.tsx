import React, { useState, useEffect } from 'react';
import { GameStage, GameState, Question, Player, Stage3Phase } from '../../types/index.js';
import { TimerState, SubmittedAnswer } from '../../types/socket.js';
import { ChanceIndicators } from '../components/ChanceIndicators.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { Send, Zap, Award, Flame, Volume2, VolumeX, Crown, Trophy, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface PlayerViewProps {
  roomCode: string;
  myPlayerId: string | null;
  gameState: GameState | null;
  timerState: TimerState;
  currentQuestion: Question | null;
  buzzerPlayerId: string | null;
  submittedAnswer?: SubmittedAnswer | null;
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
  submittedAnswer: serverSubmittedAnswer,
  onSubmitAnswer,
  onBuzz,
  onNominate,
  onLeave
}) => {
  const [answerInput, setAnswerInput] = useState('');
  const [localSubmittedAnswer, setLocalSubmittedAnswer] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const me: Player | undefined = gameState?.players.find((p) => p.id === myPlayerId);
  const stage = gameState?.stage || GameStage.LOBBY;
  const isLobby = stage === GameStage.LOBBY;
  const isFinished = stage === GameStage.FINISHED;
  const isEliminated = me?.isEliminated || (me ? me.chances <= 0 : false);

  const isActive = gameState?.activePlayerId === myPlayerId;
  const isBuzzered = buzzerPlayerId === myPlayerId;
  const activePlayer = gameState?.players.find((p) => p.id === gameState?.activePlayerId);
  const buzzeredPlayer = gameState?.players.find((p) => p.id === buzzerPlayerId);

  // Nomination permissions
  const isStage2Nomination =
    stage === GameStage.STAGE_2 &&
    !gameState?.activePlayerId &&
    gameState?.nominationHolderId === myPlayerId;

  const isStage3Nomination =
    stage === GameStage.STAGE_3 &&
    gameState?.stage3Phase === Stage3Phase.NOMINATING &&
    gameState?.nominationHolderId === myPlayerId;

  const isNominator = (isStage2Nomination || isStage3Nomination) && !isEliminated;

  const otherNominator =
    !isNominator &&
    ((stage === GameStage.STAGE_2 && !gameState?.activePlayerId && !!gameState?.nominationHolderId) ||
      (stage === GameStage.STAGE_3 && gameState?.stage3Phase === Stage3Phase.NOMINATING))
      ? gameState?.players.find((p) => p.id === gameState?.nominationHolderId)
      : null;

  // Can buzz in Stage 3 Phase 1 when nobody has the floor
  const canBuzz =
    stage === GameStage.STAGE_3 &&
    gameState?.stage3Phase === Stage3Phase.BUZZER &&
    !gameState?.activePlayerId &&
    !buzzerPlayerId &&
    !isEliminated;

  // Effective submitted answer (from server or local)
  const effectiveSubmittedAnswer =
    (serverSubmittedAnswer?.playerId === myPlayerId ? serverSubmittedAnswer.answerText : null) ||
    localSubmittedAnswer;

  // Haptic feedback when it becomes player's turn or buzzer is won
  useEffect(() => {
    if ((isActive || isBuzzered || isNominator) && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {}
    }
  }, [isActive, isBuzzered, isNominator]);

  // Clear submitted answer when active player or question changes
  useEffect(() => {
    setLocalSubmittedAnswer(null);
    setAnswerInput('');
  }, [currentQuestion?.id, gameState?.activePlayerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerInput.trim() && isActive) {
      sounds.playTick();
      const text = answerInput.trim();
      onSubmitAnswer(text);
      setLocalSubmittedAnswer(text);
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
      {/* Top contestant header */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <button
            onClick={onLeave}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Wyjdź
          </button>
          <span className="font-mono text-xs text-zinc-400">POKÓJ: {roomCode}</span>
        </div>

        <div className="flex items-center gap-2">
          {stage === GameStage.STAGE_1 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 border border-emerald-600 text-emerald-400">
              Etap 1
            </span>
          )}
          {stage === GameStage.STAGE_2 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 border border-cyan-600 text-cyan-400">
              Etap 2
            </span>
          )}
          {stage === GameStage.STAGE_3 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 border border-amber-600 text-amber-400">
              Finał
            </span>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
            title="Dźwięk"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* Contestant Status Card */}
      {me && (
        <div
          data-testid="player-my-status-card"
          className={`my-3 p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
            isEliminated
              ? 'bg-zinc-950 border-zinc-800 opacity-60 grayscale'
              : isActive
              ? 'bg-gradient-to-r from-cyan-950/60 to-zinc-900 border-status-active glow-cyan ring-1 ring-cyan-400'
              : isBuzzered
              ? 'bg-gradient-to-r from-amber-950/60 to-zinc-900 border-status-warning glow-amber'
              : isNominator
              ? 'bg-gradient-to-r from-amber-950/60 to-zinc-900 border-amber-400 glow-amber ring-1 ring-amber-400'
              : 'bg-theme-card border-theme-border'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                isActive
                  ? 'bg-status-active text-black'
                  : isNominator
                  ? 'bg-amber-400 text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              #{me.position || 1}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-base text-white truncate max-w-[150px]">{me.name}</h2>
                <span className="text-[10px] font-mono text-zinc-500">(TY)</span>
              </div>
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
        <div className="my-auto py-10 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Jesteś w teleturnieju!</h2>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-6">
            Poczekaj, aż Mistrz Gry rozpocznie pierwszy etap rozgrywki.
          </p>

          <div className="bg-theme-card border border-zinc-800 rounded-xl p-4 text-left">
            <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">Zawodnicy w pokoju:</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {gameState?.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between text-xs py-1.5 px-3 rounded ${
                    p.id === myPlayerId ? 'bg-cyan-950/50 border border-cyan-800 text-cyan-200' : 'bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-500">#{p.position || 1}</span>
                    <span className="font-semibold">{p.name}</span>
                  </div>
                  {p.id === myPlayerId && (
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">(TY)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FINISHED / GAME OVER VIEW */}
      {isFinished && (
        <div className="my-auto py-8 text-center bg-theme-darker border-2 border-amber-500/60 rounded-3xl p-6 glow-amber animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
            Koniec Teleturnieju!
          </h2>
          {gameState?.winner ? (
            <div className="my-4 p-4 rounded-2xl bg-zinc-900 border border-amber-500/40">
              <span className="text-xs uppercase font-bold text-amber-400 tracking-widest block mb-1">
                Zwycięzca
              </span>
              <div className="text-2xl font-black text-white flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
                <span>{gameState.winner.name}</span>
              </div>
              <span className="text-sm font-mono text-zinc-300 block mt-1">
                Wynik końcowy: <strong className="text-amber-400">{gameState.winner.score} pkt</strong>
              </span>
            </div>
          ) : null}

          <div className="text-xs font-mono text-zinc-400 mt-4">
            Twój wynik: <strong className="text-white">{me?.score || 0} pkt</strong>
          </div>
          <button
            onClick={onLeave}
            className="mt-6 py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors border border-zinc-700"
          >
            Powrót do menu głównego
          </button>
        </div>
      )}

      {/* ELIMINATED VIEW */}
      {!isLobby && !isFinished && isEliminated && (
        <div className="my-auto py-8 text-center bg-theme-darker border border-zinc-800 rounded-2xl p-6 animate-fade-in">
          <h3 className="text-xl font-bold text-rose-400 mb-2">Koniec szans</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Utraciłeś wszystkie szanse, ale wciąż możesz śledzić przebieg gry na żywo!
          </p>
          <div className="text-xs font-mono text-zinc-400">
            Twój końcowy wynik: <span className="text-white font-bold">{me?.score || 0} pkt</span>
          </div>

          {currentQuestion && (
            <div className="mt-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Aktualne pytanie ({currentQuestion.category}):
              </span>
              <p className="text-sm font-medium text-zinc-200">{currentQuestion.question}</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE GAME VIEW */}
      {!isLobby && !isFinished && !isEliminated && (
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
              label={stage === GameStage.STAGE_3 && !activePlayer ? 'CZAS NA ZGŁOSZENIE (BUZZER)' : 'CZAS NA ODPOWIEDŹ'}
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
                  Wpisz odpowiedź na telefonie lub odpowiedz ustnie
                </span>
              </div>

              {effectiveSubmittedAnswer ? (
                <div
                  data-testid="player-submitted-confirmation"
                  className="p-4 rounded-xl bg-zinc-900 border border-emerald-500/50 text-center animate-fade-in"
                >
                  <span className="text-xs text-zinc-400 block mb-1">Przesłano do Mistrza Gry:</span>
                  <div className="text-lg font-bold text-emerald-400 py-1">
                    "{effectiveSubmittedAnswer}"
                  </div>
                  <span className="text-xs text-zinc-400 mt-2 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-active animate-ping" />
                    Mistrz Gry sprawdza odpowiedź...
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Wpisz odpowiedź..."
                    autoFocus
                    autoCapitalize="sentences"
                    autoCorrect="off"
                    spellCheck={false}
                    data-testid="input-contestant-answer"
                    className="flex-1 px-4 py-3.5 rounded-xl bg-theme-card border border-zinc-700 text-white font-medium focus:outline-none focus:border-status-active text-base sm:text-lg"
                  />
                  <button
                    type="submit"
                    data-testid="btn-submit-contestant-answer"
                    className="px-5 py-3.5 rounded-xl bg-status-active text-black font-extrabold hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1 shadow-md active:scale-95"
                    title="Wyślij odpowiedź"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SITUATION 2: I HAVE THE RIGHT TO NOMINATE (Stage 2 or Stage 3) */}
          {isNominator && (
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 to-zinc-900 border-2 border-amber-400 glow-amber text-center animate-fade-in">
              <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider block mb-1 animate-pulse">
                TWOJA KOLEJ NA WYZNACZENIE!
              </span>
              <p className="text-xs text-zinc-300 mb-4">
                {isStage3Nomination
                  ? 'Finał: weź pytanie na siebie (+20 pkt) lub wskaż rywala (+10 pkt):'
                  : 'Wskaż zawodnika, który ma odpowiedzieć na kolejne pytanie:'}
              </p>

              {/* Stage 3: Self nomination button */}
              {isStage3Nomination && me && (
                <button
                  onClick={() => onNominate(me.id)}
                  data-testid="btn-contestant-nominate-self"
                  className="w-full mb-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black uppercase text-sm transition-all flex items-center justify-center gap-2 shadow-xl glow-amber active:scale-95"
                >
                  <Flame className="w-5 h-5 fill-black" />
                  <span>BIORĘ NA SIEBIE (+20 PKT)</span>
                </button>
              )}

              {/* Rivals list */}
              <div className="space-y-2">
                {gameState?.players
                  .filter((p) => p.id !== me?.id && !p.isEliminated && p.chances > 0)
                  .map((opponent) => (
                    <button
                      key={opponent.id}
                      onClick={() => onNominate(opponent.id)}
                      data-testid={`btn-contestant-nominate-${opponent.id}`}
                      className="w-full p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-white transition-all border border-zinc-700 hover:border-amber-400/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-zinc-900 font-mono text-xs font-bold flex items-center justify-center text-amber-400">
                          #{opponent.position || 1}
                        </span>
                        <div className="text-left">
                          <span className="font-bold text-sm block">{opponent.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{opponent.score} pkt</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ChanceIndicators chances={opponent.chances} size="sm" />
                        <span className="text-xs font-bold text-amber-400 font-mono ml-1">
                          {isStage3Nomination ? '+10 pkt' : 'Wskaż →'}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* SITUATION 3: STAGE 3 BUZZER BUTTON */}
          {canBuzz && (
            <div className="mt-6 text-center animate-fade-in">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 block mb-3 animate-pulse">
                KTO PIERWSZY TEN LEPSZY! ZGŁOŚ SIĘ!
              </span>

              <button
                onClick={handleBuzzClick}
                data-testid="btn-final-buzzer"
                style={{ touchAction: 'manipulation' }}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full mx-auto bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white font-black text-2xl uppercase tracking-wider shadow-2xl border-4 border-white/80 active:scale-95 transition-all flex flex-col items-center justify-center glow-rose animate-pulse select-none cursor-pointer"
              >
                <Zap className="w-12 h-12 mb-1 fill-white" />
                <span>ZGŁASZAM SIĘ!</span>
              </button>
            </div>
          )}

          {/* SITUATION 4: WAITING FOR ANOTHER CONTESTANT */}
          {!isActive && !isNominator && !canBuzz && (
            <div className="mt-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center animate-fade-in">
              {otherNominator ? (
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Faza wyznaczania:</span>
                  <span className="text-base font-bold text-amber-400">
                    Zawodnik #{otherNominator.position || 1} {otherNominator.name} wybiera rywala...
                  </span>
                </div>
              ) : buzzeredPlayer ? (
                <div>
                  <span className="text-xs text-amber-400 uppercase font-bold tracking-wider block mb-1 animate-pulse">
                    Zgłoszenie buzzerem:
                  </span>
                  <span className="text-lg font-black text-white">
                    #{buzzeredPlayer.position || 1} {buzzeredPlayer.name}
                  </span>
                  <span className="text-xs text-zinc-400 block mt-1">Czas na odpowiedź...</span>
                </div>
              ) : activePlayer ? (
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Aktualnie odpowiada:</span>
                  <span className="text-base font-bold text-white">
                    Stanowisko #{activePlayer.position || 1} {activePlayer.name}
                  </span>
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">Oczekiwanie na kolejne pytanie...</div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="pt-3 border-t border-zinc-900 text-center text-[10px] text-zinc-600">
        Jeden z Dziesięciu • Panel zawodnika online
      </footer>
    </div>
  );
};
