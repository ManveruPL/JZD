import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { buildApp, AppServerContext } from '../src/server/app.js';
import { QuestionsRepository } from '../src/engine/QuestionsRepository.js';
import { Question } from '../src/types/index.js';
import { ClientToServerEvents, ServerToClientEvents } from '../src/types/socket.js';

function createMockQuestions(): Question[] {
  const qs: Question[] = [];
  for (let i = 1; i <= 60; i++) {
    qs.push({
      id: i,
      question: `Pytanie testowe ${i}?`,
      answer: `Odpowiedź ${i}`,
      category: 'wiedza-ogolna',
      source: 'test'
    });
  }
  return qs;
}

describe('Fastify & Socket.IO Server Integration', () => {
  let serverContext: AppServerContext;
  let serverUrl: string;
  let hostSocket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let playerSocket1: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let playerSocket2: ClientSocket<ServerToClientEvents, ClientToServerEvents>;

  beforeAll(async () => {
    const repo = new QuestionsRepository(createMockQuestions());
    serverContext = await buildApp(repo);

    // Listen on random free port (0)
    await serverContext.app.listen({ port: 0, host: '127.0.0.1' });
    const address = serverContext.app.server.address() as any;
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (playerSocket1?.connected) playerSocket1.disconnect();
    if (playerSocket2?.connected) playerSocket2.disconnect();
    await serverContext.app.close();
  });

  describe('REST API Endpoints', () => {
    it('GET /health zwraca status ok i liczbę pytań', async () => {
      const res = await serverContext.app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.totalQuestions).toBe(60);
    });

    it('GET /api/categories zwraca kategorie', async () => {
      const res = await serverContext.app.inject({
        method: 'GET',
        url: '/api/categories'
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });

    it('GET /api/rooms/:roomCode zwraca 404 dla nieistniejącego pokoju', async () => {
      const res = await serverContext.app.inject({
        method: 'GET',
        url: '/api/rooms/NON_EXISTENT'
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Socket.IO Real-Time Gameplay Flows', () => {
    let createdRoomCode: string;

    it('Host łączy się i zakłada pokój', async () => {
      hostSocket = ioc(serverUrl, { autoConnect: true });

      await new Promise<void>((resolve, reject) => {
        hostSocket.on('connect', () => {
          hostSocket.emit('room:create', { config: { minPlayers: 2 } }, (response) => {
            expect(response.success).toBe(true);
            expect(response.roomCode).toMatch(/^JZD-/);
            createdRoomCode = response.roomCode!;
            resolve();
          });
        });
        hostSocket.on('connect_error', reject);
      });

      expect(createdRoomCode).toBeDefined();
    });

    it('Gracz dołącza do pokoju z imieniem', async () => {
      playerSocket1 = ioc(serverUrl, { autoConnect: true });

      const joinResult = await new Promise<{ playerId?: string }>((resolve, reject) => {
        playerSocket1.on('connect', () => {
          playerSocket1.emit(
            'room:join',
            { roomCode: createdRoomCode, playerName: 'Ania' },
            (res) => {
              expect(res.success).toBe(true);
              expect(res.playerId).toBeDefined();
              resolve(res);
            }
          );
        });
        playerSocket1.on('connect_error', reject);
      });

      expect(joinResult.playerId).toBeDefined();
    });

    it('Drugi gracz dołącza, obaj otrzymują powiadomienia i stan gry', async () => {
      playerSocket2 = ioc(serverUrl, { autoConnect: true });

      await new Promise<void>((resolve) => {
        playerSocket2.on('connect', () => {
          playerSocket2.emit(
            'room:join',
            { roomCode: createdRoomCode, playerName: 'Bartek' },
            (res) => {
              expect(res.success).toBe(true);
              resolve();
            }
          );
        });
      });

      // Check room info via REST API
      const res = await serverContext.app.inject({
        method: 'GET',
        url: `/api/rooms/${createdRoomCode}`
      });
      expect(res.statusCode).toBe(200);
      const roomInfo = JSON.parse(res.payload);
      expect(roomInfo.playersCount).toBe(2);
    });

    it('Host widzi pełny stan z odpowiedziami, a gracz widzi zamaskowaną odpowiedź', async () => {
      // Wait for STAGE_1 broadcast on both host and player
      const hostStatePromise = new Promise<any>((resolve) => {
        const handler = (state: any) => {
          if (state.stage === 'STAGE_1') {
            hostSocket.off('game:state', handler);
            resolve(state);
          }
        };
        hostSocket.on('game:state', handler);
      });

      const playerStatePromise = new Promise<any>((resolve) => {
        const handler = (state: any) => {
          if (state.stage === 'STAGE_1') {
            playerSocket1.off('game:state', handler);
            resolve(state);
          }
        };
        playerSocket1.on('game:state', handler);
      });

      hostSocket.emit('game:start');

      const hostState = await hostStatePromise;
      const playerState = await playerStatePromise;

      expect(hostState.stage).toBe('STAGE_1');
      expect(hostState.currentQuestion).toBeDefined();
      expect(hostState.currentQuestion.answer).not.toBe('***');

      expect(playerState.stage).toBe('STAGE_1');
      expect(playerState.currentQuestion).toBeDefined();
      expect(playerState.currentQuestion.answer).toBe('***');
    });

    it('Gracz może przesłać otwartą odpowiedź tekstową do weryfikacji przez Hosta', async () => {
      const room = serverContext.roomManager.getRoom(createdRoomCode)!;
      const activePlayerId = room.engine.getState().activePlayerId!;

      // Bind the active player to playerSocket1 for the test
      room.playerSockets.set(activePlayerId, playerSocket1.id);
      room.socketPlayers.set(playerSocket1.id, activePlayerId);

      // Listen on host for answer:submitted
      const answerReceivedOnHost = new Promise<any>((resolve) => {
        hostSocket.once('answer:submitted', (payload) => resolve(payload));
      });

      playerSocket1.emit('game:submit_text_answer', {
        answerText: 'Moja odpowiedź testowa'
      });

      const submitted = await answerReceivedOnHost;
      expect(submitted.answerText).toBe('Moja odpowiedź testowa');

      // Host accepts answer verdict
      hostSocket.emit('game:answer_verdict', { isCorrect: true });

      const stateAfter = room.engine.getState();
      expect(stateAfter).toBeDefined();
    });
  });
});
