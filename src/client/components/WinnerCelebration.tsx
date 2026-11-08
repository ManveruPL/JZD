import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Home,
  Award,
  Star,
  Download,
  Copy,
  Check,
  Printer,
  Clock,
  Target,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { GameState, Player } from '../../types/index.js';
import { sounds } from '../utils/sound.js';
import {
  getRankedPlayers,
  generateCSV,
  generateJSON,
  generateMarkdownReport,
  downloadFile,
  copyToClipboard,
  formatStageName
} from '../utils/exportReport.js';

interface WinnerCelebrationProps {
  players: Player[];
  gameState?: GameState | null;
  onNewGame: () => void;
  onHome: () => void;
}

export const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  players,
  gameState,
  onNewGame,
  onHome
}) => {
  const [activeTab, setActiveTab] = useState<'PODIUM' | 'STATS'>('PODIUM');
  const [copied, setCopied] = useState(false);

  const winner = gameState?.winner || [...players].sort((a, b) => b.score - a.score)[0];
  const ranked = getRankedPlayers(players, winner);
  const summary = gameState?.gameStats;

  useEffect(() => {
    sounds.playDrumroll();
    const timer = setTimeout(() => {
      sounds.playFanfare();
    }, 800);

    // Fire confetti bursts
    const end = Date.now() + 3500;
    const colors = ['#00e5ff', '#10b981', '#f59e0b', '#ffffff'];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 4,
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

    return () => clearTimeout(timer);
  }, []);

  const handleDownloadCSV = () => {
    if (!gameState) return;
    const csv = generateCSV(gameState);
    downloadFile(csv, `jzd-wyniki-${gameState.id || 'gra'}.csv`, 'text/csv;charset=utf-8');
  };

  const handleDownloadJSON = () => {
    if (!gameState) return;
    const json = generateJSON(gameState);
    downloadFile(json, `jzd-raport-${gameState.id || 'gra'}.json`, 'application/json');
  };

  const handleCopyReport = async () => {
    if (!gameState) return;
    const md = generateMarkdownReport(gameState);
    const success = await copyToClipboard(md);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '0m 0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-theme-darker border-2 border-amber-500/60 rounded-3xl p-5 sm:p-8 max-w-3xl w-full shadow-2xl relative overflow-hidden text-center my-auto">
        {/* Glow backdrop */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex p-3 sm:p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3 animate-bounce">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide uppercase">
          Koniec Wielkiego Finału!
        </h2>
        <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
          Zwycięzcą teleturnieju zostaje:
        </p>

        {/* Winner Highlight Banner */}
        {winner && (
          <div className="my-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-500/20 border border-amber-500/50 glow-amber inline-block w-full">
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-xs uppercase tracking-widest font-black">Mistrz Jeden z Dziesięciu</span>
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{winner.name}</h3>
            <div className="mt-1 text-lg sm:text-xl font-mono text-amber-300 font-bold">
              {winner.score} <span className="text-sm font-normal text-zinc-400">punktów</span>
            </div>
          </div>
        )}

        {/* Quick Stats Metrics */}
        {summary && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-left">
            <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-xs font-semibold mb-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Czas gry
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-white">
                {formatDuration(summary.durationSeconds)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-xs font-semibold mb-0.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Pytania
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-white">
                {summary.totalQuestionsAsked}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-xs font-semibold mb-0.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" /> Celność
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                {summary.overallAccuracy}%
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Podium vs Detailed Stats */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('PODIUM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'PODIUM'
                ? 'bg-status-active text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Tabela Finałowa
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              activeTab === 'STATS'
                ? 'bg-status-active text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Statystyki Zawodników
          </button>
        </div>

        {/* Tab 1: Podium & Standings */}
        {activeTab === 'PODIUM' ? (
          <div className="bg-theme-card/90 rounded-2xl border border-zinc-800 p-3 sm:p-4 mb-4 max-h-56 overflow-y-auto">
            <div className="space-y-1.5">
              {ranked.map((player) => {
                const isWin = player.rank === 1;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs sm:text-sm transition-all ${
                      isWin
                        ? 'bg-amber-950/40 border-amber-500/60 text-white font-bold'
                        : player.rank <= 3
                        ? 'bg-zinc-900/80 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          player.rank === 1
                            ? 'bg-amber-400 text-black'
                            : player.rank === 2
                            ? 'bg-zinc-300 text-black'
                            : player.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {player.rank}
                      </span>
                      <span className="font-semibold truncate">{player.name}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-zinc-400 text-xs hidden sm:inline">
                        {player.chances > 0 ? `${player.chances} szanse` : '0 szans'}
                      </span>
                      <span className="text-amber-400">{player.score} pkt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Tab 2: Detailed Stats Table */
          <div className="bg-theme-card/90 rounded-2xl border border-zinc-800 p-3 sm:p-4 mb-4 max-h-56 overflow-y-auto text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-mono text-[10px]">
                    <th className="pb-2">Gracz</th>
                    <th className="pb-2 text-center">Punkty</th>
                    <th className="pb-2 text-center">Odp. (D/Z)</th>
                    <th className="pb-2 text-center">Celność</th>
                    <th className="pb-2 text-right">Etap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {ranked.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/50">
                      <td className="py-1.5 font-semibold text-white">
                        #{p.position || 1} {p.name}
                      </td>
                      <td className="py-1.5 text-center font-mono font-bold text-amber-400">{p.score}</td>
                      <td className="py-1.5 text-center font-mono">
                        <span className="text-emerald-400">{p.stats?.correctAnswers || 0}</span> /{' '}
                        <span className="text-rose-400">{p.stats?.wrongAnswers || 0}</span>
                      </td>
                      <td className="py-1.5 text-center font-mono text-cyan-300">{p.stats?.accuracy || 0}%</td>
                      <td className="py-1.5 text-right text-[11px] text-zinc-400">
                        {p.rank === 1 ? '🥇 Zwycięzca' : formatStageName(p.stats?.eliminatedInStage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Phase 5: Export Buttons */}
        {gameState && (
          <div className="mb-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleDownloadCSV}
              data-testid="btn-export-csv"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-800 flex items-center gap-1.5 shadow-sm"
              title="Pobierz wyniki w formacie arkusza kalkulacyjnego CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Pobierz CSV
            </button>

            <button
              onClick={handleDownloadJSON}
              data-testid="btn-export-json"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-800 flex items-center gap-1.5 shadow-sm"
              title="Pobierz kompletny raport JSON ze wszystkimi danymi"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" /> Pobierz JSON
            </button>

            <button
              onClick={handleCopyReport}
              data-testid="btn-copy-report"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-800 flex items-center gap-1.5 shadow-sm"
              title="Skopiuj sformatowany raport z tabelą do schowka"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Skopiowano!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" /> Kopiuj Raport
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              data-testid="btn-print-report"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors border border-zinc-800 flex items-center gap-1.5 shadow-sm"
              title="Drukuj lub zapisz jako PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Drukuj
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          <button
            onClick={onNewGame}
            data-testid="btn-new-game"
            className="px-5 py-3 rounded-xl bg-status-active text-black font-extrabold hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Zagraj ponownie
          </button>
          <button
            onClick={onHome}
            data-testid="btn-home"
            className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors flex items-center justify-center gap-2 border border-zinc-700 text-sm"
          >
            <Home className="w-4 h-4" /> Menu główne
          </button>
        </div>
      </div>
    </div>
  );
};
