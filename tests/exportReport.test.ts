import { describe, it, expect } from 'vitest';
import {
  generateCSV,
  generateJSON,
  generateMarkdownReport,
  getRankedPlayers
} from '../src/client/utils/exportReport.js';
import { GameStage, GameState, QuestionState } from '../src/types/index.js';
import { DEFAULT_GAME_CONFIG } from '../src/engine/GameEngine.js';

describe('exportReport - Quiz Summary & Stats Exporter', () => {
  const dummyState: GameState = {
    id: 'JZD-TEST',
    stage: GameStage.FINISHED,
    config: DEFAULT_GAME_CONFIG,
    players: [
      {
        id: 'p1',
        name: 'Anna Kowalska',
        position: 1,
        score: 143,
        chances: 2,
        isEliminated: false,
        stage1CorrectCount: 2,
        stage1QuestionsAnswered: 2,
        stats: {
          totalAnswers: 12,
          correctAnswers: 10,
          wrongAnswers: 2,
          accuracy: 83,
          selfNominations: 4,
          eliminatedInStage: null
        }
      },
      {
        id: 'p2',
        name: 'Jan Nowak',
        position: 2,
        score: 62,
        chances: 0,
        isEliminated: true,
        stage1CorrectCount: 1,
        stage1QuestionsAnswered: 2,
        stats: {
          totalAnswers: 8,
          correctAnswers: 5,
          wrongAnswers: 3,
          accuracy: 63,
          selfNominations: 1,
          eliminatedInStage: GameStage.STAGE_3
        }
      }
    ],
    activePlayerId: null,
    nominationHolderId: null,
    targetPlayerId: null,
    isSelfNominated: false,
    currentQuestion: null,
    questionState: QuestionState.IDLE,
    stage3Phase: null,
    finalQuestionsRemaining: 0,
    finalQuestionsTotal: 40,
    timer: null,
    winner: {
      id: 'p1',
      name: 'Anna Kowalska',
      position: 1,
      score: 143,
      chances: 2,
      isEliminated: false,
      stage1CorrectCount: 2,
      stage1QuestionsAnswered: 2
    },
    gameStats: {
      startedAt: Date.now() - 600000,
      finishedAt: Date.now(),
      durationSeconds: 600,
      totalQuestionsAsked: 28,
      totalCorrectAnswers: 15,
      totalWrongAnswers: 5,
      overallAccuracy: 75,
      finalistCount: 2
    },
    history: []
  };

  it('ranks winner first and computes correct podium ranking', () => {
    const ranked = getRankedPlayers(dummyState.players, dummyState.winner);
    expect(ranked[0].name).toBe('Anna Kowalska');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].name).toBe('Jan Nowak');
    expect(ranked[1].rank).toBe(2);
  });

  it('generates valid semicolon-delimited CSV', () => {
    const csv = generateCSV(dummyState);
    expect(csv).toContain('Miejsce;Zawodnik;Stanowisko;Punkty');
    expect(csv).toContain('1;"Anna Kowalska";1;143;2;12;10;2;83%;4;"ZWYCIĘZCA"');
    expect(csv).toContain('2;"Jan Nowak";2;62;0;8;5;3;63%;1;"Etap 3: Wielki Finał"');
  });

  it('escapes formula trigger characters in CSV export to prevent formula injection (CWE-1236)', () => {
    const maliciousState: GameState = {
      ...dummyState,
      players: [
        {
          ...dummyState.players[0],
          name: '=cmd|"/C calc"!A0'
        }
      ]
    };
    const csv = generateCSV(maliciousState);
    expect(csv).toContain("\"'=cmd|\"\"/C calc\"\"!A0\"");
  });

  it('generates valid JSON report', () => {
    const jsonStr = generateJSON(dummyState);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.gameId).toBe('JZD-TEST');
    expect(parsed.standings.length).toBe(2);
    expect(parsed.standings[0].isWinner).toBe(true);
    expect(parsed.standings[0].score).toBe(143);
  });

  it('generates rich Markdown table report', () => {
    const md = generateMarkdownReport(dummyState);
    expect(md).toContain('# 🏆 Raport Końcowy Teleturnieju: Jeden z Dziesięciu');
    expect(md).toContain('Anna Kowalska');
    expect(md).toContain('| 🥇 1 | **Anna Kowalska**');
  });
});
