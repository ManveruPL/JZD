import {
  GameConfig,
  GameEventRecord,
  GameStage,
  GameState,
  GameStatsSummary,
  Player,
  Question,
  QuestionState,
  Stage3Phase
} from '../types/index.js';
import { QuestionsRepository } from './QuestionsRepository.js';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  minPlayers: 4,
  maxPlayers: 15,
  initialChances: 3,
  stage1QuestionsPerPlayer: 2,
  answerTimeLimitSeconds: 30,
  buzzerTimeLimitSeconds: 10,
  finalQuestionsPoolCount: 40,
  finalBuzzerPoints: 10,
  finalSelfNominationPoints: 20,
  finalNominatedOpponentPoints: 10,
  finalStageThresholdPoints: 30,
  bonusPointsPerSavedChance: 10
};

export class GameEngine {
  public readonly id: string;
  private config: GameConfig;
  private questionsRepo: QuestionsRepository;
  private players: Player[] = [];
  private stage: GameStage = GameStage.LOBBY;
  private activePlayerIndex: number = 0;
  private activePlayerId: string | null = null;
  private nominationHolderId: string | null = null;
  private targetPlayerId: string | null = null;
  private isSelfNominated: boolean = false;

  private currentQuestion: Question | null = null;
  private questionState: QuestionState = QuestionState.IDLE;
  private stage3Phase: Stage3Phase | null = null;

  private finalPool: Question[] = [];
  private finalQuestionsTotal: number = 0;
  private winner: Player | null = null;
  private history: GameEventRecord[] = [];

  // Statistics & Timers
  private startedAt: number | null = null;
  private finishedAt: number | null = null;
  private totalQuestionsAsked: number = 0;

  // Stage 1 queue tracking
  private stage1Round: number = 1; // 1 or 2

  constructor(
    id: string,
    questionsRepo?: QuestionsRepository,
    customConfig?: Partial<GameConfig>
  ) {
    this.id = id;
    this.questionsRepo = questionsRepo || new QuestionsRepository();
    this.config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    this.finalQuestionsTotal = this.config.finalQuestionsPoolCount;
  }

  public updateConfig(newConfig: Partial<GameConfig>): void {
    if (this.stage !== GameStage.LOBBY) {
      throw new Error('Konfigurację można zmieniać tylko w poczekalni (Lobby).');
    }
    this.config = { ...this.config, ...newConfig };
    this.finalQuestionsTotal = this.config.finalQuestionsPoolCount;
    if (newConfig.initialChances !== undefined) {
      for (const p of this.players) {
        p.chances = newConfig.initialChances;
      }
    }
    this.logEvent('CONFIG_UPDATED', 'Zaktualizowano konfigurację parametrów gry.');
  }

  // --- LOBBY MANAGEMENT ---

  public addPlayer(name: string, customId?: string): Player {
    if (this.stage !== GameStage.LOBBY) {
      throw new Error('Nie można dodawać graczy po rozpoczęciu gry.');
    }
    if (this.players.length >= this.config.maxPlayers) {
      throw new Error(`Osiągnięto maksymalną liczbę graczy (${this.config.maxPlayers}).`);
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Imię gracza nie może być puste.');
    }

    const id = customId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer: Player = {
      id,
      name: trimmedName,
      chances: this.config.initialChances,
      score: 0,
      isEliminated: false,
      stage1CorrectCount: 0,
      stage1QuestionsAnswered: 0,
      isConnected: true,
      stats: {
        totalAnswers: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        accuracy: 0,
        selfNominations: 0,
        eliminatedInStage: null
      }
    };

    this.players.push(newPlayer);
    this.logEvent('PLAYER_JOINED', `Gracz ${trimmedName} dołączył do gry.`, id);
    return newPlayer;
  }

