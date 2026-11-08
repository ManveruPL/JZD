import React, { useState, useEffect } from 'react';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Share2,
  Tv,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { GameConfig, GameStage, GameState, Player, Question, Stage3Phase } from '../../types/index.js';
import { TimerState } from '../../types/socket.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { PlayerCard } from '../components/PlayerCard.js';
import { WinnerCelebration } from '../components/WinnerCelebration.js';
import { sounds } from '../utils/sound.js';

interface HostViewProps {
  roomCode: string;
  isPartyMode?: boolean;
  gameState: GameState | null;
  timerState: TimerState;
  currentQuestion: Question | null;
  buzzerPlayerId: string | null;
  onStartGame: (categories?: string[], partyPlayers?: string[]) => void;
  onVerdict: (isCorrect: boolean) => void;
  onNominate: (targetPlayerId: string) => void;
  onNextQuestion: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: (seconds?: number) => void;
  onAddSeconds: (seconds: number) => void;
  onManualAdjust: (playerId: string, chancesDelta: number, scoreDelta: number) => void;
  onLeave: () => void;
}

export const HostView: React.FC<HostViewProps> = ({
  roomCode,
  isPartyMode = false,
  gameState,
  timerState,
  currentQuestion,
  buzzerPlayerId,
  onStartGame,
  onVerdict,
  onNominate,
  onNextQuestion,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onAddSeconds,
  onManualAdjust,
  onLeave
}) => {
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  // Local party setup state
  const [partyPlayers, setPartyPlayers] = useState<string[]>([
    'Gracz 1', 'Gracz 2', 'Gracz 3', 'Gracz 4', 'Gracz 5',
    'Gracz 6', 'Gracz 7', 'Gracz 8', 'Gracz 9', 'Gracz 10'
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?join=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenTv = () => {
    window.open(`/?tv=${roomCode}`, '_blank');
  };

  const handleAddPartyPlayer = () => {
    if (newPlayerName.trim() && partyPlayers.length < 15) {
      setPartyPlayers([...partyPlayers, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const handleRemovePartyPlayer = (index: number) => {
    if (partyPlayers.length > 4) {
      setPartyPlayers(partyPlayers.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePartyPlayer = (index: number, name: string) => {
    const updated = [...partyPlayers];
    updated[index] = name;
    setPartyPlayers(updated);
  };

  // Check stage states
  const stage = gameState?.stage || 'LOBBY';
  const isLobby = stage === 'LOBBY';
  const isFinished = stage === 'FINISHED';
  const activePlayer = gameState?.players.find((p) => p.id === gameState?.activePlayerId);
  const buzzeredPlayer = gameState?.players.find((p) => p.id === buzzerPlayerId);

  // Check if current phase requires player nomination
  const isNominationPhase =
    !isLobby &&
    !isFinished &&
    ((stage === GameStage.STAGE_2 && !gameState?.activePlayerId && !!gameState?.nominationHolderId) ||
      (stage === GameStage.STAGE_3 && gameState?.stage3Phase === Stage3Phase.NOMINATING));

  // Helper to map player positions to keyboard hotkeys
  const getHotkeyForPosition = (position?: number): string | undefined => {
    if (!position) return undefined;
    if (position >= 1 && position <= 9) return String(position);
    if (position === 10) return '0';
    const letters = ['Q', 'W', 'E', 'R', 'T'];
    if (position >= 11 && position <= 15) return letters[position - 11];
    return undefined;
  };

  // Keyboard shortcuts for Mistrz Gry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (!isLobby && !isFinished) {
        // Space: Start / Pause Timer in any phase
        if (e.key === ' ') {
          e.preventDefault();
          if (timerState.isRunning) {
            onPauseTimer();
          } else {
            onResumeTimer();
          }
          return;
        }

        // Nomination Phase Shortcuts
        if (isNominationPhase) {
          // 'S' -> nominate self in Stage 3
          if (e.key.toLowerCase() === 's' && stage === GameStage.STAGE_3 && gameState?.nominationHolderId) {
            e.preventDefault();
            sounds.playTick();
            onNominate(gameState.nominationHolderId);
            return;
          }

          // '1' to '9' -> players with position 1-9
          if (e.key >= '1' && e.key <= '9') {
            const targetPos = Number(e.key);
            const targetP = gameState?.players.find((p) => (p.position || 0) === targetPos);
            if (targetP && !targetP.isEliminated) {
              // In Stage 2 cannot nominate self
              if (stage === GameStage.STAGE_2 && targetP.id === gameState?.nominationHolderId) return;
              e.preventDefault();
              sounds.playTick();
              onNominate(targetP.id);
              return;
            }
          }

          // '0' -> player with position 10
          if (e.key === '0') {
            const targetP = gameState?.players.find((p) => (p.position || 0) === 10);
            if (targetP && !targetP.isEliminated) {
              if (stage === GameStage.STAGE_2 && targetP.id === gameState?.nominationHolderId) return;
              e.preventDefault();
              sounds.playTick();
              onNominate(targetP.id);
              return;
            }
          }

          // 'q', 'w', 'e', 'r', 't' -> players with position 11-15
          const letterIdx = ['q', 'w', 'e', 'r', 't'].indexOf(e.key.toLowerCase());
          if (letterIdx !== -1) {
            const targetPos = 11 + letterIdx;
            const targetP = gameState?.players.find((p) => (p.position || 0) === targetPos);
            if (targetP && !targetP.isEliminated) {
              if (stage === GameStage.STAGE_2 && targetP.id === gameState?.nominationHolderId) return;
              e.preventDefault();
              sounds.playTick();
              onNominate(targetP.id);
              return;
            }
          }
          return;
        }

        // Answering Phase Shortcuts (Verdicts)
        if (['1', 'p', 'P', 'Enter', 'z', 'Z'].includes(e.key)) {
          e.preventDefault();
          sounds.playCorrect();
          onVerdict(true);
        } else if (['2', 'b', 'B', 'Backspace', 'x', 'X'].includes(e.key)) {
          e.preventDefault();
          sounds.playWrong();
          onVerdict(false);
        } else if (['3', 'c', 'C'].includes(e.key)) {
          e.preventDefault();
          sounds.playTimeOut();
          onVerdict(false);
        } else if (['n', 'N', 'm', 'M'].includes(e.key)) {
          e.preventDefault();
          onNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isLobby,
    isFinished,
    isNominationPhase,
    stage,
    gameState,
    timerState.isRunning,
    onVerdict,
    onNominate,
    onNextQuestion,
    onPauseTimer,
    onResumeTimer
  ]);

  return (
    <div className="min-h-screen bg-theme-black text-white studio-grid flex flex-col p-3 sm:p-6 select-none">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Wyjdź
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold text-zinc-400">POKÓJ:</span>
            <span
              data-testid="room-code-badge"
              className="font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-status-active text-sm"
            >
              {roomCode}
            </span>
          </div>
          {isPartyMode && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Tryb Towarzyski
            </span>
          )}
        </div>

        {/* Center: Stage info */}
        {!isLobby && (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            {stage === GameStage.STAGE_1 && (
              <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Etap 1: Eliminacje (po 2 pytania)
              </span>
            )}
            {stage === GameStage.STAGE_2 && (
              <span className="text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Etap 2: Wskazywanie (do 3 graczy)
              </span>
            )}
            {stage === GameStage.STAGE_3 && (
              <span className="text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Etap 3: Wielki Finał ({gameState ? gameState.finalQuestionsTotal - gameState.finalQuestionsRemaining : 0}/40 pytań)
              </span>
            )}
          </div>
        )}

        {/* Right tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenTv}
            data-testid="btn-open-tv-window"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800 text-xs flex items-center gap-1.5"
            title="Otwórz ekran TV w nowym oknie"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Ekran TV</span>
          </button>

          {!isPartyMode && (
            <button
              onClick={handleCopyLink}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800 text-xs flex items-center gap-1.5"
              title="Kopiuj link do pokoju"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{copiedLink ? 'Skopiowano!' : 'Udostępnij'}</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors border border-zinc-800 text-xs"
            title="Dźwięki"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* LOBBY / SETUP SCREEN */}
      {isLobby && (
        <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto my-auto py-6">
          <div className="bg-theme-darker border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-2 flex items-center gap-2">
              <Users className="w-6 h-6 text-status-active" /> Konfiguracja Rozgrywki (Mistrz Gry)
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              {isPartyMode
                ? 'Wprowadź imiona zawodników. W teleturnieju bierze udział od 4 do 15 osób (domyślnie 10).'
                : 'Poczekaj na dołączenie graczy przez kod pokoju lub link.'}
            </p>

            {/* Players Setup */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                  Zawodnicy ({isPartyMode ? partyPlayers.length : gameState?.players.length || 0} / 15)
                </span>
                {isPartyMode && partyPlayers.length < 15 && (
                  <span className="text-xs text-zinc-500">Min. 4, max. 15 graczy</span>
                )}
              </div>

              {isPartyMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {partyPlayers.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-theme-card border border-zinc-800 text-sm"
                      >
                        <span className="font-mono text-xs text-zinc-500 mr-2">#{idx + 1}</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleUpdatePartyPlayer(idx, e.target.value)}
                          className="bg-transparent text-white font-medium focus:outline-none flex-1 truncate"
                        />
                        {partyPlayers.length > 4 && (
                          <button
                            onClick={() => handleRemovePartyPlayer(idx)}
                            className="text-zinc-600 hover:text-rose-400 transition-colors ml-2"
                            title="Usuń gracza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {partyPlayers.length < 15 && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPartyPlayer()}
                        placeholder="Imię nowego gracza..."
                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-theme-card border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleAddPartyPlayer}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
                      >
                        <Plus className="w-4 h-4 text-cyan-400" /> Dodaj
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Online Room Players list */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {gameState?.players.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-theme-card border border-zinc-800 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-status-success" />
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                    </div>
                  ))}
                  {(!gameState?.players || gameState.players.length === 0) && (
                    <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                      Oczekiwanie na dołączenie graczy... Udostępnij kod <span className="text-status-active font-mono font-bold">{roomCode}</span>.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Categories Select */}
            <div className="mb-8">
              <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider block mb-3">
                Kategorie pytań (opcjonalnie)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategories.length === 0
                      ? 'bg-status-active text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Wszystkie kategorie (11 047)
                </button>
                {categories.slice(0, 8).map((cat) => {
                  const isSel = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (isSel) {
                          setSelectedCategories(selectedCategories.filter((c) => c !== cat.id));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        isSel
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                          : 'bg-theme-card text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => {
                sounds.playGong();
                onStartGame(selectedCategories, isPartyMode ? partyPlayers : undefined);
              }}
              data-testid="btn-start-game"
              disabled={isPartyMode ? partyPlayers.length < 4 : (gameState?.players.length || 0) < 4}
              className="w-full py-4 rounded-xl bg-status-active text-black font-black uppercase tracking-wider text-base hover:bg-cyan-300 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-black" /> Rozpocznij teleturniej!
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE GAME MASTER DASHBOARD */}
      {!isLobby && !isFinished && (
        <div className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto">
          {/* Main Question & Master Control Card */}
          <div className="bg-theme-darker border-2 border-zinc-800 rounded-3xl p-5 sm:p-8 mb-6 relative shadow-2xl">
            {/* Header row: Category & Active Player Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentQuestion?.category || 'Wiedza ogólna'}
                </span>
                {currentQuestion?.difficulty && (
                  <span className="text-xs text-zinc-500 font-mono">
                    Poziom: {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Active contestant badge */}
              {activePlayer ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-status-active/10 border border-status-active text-status-active font-bold text-sm glow-cyan animate-pulse">
                  <Flame className="w-4 h-4" />
                  <span>Odpowiada: #{activePlayer.position || 1} {activePlayer.name}</span>
                </div>
              ) : buzzeredPlayer ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500 text-amber-400 font-bold text-sm glow-amber animate-pulse">
                  <span>Zgłosił się: #{buzzeredPlayer.position || 1} {buzzeredPlayer.name}</span>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">Oczekiwanie na zgłoszenie</div>
              )}
            </div>

            {/* The Question Text */}
            <div className="my-6">
              <h3
                data-testid="host-question-text"
                className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-relaxed tracking-normal"
              >
                {currentQuestion?.question || 'Pobieranie pytania...'}
              </h3>
            </div>

            {/* Game Master Answer Reveal Spoiler Box */}
            <div
              data-testid="host-answer-box"
              className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-700/80 mb-6"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-status-active" /> Prawidłowa odpowiedź (Mistrz Gry)
                </span>
                <span className="text-[10px] text-zinc-500">Tylko dla prowadzącego</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400">
                {currentQuestion?.answer || '---'}
              </div>

              {/* Acceptable Aliases Badges */}
              {currentQuestion?.aliases && currentQuestion.aliases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-xs text-zinc-400">Uznawane formy:</span>
                  {currentQuestion.aliases.map((alias, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Central Controls: Timer & Big Verdict Buttons */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-4 border-t border-zinc-800">
              {/* Timer Display with Host controls */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <TimerDisplay
                  remaining={timerState.remaining}
                  duration={timerState.duration}
                  isRunning={timerState.isRunning}
                  showControls={true}
                  onPause={onPauseTimer}
                  onResume={onResumeTimer}
                  onReset={() => onResetTimer()}
                  onAddSeconds={onAddSeconds}
                  label={stage === GameStage.STAGE_3 && !activePlayer ? 'CZAS NA ZGŁOSZENIE (BUZZER)' : 'CZAS NA ODPOWIEDŹ'}
                />

                {/* Big Space / Start Countdown Trigger for Host */}
                <div className="flex flex-col items-center gap-1.5 sm:border-l sm:border-zinc-800 sm:pl-4">
                  {!timerState.isRunning ? (
                    <button
                      onClick={onResumeTimer}
                      data-testid="btn-start-countdown"
                      className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-status-active to-cyan-300 text-black font-black uppercase text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-xl glow-cyan animate-pulse"
                      title="Rozpocznij odliczanie 30s po przeczytaniu pytania na głos (Klawisz: Spacja)"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>START CZASU (Spacja)</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPauseTimer}
                      data-testid="btn-pause-countdown"
                      className="py-3.5 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-sm border border-amber-500/50 flex items-center justify-center gap-2 transition-colors shadow-lg"
                      title="Zatrzymaj licznik czasu (Klawisz: Spacja)"
                    >
                      <Pause className="w-4 h-4" />
                      <span>PAUZA (Spacja)</span>
                    </button>
                  )}
                  <span className="text-[11px] text-zinc-400 text-center">
                    {!timerState.isRunning ? '📖 Przeczytaj pytanie, potem wciśnij Spację' : '⏱️ Odliczanie trwa...'}
                  </span>
                </div>
              </div>

              {/* Verdict Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button
                  onClick={() => {
                    sounds.playCorrect();
                    onVerdict(true);
                  }}
                  data-testid="btn-verdict-correct"
                  className="py-4 px-6 rounded-2xl bg-status-success text-black font-extrabold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg glow-emerald text-base group"
                  title="Dobra odpowiedź (Klawisz: 1, P lub Enter)"
                >
                  <CheckCircle2 className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
                  <span>DOBRZE (1 / P)</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playWrong();
                    onVerdict(false);
                  }}
                  data-testid="btn-verdict-wrong"
                  className="py-4 px-6 rounded-2xl bg-status-danger text-white font-extrabold hover:bg-red-500 transition-all flex items-center justify-center gap-2 shadow-lg glow-rose text-base group"
                  title="Błędna odpowiedź (Klawisz: 2, B lub Backspace)"
                >
                  <XCircle className="w-5 h-5 fill-white text-status-danger group-hover:scale-110 transition-transform" />
                  <span>ŹLE (2 / B)</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playTimeOut();
                    onVerdict(false);
                  }}
                  data-testid="btn-verdict-timeout"
                  className="py-4 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5 text-sm"
                  title="Czas minął / brak odpowiedzi (Klawisz: 3 lub C)"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Czas minął (3)</span>
                </button>

                <button
                  onClick={onNextQuestion}
                  data-testid="btn-skip-question"
                  className="py-4 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 text-xs flex items-center justify-center"
                  title="Pomiń to pytanie i wylosuj inne (Klawisz: N)"
                >
                  Pomiń (N)
                </button>
              </div>
            </div>

            {/* Stage 3 Phase 2 Nomination Guidance */}
            {stage === GameStage.STAGE_3 && gameState?.stage3Phase === Stage3Phase.NOMINATING && activePlayer && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-zinc-900 to-amber-950/70 border-2 border-amber-500/80 text-amber-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 glow-amber">
                <div className="text-center sm:text-left">
                  <span className="font-bold text-sm text-white block">
                    Gracz #{activePlayer.position || 1} {activePlayer.name} ma prawo wyznaczenia:
                  </span>
                  <span className="text-zinc-400 text-xs">
                    Wciśnij <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono font-bold">[S]</kbd>, aby wyznaczyć siebie, lub kliknij w boks rywala.
                  </span>
                </div>
                <button
                  onClick={() => onNominate(activePlayer.id)}
                  data-testid="btn-nominate-self"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black hover:from-amber-300 hover:to-amber-400 transition-all flex items-center gap-1.5 shadow-lg text-sm"
                >
                  <Flame className="w-4 h-4 fill-black" /> Wyznaczam siebie (+20 pkt) [S]
                </button>
              </div>
            )}
          </div>

          {/* Players Stations Grid */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-400" /> Stanowiska Zawodników
              </span>
              <span className="text-xs text-zinc-500">
                W grze: {gameState?.players.filter((p) => !p.isEliminated).length || 0} / {gameState?.players.length || 0}
              </span>
            </div>

            {/* Nomination helper banner when nomination is open */}
            {isNominationPhase && (
              <div className="mb-3 p-3 rounded-xl bg-cyan-950/50 border border-status-active text-center glow-cyan">
                <span className="text-xs font-bold text-status-active">
                  👆 Kliknij w cały boks wybranego zawodnika lub naciśnij jego cyfrę [1]–[9], [0] na klawiaturze, aby go wyznaczyć!
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {gameState?.players.map((player) => {
                const canNom =
                  isNominationPhase &&
                  !player.isEliminated &&
                  (stage === GameStage.STAGE_3 || player.id !== gameState?.nominationHolderId);

                return (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isActive={player.id === gameState?.activePlayerId}
                    isBuzzered={player.id === buzzerPlayerId}
                    canNominate={canNom}
                    onNominate={(targetId) => onNominate(targetId)}
                    showScore={stage === GameStage.STAGE_3 || player.score > 0}
                    compact={gameState.players.length > 8}
                    hotkeyLabel={getHotkeyForPosition(player.position)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WINNER / GAME OVER CELEBRATION */}
      {isFinished && gameState && (
        <WinnerCelebration
          players={gameState.players}
          onNewGame={() => onStartGame(selectedCategories)}
          onHome={onLeave}
        />
      )}
    </div>
  );
};
