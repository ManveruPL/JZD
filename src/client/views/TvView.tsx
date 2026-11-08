import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GameStage, GameState, Question, Stage3Phase } from '../../types/index.js';
import { TimerState, SubmittedAnswer } from '../../types/socket.js';
import { ChanceIndicators } from '../components/ChanceIndicators.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { Volume2, VolumeX, Maximize2, QrCode, Smartphone, Users, Sparkles, X } from 'lucide-react';
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?join=${encodeURIComponent(roomCode)}`
    : `/?join=${encodeURIComponent(roomCode)}`;

  useEffect(() => {
    if (roomCode) {
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Błąd generowania kodu QR:', err));
    }
  }, [roomCode, joinUrl]);

  const stage = gameState?.stage || 'LOBBY';
  const isPartyMode = gameState?.isPartyMode ?? false;
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
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
                Studio Teleturniejowe • Kod: {roomCode}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isPartyMode
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
              }`}>
                {isPartyMode ? 'Tryb Towarzyski' : 'Tryb Interaktywny'}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Badge & Actions */}
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
            onClick={() => setShowQrModal(!showQrModal)}
            data-testid="tv-btn-toggle-qr"
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Pokaż kod QR dołączenia"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Kod QR</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Dźwięk"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Pełny ekran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Center Screen */}
      <main className="my-auto py-6 max-w-6xl w-full mx-auto text-center flex flex-col items-center">
        {stage === GameStage.LOBBY ? (
          !isPartyMode ? (
            /* Interactive Mode Lobby with Large QR Code */
            <div className="w-full py-2" data-testid="tv-lobby-interactive">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pokoje Online • Oczekiwanie na graczy</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-wide">
                  Zeskanuj kod QR i dołącz do gry
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-2">
                  Skieruj aparat telefonu na kod QR, wpisz swoje imię i zajmij stanowisko teleturniejowe!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch text-left">
                {/* Left Card: QR Code & Connection PIN */}
                <div className="md:col-span-5 bg-theme-darker/90 border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center shadow-2xl relative group">
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest mb-4">
                      <Smartphone className="w-4 h-4" />
                      <span>Aparat telefonu</span>
                    </div>

                    {/* QR Code Container */}
                    <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl border-4 border-cyan-500/30 glow-cyan transition-transform transform group-hover:scale-105 duration-300">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`Kod QR dołączenia do pokoju ${roomCode}`}
                          data-testid="tv-qr-image"
                          className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                        />
                      ) : (
                        <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-zinc-600 font-mono text-sm">
                          Generowanie kodu QR...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Room PIN & Link */}
                  <div className="mt-6 w-full">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                      LUB WPISZ KOD NA STRONIE GŁÓWNEJ
                    </span>
                    <div
                      data-testid="tv-room-pin"
                      className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 font-mono text-2xl font-black text-cyan-400 tracking-wider shadow-inner"
                    >
                      {roomCode}
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-500 font-mono truncate">
                      {joinUrl}
                    </div>
                  </div>
                </div>

                {/* Right Card: Connected Contestants Roster */}
                <div className="md:col-span-7 bg-theme-darker/90 border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                            Stanowiska zawodników
                          </h3>
                          <span className="text-xs text-zinc-400">
                            Wymagane do startu: min. {gameState?.config?.minPlayers || 4} graczy
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          data-testid="tv-player-count-badge"
                          className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-sm"
                        >
                          {gameState?.players.length || 0} / {gameState?.config?.maxPlayers || 15}
                        </span>
                      </div>
                    </div>

                    {/* Players Grid */}
                    {gameState && gameState.players.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                        {gameState.players.map((p, idx) => (
                          <div
                            key={p.id}
                            data-testid={`tv-player-card-${p.id}`}
                            className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 transition-all flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              #{p.position || idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-white truncate" title={p.name}>
                                {p.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Stanowisko zajęte</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center">
                          <QrCode className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-400 text-sm">Brak graczy na stanowiskach</p>
                          <p className="text-xs text-zinc-600 mt-1">Zeskanuj kod QR z lewej strony, aby zająć pierwsze stanowisko!</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Status Banner */}
                  <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Oczekiwanie na rozpoczęcie gry przez Mistrza Gry...</span>
                    </div>
                    <span className="font-mono text-zinc-500 text-[11px]">JZD Studio v1.0</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Party Mode Lobby */
            <div className="py-12 max-w-xl mx-auto" data-testid="tv-lobby-party">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider mb-4">
                <span>Tryb Towarzyski (TV / Rzutnik)</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-4">
                Teleturniej rozpocznie się za chwilę
              </h2>
              <p className="text-lg text-zinc-400 max-w-lg mx-auto mb-8">
                Mistrz Gry przygotowuje stanowiska dla zawodników przy pulpicie sterującym...
              </p>
              <div className="inline-block px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 font-mono text-lg text-status-active">
                KOD TRANSMISJI: {roomCode}
              </div>
            </div>
          )
        ) : (
          /* In-Game TV Studio View */
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

      {/* Contestant Stations Bar at Bottom (shown during active game) */}
      {stage !== GameStage.LOBBY && (
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
      )}

      {/* QR Code Popup Modal (accessible anytime via header button) */}
      {showQrModal && (
        <div
          data-testid="tv-qr-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-theme-darker border-2 border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              data-testid="tv-btn-close-qr-modal"
              className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest mb-4">
              <QrCode className="w-4 h-4" />
              <span>Dołącz do pokoju</span>
            </div>

            <h3 className="text-xl font-black uppercase text-white mb-4">
              Zeskanuj kod QR
            </h3>

            <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-cyan-500/30 inline-block mb-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`Kod QR ${roomCode}`}
                  className="w-56 h-56 object-contain mx-auto"
                />
              )}
            </div>

            <div className="text-zinc-400 text-xs mb-2">PIN POKOJU:</div>
            <div className="px-6 py-2 rounded-xl bg-zinc-900 border border-zinc-700 font-mono text-2xl font-black text-cyan-400 tracking-wider">
              {roomCode}
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 font-mono truncate">
              {joinUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