  public removePlayer(id: string): void {
    if (this.stage !== GameStage.LOBBY) {
      // In-game mark as disconnected or eliminated
      const p = this.players.find(x => x.id === id);
      if (p) {
        p.isConnected = false;
        this.logEvent('PLAYER_DISCONNECTED', `Gracz ${p.name} rozłączył się.`, id);
      }
      return;
    }
    this.players = this.players.filter(p => p.id !== id);
  }

  // --- GAME START ---

  public startGame(): void {
    if (this.stage !== GameStage.LOBBY) {
      throw new Error('Gra została już rozpoczęta.');
    }
    if (this.players.length < this.config.minPlayers) {
      throw new Error(`Minimalna liczba graczy to ${this.config.minPlayers} (obecnie: ${this.players.length}).`);
    }

    // 1. Shuffle players order randomly
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }

    this.startedAt = Date.now();
    this.totalQuestionsAsked = 0;

    // 2. Assign positions & init stats
    this.players.forEach((p, idx) => {
      p.position = idx + 1;
      if (!p.stats) {
        p.stats = {
          totalAnswers: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          accuracy: 0,
          selfNominations: 0,
          eliminatedInStage: null
        };
      }
    });

    // 3. Setup Stage 1
    this.stage = GameStage.STAGE_1;
    this.stage1Round = 1;
    this.activePlayerIndex = 0;
    this.activePlayerId = this.players[0].id;
    this.logEvent('GAME_STARTED', 'Gra została rozpoczęta. Rozpoczyna się Etap 1.');

