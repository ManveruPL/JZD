import { GameConfig, GameState } from './index.js';

export interface TimerState {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt: number | null;
  expiresAt: number | null;
}

export interface SubmittedAnswer {
  playerId: string;
  playerName: string;
  answerText: string;
  submittedAt: number;
}

export interface ServerToClientEvents {
  'room:joined': (payload: {
    roomCode: string;
    role: 'host' | 'player' | 'spectator';
    playerId?: string;
    playerName?: string;
  }) => void;

  'room:error': (payload: { message: string }) => void;

  'game:state': (state: GameState) => void;

  'timer:state': (timer: TimerState) => void;
  'timer:expired': () => void;

  'buzzer:won': (payload: { playerId: string; playerName: string }) => void;
  'buzzer:reset': () => void;

  'answer:submitted': (payload: SubmittedAnswer) => void;
  'answer:cleared': () => void;

  'notification': (payload: { type: 'info' | 'success' | 'warning' | 'error'; message: string }) => void;
}

export interface ClientToServerEvents {
  // Room events
  'room:create': (
    payload: { hostName?: string; isPartyMode?: boolean; config?: Partial<GameConfig> },
    callback?: (response: { success: boolean; roomCode?: string; error?: string }) => void
  ) => void;

  'room:join': (
    payload: { roomCode: string; playerName: string; role?: 'player' | 'spectator' },
    callback?: (response: { success: boolean; playerId?: string; error?: string }) => void
  ) => void;

  'room:reconnect': (
    payload: { roomCode: string; playerId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  // Game control events
  'game:start': (payload?: { players?: string[]; categories?: string[]; config?: Partial<GameConfig> }) => void;
  'game:answer_verdict': (payload: { isCorrect: boolean }) => void;
  'game:nominate': (payload: { targetPlayerId: string }) => void;
  'game:buzz': () => void;
  'game:submit_text_answer': (payload: { answerText: string }) => void;
  'game:skip_buzzer_question': () => void;

  // Timer controls
  'timer:start': (payload?: { durationSeconds?: number }) => void;
  'timer:pause': () => void;
  'timer:resume': () => void;
  'timer:reset': (payload?: { durationSeconds?: number }) => void;
  'timer:add_time': (payload: { seconds: number }) => void;

  // Manual host corrections
  'host:adjust_score': (payload: { playerId: string; delta: number }) => void;
  'host:adjust_chances': (payload: { playerId: string; delta: number }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomCode?: string;
  role?: 'host' | 'player' | 'spectator';
  playerId?: string;
  playerName?: string;
}
