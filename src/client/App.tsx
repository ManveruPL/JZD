import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { HomeView } from './views/HomeView.js';
import { HostView } from './views/HostView.js';
import { PlayerView } from './views/PlayerView.js';
import { TvView } from './views/TvView.js';
import { GameState, Question } from '../types/index.js';
import { TimerState } from '../types/socket.js';

export type AppView = 'HOME' | 'HOST' | 'PLAYER' | 'TV';

export const App: React.FC = () => {
  const { socket, isConnected, emit } = useSocket();

  const [currentView, setCurrentView] = useState<AppView>('HOME');
  const [roomCode, setRoomCode] = useState<string>('');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isPartyMode, setIsPartyMode] = useState<boolean>(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    duration: 30,
    remaining: 30,
    isRunning: false,
    startedAt: null,
    expiresAt: null
  });
  const [buzzerPlayerId, setBuzzerPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse initial query params on load (e.g. ?tv=JZD-XXXX or ?join=JZD-XXXX)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tvParam = params.get('tv');
      const joinParam = params.get('join');

      if (tvParam && socket) {
        setRoomCode(tvParam.toUpperCase());
        emit('room:join', { roomCode: tvParam.toUpperCase(), playerName: 'Ekran TV', role: 'spectator' });
        setCurrentView('TV');
      } else if (joinParam) {
        setRoomCode(joinParam.toUpperCase());
      }
    }
  }, [socket, emit]);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    socket.on('room:joined', (payload) => {
      setRoomCode(payload.roomCode);
      if (payload.playerId) setMyPlayerId(payload.playerId);
      setErrorMessage(null);
    });

    socket.on('game:state', (state) => {
      setGameState(state);
      if (state.timer) {
        setTimerState({
          duration: state.timer.duration,
          remaining: state.timer.remaining,
          isRunning: state.timer.isRunning,
          startedAt: state.timer.startedAt,
          expiresAt: state.timer.expiresAt ?? null
        });
      }
    });

    socket.on('timer:state', (timer) => {
      setTimerState(timer);
    });

    socket.on('buzzer:won', (payload) => {
      setBuzzerPlayerId(payload.playerId);
    });

    socket.on('buzzer:reset', () => {
      setBuzzerPlayerId(null);
    });

    socket.on('room:error', (payload) => {
      setErrorMessage(payload.message);
    });

    return () => {
      socket.off('room:joined');
      socket.off('game:state');
      socket.off('timer:state');
      socket.off('buzzer:won');
      socket.off('buzzer:reset');
      socket.off('room:error');
    };
  }, [socket]);

  // Derived current question
  const currentQuestion: Question | null = gameState?.currentQuestion || null;

  // Handlers for Home actions
  const handleStartParty = () => {
    setIsPartyMode(true);
    emit('room:create', { hostName: 'Mistrz Gry', isPartyMode: true, config: { minPlayers: 4, maxPlayers: 15 } }, (res) => {
      if (res?.success && res.roomCode) {
        setRoomCode(res.roomCode);
        setCurrentView('HOST');
      }
    });
  };

  const handleCreateRoom = () => {
    setIsPartyMode(false);
    emit('room:create', { hostName: 'Prowadzący' }, (res) => {
      if (res?.success && res.roomCode) {
        setRoomCode(res.roomCode);
        setCurrentView('HOST');
      }
    });
  };

  const handleJoinRoom = (code: string, name: string) => {
    setIsPartyMode(false);
    setRoomCode(code);
    emit('room:join', { roomCode: code, playerName: name, role: 'player' }, (res) => {
      if (res?.success) {
        if (res.playerId) setMyPlayerId(res.playerId);
        setCurrentView('PLAYER');
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleOpenTv = (code: string) => {
    setRoomCode(code);
    emit('room:join', { roomCode: code, playerName: 'Ekran TV', role: 'spectator' }, (res) => {
      if (res?.success) {
        setCurrentView('TV');
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Host Controls
  const handleStartGame = (categories?: string[], partyPlayers?: string[]) => {
    emit('game:start', { categories, players: partyPlayers });
  };

  const handleVerdict = (isCorrect: boolean) => {
    emit('game:answer_verdict', { isCorrect });
  };

  const handleNominate = (targetPlayerId: string) => {
    emit('game:nominate', { targetPlayerId });
  };

  const handleNextQuestion = () => {
    emit('game:skip_buzzer_question');
  };

  const handlePauseTimer = () => emit('timer:pause');
  const handleResumeTimer = () => emit('timer:resume');
  const handleResetTimer = (seconds?: number) => emit('timer:reset', { durationSeconds: seconds });
  const handleAddSeconds = (seconds: number) => emit('timer:add_time', { seconds });

  const handleManualAdjust = (playerId: string, chancesDelta: number, scoreDelta: number) => {
    if (chancesDelta !== 0) {
      emit('host:adjust_chances', { playerId, delta: chancesDelta });
    }
    if (scoreDelta !== 0) {
      emit('host:adjust_score', { playerId, delta: scoreDelta });
    }
  };

  // Player Controls
  const handleSubmitAnswer = (text: string) => {
    emit('game:submit_text_answer', { answerText: text });
  };

  const handleBuzz = () => {
    emit('game:buzz');
  };

  // View routing
  return (
    <div className="min-h-screen bg-theme-black text-white font-sans">
      {/* Global Connection / Error Banner */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-xs font-bold py-1.5 px-4 text-center">
          Łączenie z serwerem teleturnieju...
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-rose-500 text-rose-300 text-xs font-semibold py-2 px-4 rounded-xl shadow-2xl flex items-center gap-2">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {currentView === 'HOME' && (
        <HomeView
          onStartParty={handleStartParty}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenTv={handleOpenTv}
        />
      )}

      {currentView === 'HOST' && (
        <HostView
          roomCode={roomCode}
          isPartyMode={isPartyMode}
          gameState={gameState}
          timerState={timerState}
          currentQuestion={currentQuestion}
          buzzerPlayerId={buzzerPlayerId}
          onStartGame={handleStartGame}
          onVerdict={handleVerdict}
          onNominate={handleNominate}
          onNextQuestion={handleNextQuestion}
          onPauseTimer={handlePauseTimer}
          onResumeTimer={handleResumeTimer}
          onResetTimer={handleResetTimer}
          onAddSeconds={handleAddSeconds}
          onManualAdjust={handleManualAdjust}
          onLeave={() => setCurrentView('HOME')}
        />
      )}

      {currentView === 'PLAYER' && (
        <PlayerView
          roomCode={roomCode}
          myPlayerId={myPlayerId}
          gameState={gameState}
          timerState={timerState}
          currentQuestion={currentQuestion}
          buzzerPlayerId={buzzerPlayerId}
          onSubmitAnswer={handleSubmitAnswer}
          onBuzz={handleBuzz}
          onNominate={handleNominate}
          onLeave={() => setCurrentView('HOME')}
        />
      )}

      {currentView === 'TV' && (
        <TvView
          roomCode={roomCode}
          gameState={gameState}
          timerState={timerState}
          currentQuestion={currentQuestion}
          buzzerPlayerId={buzzerPlayerId}
        />
      )}
    </div>
  );
};