    // Draw first question
    this.drawNewQuestion();
  }

  // --- STAGE 1 LOGIC ---

  private advanceStage1Turn(): void {
    const activePlayers = this.getActivePlayers();
    
    // Move to next player in current round
    this.activePlayerIndex++;

    if (this.activePlayerIndex >= this.players.length) {
      // Finished a round across all players
      if (this.stage1Round === 1) {
        // Move to Round 2
        this.stage1Round = 2;
        this.activePlayerIndex = 0;
        this.logEvent('STAGE1_ROUND2', 'Rozpoczyna się 2. kolejka pytań w Etapie 1.');
      } else {
        // Round 2 completed -> evaluate qualification to Stage 2!
        this.finishStage1();
        return;
      }
    }

    const currentP = this.players[this.activePlayerIndex];
    this.activePlayerId = currentP.id;

    // If player is already eliminated by 2 wrong answers, skip to next
    if (currentP.isEliminated || currentP.chances === 0) {
      this.advanceStage1Turn();
      return;
    }

    this.drawNewQuestion();
  }

  private finishStage1(): void {
    this.logEvent('STAGE1_FINISHING', 'Weryfikacja kwalifikacji do Etapu 2.');

    // Rule: "Aby przejść do drugiego etapu trzeba odpowiedzieć poprawnie na co najmniej jedno pytanie."
    for (const player of this.players) {
      if (!player.isEliminated && player.stage1CorrectCount === 0) {
        player.chances = 0;
        player.isEliminated = true;
        this.logEvent('ELIMINATION', `Gracz ${player.name} nie odpowiedział na żadne pytanie w Etapie 1 i odpada.`, player.id);
      }
    }

    const survivors = this.getActivePlayers();
    if (survivors.length < 3) {
      // Corner case: if less than 3 players qualified, we directly conclude or handle
      if (survivors.length === 0) {
        this.endGame(null, 'Wszyscy gracze odpadli w Etapie 1.');
        return;
      }
      if (survivors.length <= 3) {
        this.logEvent('FAST_TRACK_STAGE3', `Do kolejnego etapu zakwalifikowało się tylko ${survivors.length} graczy - bezpośredni awans do Finału.`);
        this.initStage3();
        return;
      }
    }

    if (survivors.length === 3) {
      this.logEvent('STAGE1_TO_STAGE3', 'Dokładnie 3 graczy zakwalifikowało się do dalszej gry - przejście do Finału.');
      this.initStage3();
      return;
    }

    // Transition to Stage 2
    this.stage = GameStage.STAGE_2;
    const firstActiveIdx = this.players.findIndex(p => p.id === survivors[0].id);
    this.activePlayerIndex = firstActiveIdx >= 0 ? firstActiveIdx : 0;
    this.activePlayerId = survivors[0].id;
    this.nominationHolderId = null;
    this.targetPlayerId = null;
    this.logEvent('STAGE_2_STARTED', `Rozpoczyna się Etap 2. Pytanie 1 dla gracza ${survivors[0].name}.`, survivors[0].id);

    this.drawNewQuestion();
  }

  // --- STAGE 2 LOGIC ---

  public nominate(targetPlayerId: string): void {
    if (this.stage === GameStage.STAGE_2) {
      if (!this.nominationHolderId) {
        throw new Error('Brak uprawnień do wyznaczania gracza.');
      }
      const target = this.players.find(p => p.id === targetPlayerId);
      if (!target || target.isEliminated || target.chances === 0) {
        throw new Error('Wyznaczony gracz nie bierze udziału w grze lub odpadł.');
      }
      if (target.id === this.nominationHolderId) {
        throw new Error('W Etapie 2 nie można wyznaczyć samego siebie.');
      }

      const nominator = this.players.find(p => p.id === this.nominationHolderId);
      this.activePlayerId = target.id;
      this.targetPlayerId = target.id;
      this.logEvent('NOMINATED', `Gracz ${nominator?.name} wyznacza do odpowiedzi gracza ${target.name}.`, target.id);

      this.drawNewQuestion();
      return;
    }

    if (this.stage === GameStage.STAGE_3) {
      if (this.stage3Phase !== Stage3Phase.NOMINATING) {
        throw new Error('Wyznaczanie jest możliwe tylko w fazie wyznaczania Finału.');
      }
      if (!this.nominationHolderId) {
        throw new Error('Brak uprawnień do wyznaczania gracza.');
      }

      const nominator = this.players.find(p => p.id === this.nominationHolderId);
      const isSelf = targetPlayerId === this.nominationHolderId;

      if (isSelf) {
        this.isSelfNominated = true;
        this.activePlayerId = this.nominationHolderId;
        this.targetPlayerId = this.nominationHolderId;
        this.stage3Phase = Stage3Phase.ANSWERING_NOMINATED;
        if (nominator?.stats) {
          nominator.stats.selfNominations++;
        }
        this.logEvent('SELF_NOMINATED', `Gracz ${nominator?.name} bierze pytanie na siebie (+20 pkt).`, this.nominationHolderId);
      } else {
        const target = this.players.find(p => p.id === targetPlayerId);
        if (!target || target.isEliminated || target.chances === 0) {
          throw new Error('Wyznaczony gracz nie bierze udziału w grze lub odpadł.');
        }
        this.isSelfNominated = false;
        this.activePlayerId = target.id;
        this.targetPlayerId = target.id;
        this.stage3Phase = Stage3Phase.ANSWERING_NOMINATED;
        this.logEvent('NOMINATED_FINAL', `Gracz ${nominator?.name} wyznacza gracza ${target.name}.`, target.id);
      }

      this.drawQuestionFromFinalPool();
      return;
    }

    throw new Error('Wyznaczanie nie jest aktywne w tym etapie gry.');
  }

  // --- STAGE 3 (FINAŁ) LOGIC ---

  private initStage3(): void {
    this.stage = GameStage.STAGE_3;
    const finalists = this.getActivePlayers();

    // 1. Initial points = remaining saved chances
    finalists.forEach(p => {
      p.score = p.chances;
      this.logEvent('FINALIST_START_SCORE', `Finalista ${p.name} rozpoczyna Finał z liczbą ${p.score} pkt (za zachowane szanse).`, p.id);
    });

    // 2. Draw 40 questions into final pool
    this.finalPool = this.questionsRepo.drawPool(this.config.finalQuestionsPoolCount);
    this.finalQuestionsTotal = this.config.finalQuestionsPoolCount;

    // 3. Start Phase 1: Open Buzzer Questions
    this.stage3Phase = Stage3Phase.BUZZER;
    this.nominationHolderId = null;
    this.activePlayerId = null;
    this.targetPlayerId = null;
    this.isSelfNominated = false;

    this.logEvent('STAGE_3_STARTED', `Rozpoczyna się Wielki Finał! Pula finałowa: ${this.finalPool.length} pytań.`);
    this.drawQuestionFromFinalPool();
  }

  public buzz(playerId: string): void {
    if (this.stage !== GameStage.STAGE_3 || this.stage3Phase !== Stage3Phase.BUZZER) {
      throw new Error('Buzzer nie jest aktywny w tym momencie.');
    }
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.isEliminated || player.chances === 0) {
      throw new Error('Gracz nie może zgłosić się do odpowiedzi.');
    }

    this.activePlayerId = playerId;
    this.stage3Phase = Stage3Phase.ANSWERING;
    this.questionState = QuestionState.ANSWERING;
    this.logEvent('BUZZED', `Gracz ${player.name} pierwszy zgłosił się do odpowiedzi (Buzzer).`, playerId);
  }

  public skipBuzzerQuestion(): void {
    if (this.stage !== GameStage.STAGE_3 || this.stage3Phase !== Stage3Phase.BUZZER) {
      throw new Error('Pytanie można pominąć tylko podczas otwartego zgłoszenia.');
    }

    this.logEvent('QUESTION_SKIPPED', 'Nikt nie zgłosił się w ciągu 10 sekund. Pytanie przepada.');
    this.checkFinalPoolAndContinueBuzzer();
  }

  private checkFinalPoolAndContinueBuzzer(): void {
    if (this.finalPool.length === 0) {
      this.endGameByQuestionsExhausted();
      return;
    }
    this.stage3Phase = Stage3Phase.BUZZER;
    this.activePlayerId = null;
    this.nominationHolderId = null;
    this.drawQuestionFromFinalPool();
  }

  // --- ANSWER EVALUATION ---

  public recordAnswer(isCorrect: boolean): void {
    if (!this.currentQuestion) {
      throw new Error('Brak aktywnego pytania.');
    }

    const answeringPlayer = this.players.find(p => p.id === this.activePlayerId);
    if (answeringPlayer) {
      if (!answeringPlayer.stats) {
        answeringPlayer.stats = {
          totalAnswers: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          accuracy: 0,
          selfNominations: 0,
          eliminatedInStage: null
        };
      }
      answeringPlayer.stats.totalAnswers++;
      if (isCorrect) {
        answeringPlayer.stats.correctAnswers++;
      } else {
        answeringPlayer.stats.wrongAnswers++;
      }
      answeringPlayer.stats.accuracy = Math.round(
        (answeringPlayer.stats.correctAnswers / answeringPlayer.stats.totalAnswers) * 100
      );
    }

    if (this.stage === GameStage.STAGE_1) {
      this.handleAnswerStage1(isCorrect);
    } else if (this.stage === GameStage.STAGE_2) {
      this.handleAnswerStage2(isCorrect);
    } else if (this.stage === GameStage.STAGE_3) {
      this.handleAnswerStage3(isCorrect);
    }

    if (answeringPlayer?.isEliminated && answeringPlayer.stats && !answeringPlayer.stats.eliminatedInStage) {
      answeringPlayer.stats.eliminatedInStage = this.stage;
    }
  }

  private handleAnswerStage1(isCorrect: boolean): void {
    const player = this.players.find(p => p.id === this.activePlayerId);
    if (!player) return;

    player.stage1QuestionsAnswered++;

    if (isCorrect) {
      player.stage1CorrectCount++;
      this.logEvent('ANSWER_CORRECT', `Gracz ${player.name} odpowiedział poprawnie na pytanie w Etapie 1.`, player.id);
    } else {
      player.chances--;
      this.logEvent('ANSWER_WRONG', `Gracz ${player.name} odpowiedział błędnie i traci szansę (pozostało: ${player.chances}).`, player.id);

      // Rule: In Stage 1, a wrong answer on the 2nd question (if 1st was also wrong) eliminates the player and wipes both remaining chances
      if (player.stage1QuestionsAnswered === 2 && player.stage1CorrectCount === 0) {
        player.chances = 0;
        player.isEliminated = true;
        this.logEvent('ELIMINATION', `Gracz ${player.name} odpowiedział błędnie na oba pytania w Etapie 1 i traci wszystkie szanse (odpada z gry).`, player.id);
      } else if (player.chances === 0) {
        player.isEliminated = true;
        this.logEvent('ELIMINATION', `Gracz ${player.name} stracił wszystkie szanse i odpada z gry.`, player.id);
      }
    }

    this.advanceStage1Turn();
  }

  private handleAnswerStage2(isCorrect: boolean): void {
    const player = this.players.find(p => p.id === this.activePlayerId);
    if (!player) return;

    if (isCorrect) {
      // Player gains nomination rights
      this.nominationHolderId = player.id;
      this.activePlayerId = null;
      this.targetPlayerId = null;
      this.questionState = QuestionState.IDLE;
      this.logEvent('ANSWER_CORRECT_NOMINATE', `Gracz ${player.name} odpowiedział poprawnie i uzyskuje prawo wyznaczania rywala.`, player.id);
    } else {
      // Wrong answer -> loses chance
      player.chances--;
      this.logEvent('ANSWER_WRONG', `Gracz ${player.name} odpowiedział błędnie i traci szansę (pozostało: ${player.chances}).`, player.id);
      if (player.chances === 0) {
        player.isEliminated = true;
        this.logEvent('ELIMINATION', `Gracz ${player.name} stracił wszystkie szanse i odpada z gry.`, player.id);
      }

      // Check if exactly 3 players remain
      const activePlayers = this.getActivePlayers();
      if (activePlayers.length === 3) {
        this.logEvent('STAGE2_TO_STAGE3', 'W grze pozostało dokładnie 3 graczy. Przejście do Wielkiego Finału!');
        this.initStage3();
        return;
      }
      if (activePlayers.length < 3) {
        // Less than 3 remaining (e.g. game over)
        this.checkFinalGameOver();
        return;
      }

      // Check if there was an active nominator who retains nomination rights
      const nominator = this.nominationHolderId
        ? this.players.find(p => p.id === this.nominationHolderId)
        : null;

      if (nominator && !nominator.isEliminated && nominator.chances > 0) {
        // Rule: In Stage 2, if the nominated player answers wrong, the nominator keeps nomination rights
        this.activePlayerId = null;
        this.targetPlayerId = null;
        this.questionState = QuestionState.IDLE;
        this.logEvent(
          'NOMINATION_RETAINED',
          `Gracz ${player.name} odpowiedział błędnie. Prawo wyznaczania rywala zachowuje gracz ${nominator.name}.`,
          nominator.id
        );
        return;
      }

      // Pass turn to the next player on the list in cyclic order
      this.advanceStage2ToNextPlayer();
    }
  }

  private advanceStage2ToNextPlayer(): void {
    const active = this.getActivePlayers();
    if (active.length === 0) return;

    let currentIdx = this.players.findIndex(p => p.id === this.activePlayerId);
    if (currentIdx < 0) currentIdx = this.activePlayerIndex;

    // Find current index in full players array and cycle
    let nextIdx = (currentIdx + 1) % this.players.length;
    while (this.players[nextIdx].isEliminated || this.players[nextIdx].chances === 0) {
      nextIdx = (nextIdx + 1) % this.players.length;
    }

    this.activePlayerIndex = nextIdx;
    const nextPlayer = this.players[nextIdx];
    this.activePlayerId = nextPlayer.id;
    this.nominationHolderId = null;
    this.targetPlayerId = null;

    this.logEvent('STAGE2_NEXT_PLAYER', `Kolejne pytanie dla gracza ${nextPlayer.name} wg listy.`, nextPlayer.id);
    this.drawNewQuestion();
  }

  private handleAnswerStage3(isCorrect: boolean): void {
    const player = this.players.find(p => p.id === this.activePlayerId);
    if (!player) return;

    if (this.stage3Phase === Stage3Phase.ANSWERING) {
      // --- Phase 1: General Buzzer Answer ---
      if (isCorrect) {
        player.score += this.config.finalBuzzerPoints;
        this.logEvent('FINAL_BUZZER_CORRECT', `Gracz ${player.name} odpowiada poprawnie! +${this.config.finalBuzzerPoints} pkt (Razem: ${player.score} pkt).`, player.id);

        // Check if any player crossed threshold (> 30 pts)
        if (player.score > this.config.finalStageThresholdPoints) {
          this.stage3Phase = Stage3Phase.NOMINATING;
          this.nominationHolderId = player.id;
          this.activePlayerId = null;
          this.logEvent('THRESHOLD_REACHED', `Gracz ${player.name} przekroczył ${this.config.finalStageThresholdPoints} pkt! Przejście do fazy wyznaczania.`, player.id);
          return;
        }

        // Still in buzzer phase: continue to next question
        this.checkFinalPoolAndContinueBuzzer();
      } else {
        // Wrong answer in buzzer phase: loses 1 chance
        player.chances--;
        this.logEvent('FINAL_BUZZER_WRONG', `Gracz ${player.name} odpowiada błędnie i traci szansę (pozostało: ${player.chances}).`, player.id);
        if (player.chances === 0) {
          player.isEliminated = true;
          this.logEvent('ELIMINATION', `Gracz ${player.name} traci ostatnią szansę w Finale!`, player.id);
        }

        if (this.checkFinalGameOver()) return;
        this.checkFinalPoolAndContinueBuzzer();
      }
    } else if (this.stage3Phase === Stage3Phase.ANSWERING_NOMINATED) {
      // --- Phase 2: Nomination Phase ---
      if (this.isSelfNominated) {
        // Taking question on oneself ("Biorę na siebie")
        if (isCorrect) {
          player.score += this.config.finalSelfNominationPoints;
          this.logEvent('SELF_NOMINATION_CORRECT', `Gracz ${player.name} odpowiada poprawnie na własne pytanie! +${this.config.finalSelfNominationPoints} pkt (Razem: ${player.score} pkt).`, player.id);
          // Retains nomination rights!
          this.stage3Phase = Stage3Phase.NOMINATING;
          this.activePlayerId = null;
        } else {
          // Wrong answer on self nomination
          player.chances--;
          this.logEvent('SELF_NOMINATION_WRONG', `Gracz ${player.name} pomylił się biorąc na siebie! Traci szansę (pozostało: ${player.chances}).`, player.id);
          if (player.chances === 0) {
            player.isEliminated = true;
            this.logEvent('ELIMINATION', `Gracz ${player.name} odpada z Finału!`, player.id);
          }

          if (this.checkFinalGameOver()) return;

          // Rule: Return to general buzzer phase!
          this.logEvent('RETURN_TO_BUZZER', 'Po błędzie na własne życzenie następuje powrót do pytań ogólnych (Buzzer).');
          this.checkFinalPoolAndContinueBuzzer();
        }
      } else {
        // Nominated opponent was answering
        const nominator = this.players.find(p => p.id === this.nominationHolderId);

        if (isCorrect) {
          player.score += this.config.finalNominatedOpponentPoints;
          this.logEvent('NOMINATED_CORRECT', `Wyznaczony gracz ${player.name} odpowiada poprawnie! +${this.config.finalNominatedOpponentPoints} pkt i przejmuje wyznaczanie.`, player.id);
          // Target player gains nomination rights
          this.nominationHolderId = player.id;
          this.stage3Phase = Stage3Phase.NOMINATING;
          this.activePlayerId = null;
        } else {
          // Wrong answer by nominated opponent
          player.chances--;
          this.logEvent('NOMINATED_WRONG', `Wyznaczony gracz ${player.name} odpowiada błędnie i traci szansę (pozostało: ${player.chances}).`, player.id);
          if (player.chances === 0) {
            player.isEliminated = true;
            this.logEvent('ELIMINATION', `Gracz ${player.name} odpada z Finału!`, player.id);
          }

          if (this.checkFinalGameOver()) return;

          // Rule: Nomination rights return to the nominator!
          if (nominator && !nominator.isEliminated && nominator.chances > 0) {
            this.logEvent('NOMINATION_RETAINED', `Głos wraca do gracza ${nominator.name}, który wyznaczył rywala.`, nominator.id);
            this.stage3Phase = Stage3Phase.NOMINATING;
            this.activePlayerId = null;
          } else {
            // If nominator was somehow eliminated, return to buzzer
            this.checkFinalPoolAndContinueBuzzer();
          }
        }
      }
    }
  }

  // --- GAME ENDING CONDITIONS ---

  private checkFinalGameOver(): boolean {
    const active = this.getActivePlayers();

    // Condition 1: Only 0 or 1 player left with chances
    if (active.length <= 1) {
      const winner = this.getHighestScoringPlayer();
      this.endGame(winner, 'Wszyscy rywale stracili szanse.');
      return true;
    }

    // Condition 2: Questions pool ran out
    if (this.finalPool.length === 0) {
      this.endGameByQuestionsExhausted();
      return true;
    }

    return false;
  }

  private endGameByQuestionsExhausted(): void {
    this.logEvent('POOL_EXHAUSTED', 'Pula 40 pytań finałowych została wyczerpana! Naliczanie bonusu +10 pkt za zachowane szanse.');

    // Add +10 pts bonus for each remaining chance
    this.getActivePlayers().forEach(p => {
      const bonus = p.chances * this.config.bonusPointsPerSavedChance;
      p.score += bonus;
      this.logEvent('BONUS_POINTS', `Gracz ${p.name} otrzymuje +${bonus} pkt bonusu za ${p.chances} zachowane szanse. Razem: ${p.score} pkt.`, p.id);
    });

    const winner = this.getHighestScoringPlayer();
    this.endGame(winner, 'Koniec pytań finałowych.');
  }

  private endGame(winner: Player | null, reason: string): void {
    this.stage = GameStage.FINISHED;
    this.winner = winner;
    this.finishedAt = Date.now();
    this.questionState = QuestionState.IDLE;
    this.currentQuestion = null;
    this.activePlayerId = null;

    if (winner) {
      this.logEvent('GAME_OVER', `Koniec gry! Zwycięzcą zostaje ${winner.name} z wynikiem ${winner.score} pkt! Powód: ${reason}`, winner.id);
    } else {
      this.logEvent('GAME_OVER', `Koniec gry! ${reason}`);
    }
  }

  // --- DRAWING QUESTIONS ---

  private drawNewQuestion(): void {
    this.totalQuestionsAsked++;
    this.currentQuestion = this.questionsRepo.drawQuestion();
    this.questionState = QuestionState.ANSWERING;
  }

  private drawQuestionFromFinalPool(): void {
    if (this.finalPool.length === 0) {
      this.endGameByQuestionsExhausted();
      return;
    }

    this.totalQuestionsAsked++;
    this.currentQuestion = this.finalPool.shift()!;
    if (this.stage3Phase === Stage3Phase.BUZZER) {
      this.questionState = QuestionState.BUZZER_OPEN;
    } else {
      this.questionState = QuestionState.ANSWERING;
    }
  }

  // --- MANUAL ADJUSTMENTS & HELPERS ---

  public manualAdjustScore(playerId: string, delta: number): void {
    const p = this.players.find(x => x.id === playerId);
    if (!p) throw new Error('Nie znaleziono gracza.');
    p.score = Math.max(0, p.score + delta);
    this.logEvent('MANUAL_SCORE_ADJUST', `Mistrz Gry skorygował punkty gracza ${p.name} o ${delta > 0 ? '+' : ''}${delta} (Razem: ${p.score} pkt).`, playerId);
  }

  public manualAdjustChances(playerId: string, delta: number): void {
    const p = this.players.find(x => x.id === playerId);
    if (!p) throw new Error('Nie znaleziono gracza.');
    p.chances = Math.max(0, Math.min(3, p.chances + delta));
    p.isEliminated = p.chances === 0;
    this.logEvent('MANUAL_CHANCES_ADJUST', `Mistrz Gry skorygował szanse gracza ${p.name} o ${delta > 0 ? '+' : ''}${delta} (Szanse: ${p.chances}).`, playerId);
  }

  public getActivePlayers(): Player[] {
    return this.players.filter(p => !p.isEliminated && p.chances > 0);
  }

  public getHighestScoringPlayer(): Player | null {
    if (this.players.length === 0) return null;
    return [...this.players].sort((a, b) => b.score - a.score)[0];
  }

  private logEvent(type: string, description: string, playerId?: string): void {
    this.history.push({
      timestamp: Date.now(),
      stage: this.stage,
      type,
      playerId,
      description
    });
  }

  // --- STATE SNAPSHOTS ---

  public buildGameStatsSummary(): GameStatsSummary {
    const durationSeconds = this.startedAt
      ? Math.max(0, Math.round(((this.finishedAt || Date.now()) - this.startedAt) / 1000))
      : 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    for (const p of this.players) {
      if (p.stats) {
        totalCorrect += p.stats.correctAnswers;
        totalWrong += p.stats.wrongAnswers;
      }
    }

    const totalAnswers = totalCorrect + totalWrong;
    const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    const finalists = this.players.filter(
      p => p.stats?.eliminatedInStage === GameStage.STAGE_3 || p.id === this.winner?.id
    ).length;

    return {
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationSeconds,
      totalQuestionsAsked: this.totalQuestionsAsked,
      totalCorrectAnswers: totalCorrect,
      totalWrongAnswers: totalWrong,
      overallAccuracy,
      finalistCount: finalists || (this.players.length >= 3 ? 3 : this.players.length)
    };
  }

  public getState(): GameState {
    return {
      id: this.id,
      stage: this.stage,
      config: { ...this.config },
      players: this.players.map(p => ({ ...p })),
      activePlayerId: this.activePlayerId,
      nominationHolderId: this.nominationHolderId,
      targetPlayerId: this.targetPlayerId,
      isSelfNominated: this.isSelfNominated,
      currentQuestion: this.currentQuestion ? { ...this.currentQuestion } : null,
      questionState: this.questionState,
      stage3Phase: this.stage3Phase,
      finalQuestionsRemaining: this.finalPool.length + (this.currentQuestion ? 1 : 0),
      finalQuestionsTotal: this.finalQuestionsTotal,
      timer: null,
      winner: this.winner ? { ...this.winner } : null,
      gameStats: this.stage === GameStage.FINISHED ? this.buildGameStatsSummary() : undefined,
      history: [...this.history]
    };
  }

  public getPublicState(): GameState {
    const state = this.getState();
    // Hide answer and aliases for public/players view
    if (state.currentQuestion) {
      state.currentQuestion = {
        ...state.currentQuestion,
        answer: '***',
        aliases: undefined
      };
    }
    return state;
  }
}
