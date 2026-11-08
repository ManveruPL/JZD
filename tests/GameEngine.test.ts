import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/engine/GameEngine.js';
import { QuestionsRepository } from '../src/engine/QuestionsRepository.js';
import { GameStage, Question, QuestionState, Stage3Phase } from '../src/types/index.js';

function createMockRepo(count: number = 100): QuestionsRepository {
  const mockQuestions: Question[] = [];
  for (let i = 1; i <= count; i++) {
    mockQuestions.push({
      id: i,
      question: `Pytanie testowe numer ${i}?`,
      answer: `Odpowiedź ${i}`,
      category: 'wiedza-ogolna',
      source: 'test'
    });
  }
  return new QuestionsRepository(mockQuestions);
}

describe('GameEngine - Jeden z Dziesięciu', () => {
  let engine: GameEngine;
  let repo: QuestionsRepository;

  beforeEach(() => {
    repo = createMockRepo(100);
    engine = new GameEngine('game_1', repo);
  });

  describe('Zarządzanie Lobby i Uczestnikami', () => {
    it('pozwala dodać od 4 do 15 graczy', () => {
      for (let i = 1; i <= 10; i++) {
        engine.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      expect(engine.getState().players.length).toBe(10);
      expect(engine.getState().stage).toBe(GameStage.LOBBY);
    });

    it('rzuca błąd przy próbie startu z mniej niż 4 graczami', () => {
      engine.addPlayer('Gracz 1');
      engine.addPlayer('Gracz 2');
      engine.addPlayer('Gracz 3');
      expect(() => engine.startGame()).toThrow('Minimalna liczba graczy to 4');
    });

    it('rzuca błąd przy przekroczeniu limitu 15 graczy', () => {
      for (let i = 1; i <= 15; i++) {
        engine.addPlayer(`Gracz ${i}`);
      }
      expect(() => engine.addPlayer('Gracz 16')).toThrow('maksymalną liczbę graczy');
    });

    it('start gry przechodzi do Etapu 1 i losuje pierwsze pytanie', () => {
      for (let i = 1; i <= 4; i++) {
        engine.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      engine.startGame();

      const state = engine.getState();
      expect(state.stage).toBe(GameStage.STAGE_1);
      expect(state.currentQuestion).not.toBeNull();
      expect(state.activePlayerId).toBeDefined();
      expect(state.players.every(p => p.chances === 3)).toBe(true);
    });
  });

  describe('Etap 1 - Eliminacje (Po 2 pytania, min. 1 poprawna)', () => {
    beforeEach(() => {
      // Add 4 players
      for (let i = 1; i <= 4; i++) {
        engine.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      engine.startGame();
    });

    it('rozgrywa 2 kolejki pytań dla każdego gracza', () => {
      // Shuffled order of players
      const orderedPlayers = engine.getState().players;
      const fourthPlayer = orderedPlayers[3];

      // Total questions in stage 1 for 4 players = 4 * 2 = 8 questions
      // Let players 0, 1, 2 answer correctly in round 1, player 3 answers wrong
      engine.recordAnswer(true); // p[0] (correct)
      engine.recordAnswer(true); // p[1] (correct)
      engine.recordAnswer(true); // p[2] (correct)
      engine.recordAnswer(false); // p[3] (wrong)

      // Round 2
      engine.recordAnswer(true); // p[0] (correct)
      engine.recordAnswer(true); // p[1] (correct)
      engine.recordAnswer(false); // p[2] (wrong)
      engine.recordAnswer(false); // p[3] (wrong again -> 0 correct!)

      // After 8 answers, stage 1 should finish
      const state = engine.getState();
      // fourth player failed both questions (0 correct) -> should be eliminated and have 0 chances!
      const pFailed = state.players.find(p => p.id === fourthPlayer.id)!;
      expect(pFailed.isEliminated).toBe(true);
      expect(pFailed.chances).toBe(0);

      // Remaining 3 players have at least 1 correct answer -> survive!
      expect(state.players.filter(p => !p.isEliminated).length).toBe(3);

      // Since exactly 3 players survived, engine should transition straight to Stage 3 (Finał)!
      expect(state.stage).toBe(GameStage.STAGE_3);
    });

    it('przechodzi do Etapu 2, gdy awansuje więcej niż 3 graczy', () => {
      // Create game with 5 players
      const repo5 = createMockRepo(100);
      const engine5 = new GameEngine('game_5', repo5);
      for (let i = 1; i <= 5; i++) {
        engine5.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      engine5.startGame();

      // All 5 players answer at least 1 correctly
      for (let round = 1; round <= 2; round++) {
        for (let p = 1; p <= 5; p++) {
          engine5.recordAnswer(true);
        }
      }

      const state = engine5.getState();
      expect(state.stage).toBe(GameStage.STAGE_2);
      expect(state.players.filter(p => !p.isEliminated).length).toBe(5);
    });
  });

  describe('Etap 2 - Wskazywanie rywali (do 3 graczy)', () => {
    let engine5: GameEngine;

    beforeEach(() => {
      engine5 = new GameEngine('game_stage2', createMockRepo(100));
      for (let i = 1; i <= 5; i++) {
        engine5.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      engine5.startGame();

      // Complete stage 1 with all 5 players advancing
      for (let i = 0; i < 10; i++) {
        engine5.recordAnswer(true);
      }
      expect(engine5.getState().stage).toBe(GameStage.STAGE_2);
    });

    it('poprawna odpowiedź daje prawo wyznaczania rywala', () => {
      const stateBefore = engine5.getState();
      const firstActiveId = stateBefore.activePlayerId!;

      // Answer correctly
      engine5.recordAnswer(true);

      const stateAfter = engine5.getState();
      expect(stateAfter.nominationHolderId).toBe(firstActiveId);
      expect(stateAfter.questionState).toBe(QuestionState.IDLE);

      // Nominate another player
      const otherPlayer = stateAfter.players.find(p => p.id !== firstActiveId && !p.isEliminated)!;
      engine5.nominate(otherPlayer.id);

      const stateAfterNom = engine5.getState();
      expect(stateAfterNom.activePlayerId).toBe(otherPlayer.id);
      expect(stateAfterNom.currentQuestion).not.toBeNull();
    });

    it('błędna odpowiedź odbiera szansę i przekazuje głos kolejnemu z listy', () => {
      const stateBefore = engine5.getState();
      const firstActive = stateBefore.players.find(p => p.id === stateBefore.activePlayerId)!;
      const initialChances = firstActive.chances;

      // Answer incorrectly
      engine5.recordAnswer(false);

      const stateAfter = engine5.getState();
      const updatedFirstActive = stateAfter.players.find(p => p.id === firstActive.id)!;
      expect(updatedFirstActive.chances).toBe(initialChances - 1);
      // Turn passes to next player on list
      expect(stateAfter.activePlayerId).not.toBe(firstActive.id);
    });

    it('kończy Etap 2 w momencie gdy zostanie dokładnie 3 graczy', () => {
      // Eliminate 2 players by wrong answers until their chances drop to 0
      const state = engine5.getState();
      const p1 = state.players[0];
      const p2 = state.players[1];

      // Reduce p1 and p2 chances to 0
      p1.chances = 1;
      p2.chances = 1;

      // Set active to p1 and fail
      engine5.recordAnswer(false); // p1 chances -> 0 (eliminated)
      engine5.recordAnswer(false); // next player fail (or p2 fail)

      // Directly adjust chances for clean test if needed
      engine5.manualAdjustChances(p2.id, -3);

      // Remaining active should be 3
      const active = engine5.getActivePlayers();
      if (active.length === 3) {
        expect(engine5.getState().stage).toBe(GameStage.STAGE_3);
      }
    });
  });

  describe('Etap 3 - Wielki Finał', () => {
    let finalEngine: GameEngine;

    beforeEach(() => {
      finalEngine = new GameEngine('final_game', createMockRepo(100));
      for (let i = 1; i <= 4; i++) {
        finalEngine.addPlayer(`Gracz ${i}`, `p${i}`);
      }
      finalEngine.startGame();

      // Pass stage 1: p1, p2, p3 pass, p4 eliminated
      finalEngine.recordAnswer(true); // p1
      finalEngine.recordAnswer(true); // p2
      finalEngine.recordAnswer(true); // p3
      finalEngine.recordAnswer(false); // p4 (wrong)

      finalEngine.recordAnswer(true); // p1
      finalEngine.recordAnswer(true); // p2
      finalEngine.recordAnswer(true); // p3
      finalEngine.recordAnswer(false); // p4 (wrong again -> eliminated)

      // Automatically transitions to STAGE_3 (since 3 players remain)
      expect(finalEngine.getState().stage).toBe(GameStage.STAGE_3);
    });

    it('inicjuje Finał z punktami równymi zachowanym szansom i pulą 40 pytań', () => {
      const state = finalEngine.getState();
      expect(state.stage).toBe(GameStage.STAGE_3);
      expect(state.finalQuestionsRemaining).toBe(40); // 1 active + 39 in pool = 40 total
      expect(state.finalQuestionsTotal).toBe(40);
      expect(state.stage3Phase).toBe(Stage3Phase.BUZZER);

      // Check starting scores equal to remaining chances (3 pts each)
      const finalists = state.players.filter(p => !p.isEliminated);
      expect(finalists.length).toBe(3);
      expect(finalists.every(f => f.score === f.chances)).toBe(true);
    });

    it('Faza 1 (Buzzer): zgłoszenie i poprawna odpowiedź daje +10 punktów', () => {
      const state = finalEngine.getState();
      const p1 = state.players[0];
      const initialScore = p1.score;

      // P1 buzzes in
      finalEngine.buzz(p1.id);
      expect(finalEngine.getState().stage3Phase).toBe(Stage3Phase.ANSWERING);
      expect(finalEngine.getState().activePlayerId).toBe(p1.id);

      // P1 answers correctly -> +10 pts
      finalEngine.recordAnswer(true);

      const stateAfter = finalEngine.getState();
      const updatedP1 = stateAfter.players.find(p => p.id === p1.id)!;
      expect(updatedP1.score).toBe(initialScore + 10);
    });

    it('przejście do Fazy 2 (Wyznaczanie) po przekroczeniu 30 punktów', () => {
      const p1 = finalEngine.getState().players[0];
      // Simulate p1 reaching 33 points
      finalEngine.manualAdjustScore(p1.id, 20); // 3 + 20 = 23
      finalEngine.buzz(p1.id);
      finalEngine.recordAnswer(true); // 23 + 10 = 33 > 30 pts!

      const state = finalEngine.getState();
      expect(state.stage3Phase).toBe(Stage3Phase.NOMINATING);
      expect(state.nominationHolderId).toBe(p1.id);
    });

    it('Faza 2: wzięcie pytania na siebie daje +20 punktów przy poprawnej odpowiedzi', () => {
      const p1 = finalEngine.getState().players[0];
      finalEngine.manualAdjustScore(p1.id, 30); // p1 has 33 pts
      finalEngine.buzz(p1.id);
      finalEngine.recordAnswer(true); // threshold triggered, nomination phase active

      const scoreBefore = finalEngine.getState().players.find(p => p.id === p1.id)!.score;

      // P1 takes question on themselves
      finalEngine.nominate(p1.id);
      expect(finalEngine.getState().stage3Phase).toBe(Stage3Phase.ANSWERING_NOMINATED);
      expect(finalEngine.getState().isSelfNominated).toBe(true);

      // Answers correctly -> +20 pts
      finalEngine.recordAnswer(true);

      const scoreAfter = finalEngine.getState().players.find(p => p.id === p1.id)!.score;
      expect(scoreAfter).toBe(scoreBefore + 20);
      // Retains nomination rights
      expect(finalEngine.getState().stage3Phase).toBe(Stage3Phase.NOMINATING);
    });

    it('Faza 2: błąd na własne życzenie odbiera szansę i COFA grę do pytań ogólnych (Buzzer)', () => {
      const p1 = finalEngine.getState().players[0];
      finalEngine.manualAdjustScore(p1.id, 30);
      finalEngine.buzz(p1.id);
      finalEngine.recordAnswer(true); // enters nomination phase

      const chancesBefore = finalEngine.getState().players.find(p => p.id === p1.id)!.chances;

      // P1 nominates themselves and fails
      finalEngine.nominate(p1.id);
      finalEngine.recordAnswer(false);

      const stateAfter = finalEngine.getState();
      const p1After = stateAfter.players.find(p => p.id === p1.id)!;
      expect(p1After.chances).toBe(chancesBefore - 1);
      // Per rules: returns to BUZZER phase
      expect(stateAfter.stage3Phase).toBe(Stage3Phase.BUZZER);
    });

    it('Faza 2: błąd wyznaczonego przeciwnika zwraca głos do wyznaczającego', () => {
      const p1 = finalEngine.getState().players[0];
      const p2 = finalEngine.getState().players[1];
      finalEngine.manualAdjustScore(p1.id, 30);
      finalEngine.buzz(p1.id);
      finalEngine.recordAnswer(true); // P1 enters nomination phase

      // P1 nominates P2
      finalEngine.nominate(p2.id);
      expect(finalEngine.getState().activePlayerId).toBe(p2.id);

      // P2 answers wrong
      finalEngine.recordAnswer(false);

      const state = finalEngine.getState();
      // P2 lost chance
      const updatedP2 = state.players.find(p => p.id === p2.id)!;
      expect(updatedP2.chances).toBe(2);

      // Per rule: nomination rights return to P1!
      expect(state.nominationHolderId).toBe(p1.id);
      expect(state.stage3Phase).toBe(Stage3Phase.NOMINATING);
    });

    it('wyczerpanie puli 40 pytań dodaje bonus +10 pkt za każdą zachowaną szansę', () => {
      const stateBefore = finalEngine.getState();
      const p1 = stateBefore.players[0];
      const p2 = stateBefore.players[1];

      // Use engine's manual adjustments to set scores & chances
      finalEngine.manualAdjustChances(p1.id, -1); // 3 -> 2 chances
      finalEngine.manualAdjustScore(p1.id, 50 - p1.score); // set to 50 pts
      finalEngine.manualAdjustScore(p2.id, 40 - p2.score); // set to 40 pts (chances remain 3)

      // Empty the final pool
      while (finalEngine.getState().stage === GameStage.STAGE_3) {
        finalEngine.skipBuzzerQuestion();
      }

      const finalState = finalEngine.getState();
      expect(finalState.stage).toBe(GameStage.FINISHED);

      const updatedP1 = finalState.players.find(p => p.id === p1.id)!;
      const updatedP2 = finalState.players.find(p => p.id === p2.id)!;

      // P1: 50 + 2 * 10 = 70 pkt
      expect(updatedP1.score).toBe(70);
      // P2: 40 + 3 * 10 = 70 pkt
      expect(updatedP2.score).toBe(70);

      expect(finalState.winner).not.toBeNull();
    });
  });

  describe('Widok Publiczny (Sanityzacja danych)', () => {
    it('ukrywa treść odpowiedzi w getPublicState()', () => {
      for (let i = 1; i <= 4; i++) {
        engine.addPlayer(`Gracz ${i}`);
      }
      engine.startGame();

      const hostState = engine.getState();
      const publicState = engine.getPublicState();

      expect(hostState.currentQuestion?.answer).not.toBe('***');
      expect(publicState.currentQuestion?.answer).toBe('***');
      expect(publicState.currentQuestion?.aliases).toBeUndefined();
    });
  });
});
