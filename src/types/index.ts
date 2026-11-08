export interface Question {
  id: number;
  question: string;
  answer: string;
  aliases?: string[];
  category: string;
  source: string;
  difficulty?: string;
}

export interface PlayerStats {
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number; // percentage 0-100
  selfNominations: number;
  eliminatedInStage: GameStage | null;
}

export interface Player {
  id: string;
  name: string;
  chances: number;
  score: number;
  isEliminated: boolean;
  stage1CorrectCount: number;
  stage1QuestionsAnswered: number;
  isConnected?: boolean;
  socketId?: string;
  position?: number;
  stats?: PlayerStats;
}

export enum GameStage {
  LOBBY = 'LOBBY',
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  FINISHED = 'FINISHED'
}

export enum Stage3Phase {
  BUZZER = 'BUZZER',
  ANSWERING = 'ANSWERING',
  NOMINATING = 'NOMINATING',
  ANSWERING_NOMINATED = 'ANSWERING_NOMINATED'
}

export enum QuestionState {
  IDLE = 'IDLE',
  READING = 'READING',
  BUZZER_OPEN = 'BUZZER_OPEN',
  ANSWERING = 'ANSWERING',
  EVALUATING = 'EVALUATING'
}

export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  initialChances: number;
  stage1QuestionsPerPlayer: number;
  answerTimeLimitSeconds: number;
  buzzerTimeLimitSeconds: number;
  finalQuestionsPoolCount: number;
  finalBuzzerPoints: number;
  finalSelfNominationPoints: number;
  finalNominatedOpponentPoints: number;
  finalStageThresholdPoints: number;
  bonusPointsPerSavedChance: number;
  allowedCategories?: string[];
}

export interface GameStatsSummary {
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number;
  totalQuestionsAsked: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  overallAccuracy: number;
  finalistCount: number;
}

export interface GameState {
  id: string;
  stage: GameStage;
  config: GameConfig;
  players: Player[];
  activePlayerId: string | null;
  nominationHolderId: string | null;
  targetPlayerId: string | null;
  isSelfNominated: boolean;
  currentQuestion: Question | null;
  questionState: QuestionState;
  stage3Phase: Stage3Phase | null;
  finalQuestionsRemaining: number;
  finalQuestionsTotal: number;
  timer: {
    duration: number;
    remaining: number;
    isRunning: boolean;
    startedAt: number | null;
    expiresAt?: number | null;
  } | null;
  winner: Player | null;
  gameStats?: GameStatsSummary;
  submittedAnswer?: {
    playerId: string;
    playerName: string;
    answerText: string;
    submittedAt: number;
  } | null;
  history: GameEventRecord[];
}

export interface GameEventRecord {
  timestamp: number;
  stage: GameStage;
  type: string;
  playerId?: string;
  description: string;
}
