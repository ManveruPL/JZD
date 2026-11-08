import React, { useState } from 'react';
import { Users, Wifi, Tv, Volume2, VolumeX, Sparkles, ArrowRight, Play } from 'lucide-react';
import { sounds } from '../utils/sound.js';

interface HomeViewProps {
  onStartParty: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  onOpenTv: (roomCode: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartParty,
  onCreateRoom,
  onJoinRoom,
  onOpenTv
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [tvCode, setTvCode] = useState('');
  const [modeTab, setModeTab] = useState<'menu' | 'join' | 'tv'>('menu');

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
    if (sounds.enabled) sounds.playTick();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim() && playerName.trim()) {
      sounds.playTick();
      onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleTvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tvCode.trim()) {
      sounds.playTick();
      onOpenTv(tvCode.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-theme-black text-white studio-grid flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm">
            1/10
          </div>
          <span className="font-bold tracking-wider text-sm uppercase text-zinc-300">
            Jeden z Dziesięciu
          </span>
        </div>

        <button
          onClick={toggleSound}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800 flex items-center gap-2 text-xs"
          title={soundEnabled ? 'Wycisz dźwięki' : 'Włącz dźwięki'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Dźwięki włączone</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-zinc-500" />
              <span>Wyciszono</span>
            </>
          )}
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl w-full mx-auto my-auto py-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Baza 11 052 pytań teleturniejowych z synonimami odpowiedzi</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase text-white mb-4">
          Jeden z Dziesięciu
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto text-base sm:text-lg mb-12">
          Legendarny polski teleturniej wiedzy. 3 etapy, 3 szanse, szybkie tempo i wielki finał z buzzerem.
        </p>

        {modeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            {/* Mode 1: Party Mode */}
            <div
              data-testid="card-party-mode"
              className="p-6 rounded-2xl bg-theme-darker border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between group hover:glow-cyan"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Tryb Towarzyski (Mistrz Gry)</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Graj na jednym komputerze lub tablecie. Mistrz Gry wprowadza zawodników (4-15), zadaje pytania ustnie, operuje stoperem 30s i przyznaje punkty.
                </p>
              </div>
              <button
                onClick={onStartParty}
                data-testid="btn-start-party"
                className="mt-6 w-full py-3.5 px-4 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <span>Uruchom tryb towarzyski</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mode 2: Online Rooms */}
            <div
              data-testid="card-online-mode"
              className="p-6 rounded-2xl bg-theme-darker border border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group hover:glow-emerald"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <Wifi className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pokoje Online (Multiplayer)</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Mistrz Gry tworzy pokój z kodem PIN. Zawodnicy dołączają na smartfonach, wpisują odpowiedzi i zgłaszają się prawdziwym buzzerem w finale!
                </p>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onCreateRoom}
                  data-testid="btn-create-room"
                  className="flex-1 py-3 px-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <Play className="w-4 h-4" /> Stwórz pokój
                </button>
                <button
                  onClick={() => setModeTab('join')}
                  data-testid="btn-open-join"
                  className="flex-1 py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors flex items-center justify-center gap-1.5 text-sm border border-zinc-700"
                >
                  Dołącz z PINem
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Room Form */}
        {modeTab === 'join' && (
          <form
            onSubmit={handleJoinSubmit}
            className="max-w-md mx-auto p-6 rounded-2xl bg-theme-darker border border-zinc-800 text-left"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-400" /> Dołącz do teleturnieju
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">
                  Kod pokoju (PIN)
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="np. JZD-4921"
                  required
                  data-testid="input-room-code"
                  className="w-full px-4 py-3 rounded-xl bg-theme-card border border-zinc-700 text-white font-mono tracking-wider focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">
                  Twoje imię / Nick
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="np. Janusz"
                  required
                  data-testid="input-player-name"
                  className="w-full px-4 py-3 rounded-xl bg-theme-card border border-zinc-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModeTab('menu')}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-join"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors"
                >
                  Wejdź do gry
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TV View Link Tab */}
        {modeTab === 'tv' && (
          <form
            onSubmit={handleTvSubmit}
            className="max-w-md mx-auto p-6 rounded-2xl bg-theme-darker border border-zinc-800 text-left"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5 text-cyan-400" /> Otwórz ekran publiczności / TV
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Ten widok nie wyświetla odpowiedzi – jest idealny do rzucenia na telewizor, projektor lub drugi monitor podczas gry towarzyskiej lub online.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">
                  Kod pokoju (PIN)
                </label>
                <input
                  type="text"
                  value={tvCode}
                  onChange={(e) => setTvCode(e.target.value.toUpperCase())}
                  placeholder="np. JZD-4921"
                  required
                  data-testid="input-tv-code"
                  className="w-full px-4 py-3 rounded-xl bg-theme-card border border-zinc-700 text-white font-mono tracking-wider focus:outline-none focus:border-cyan-500 uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModeTab('menu')}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-tv"
                  className="flex-1 py-3 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-colors"
                >
                  Uruchom TV
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer switch for TV */}
        {modeTab === 'menu' && (
          <button
            onClick={() => setModeTab('tv')}
            data-testid="btn-open-tv-mode"
            className="mt-8 text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <Tv className="w-3.5 h-3.5" /> Chcesz wyświetlić grę na osobnym telewizorze lub projektorze?
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        Jeden z Dziesięciu • Klasyczna estetyka teleturnieju w nowoczesnym wydaniu
      </footer>
    </div>
  );
};
