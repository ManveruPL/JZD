import { Server, Socket } from 'socket.io';
import { GameStage, QuestionState, Stage3Phase } from '../types/index.js';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '../types/socket.js';
import { GameRoom, RoomManager } from './RoomManager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(io: TypedServer, roomManager: RoomManager): void {
  function broadcastGameState(room: GameRoom): void {
    const fullState = room.engine.getState();
    const publicState = room.engine.getPublicState();

    // Attach timer state
    fullState.timer = room.timer.getState();
    publicState.timer = room.timer.getState();

    // Attach room mode
    fullState.isPartyMode = room.isPartyMode;
    publicState.isPartyMode = room.isPartyMode;

    // Attach submitted answer
    fullState.submittedAnswer = room.submittedAnswer;
    publicState.submittedAnswer = room.submittedAnswer;

    // Send full state (with answers) to Host
    io.to(room.hostSocketId).emit('game:state', fullState);

    // Send public state (masked answer) to room
    io.to(room.roomCode).except(room.hostSocketId).emit('game:state', publicState);
  }

  function setupRoomTimer(room: GameRoom): void {
    room.timer.setCallbacks(
      (timerState) => {
        io.to(room.roomCode).emit('timer:state', timerState);
      },
      () => {
        // Timer expired
        io.to(room.roomCode).emit('timer:expired');

        const state = room.engine.getState();
        if (state.stage === GameStage.STAGE_3 && state.stage3Phase === Stage3Phase.BUZZER) {
          // Buzzer expired without response -> skip question
          try {
            room.engine.skipBuzzerQuestion();
            broadcastGameState(room);

            // If still in buzzer phase, restart 10s timer for next question
            const updated = room.engine.getState();
            if (updated.stage === GameStage.STAGE_3 && updated.stage3Phase === Stage3Phase.BUZZER) {
              room.timer.start(updated.config.buzzerTimeLimitSeconds);
            }
          } catch {
            // Ignore if state changed
          }
        }
      }
    );
  }

  io.on('connection', (socket: TypedSocket) => {
    let socketCreatedRoomsCount = 0;

    // 1. Create Room
    socket.on('room:create', (payload, callback) => {
      try {
        if (socketCreatedRoomsCount >= 5) {
          throw new Error('Przekroczono limit tworzenia pokojów dla tego połączenia.');
        }

        // Validate config bounds if provided
        if (payload?.config) {
          if (typeof payload.config.answerTimeLimitSeconds === 'number') {
            payload.config.answerTimeLimitSeconds = Math.max(5, Math.min(120, payload.config.answerTimeLimitSeconds));
          }
          if (typeof payload.config.buzzerTimeLimitSeconds === 'number') {
            payload.config.buzzerTimeLimitSeconds = Math.max(3, Math.min(30, payload.config.buzzerTimeLimitSeconds));
          }
          if (typeof payload.config.finalQuestionsPoolCount === 'number') {
            payload.config.finalQuestionsPoolCount = Math.max(10, Math.min(100, payload.config.finalQuestionsPoolCount));
          }
          if (typeof payload.config.initialChances === 'number') {
            payload.config.initialChances = Math.max(1, Math.min(5, payload.config.initialChances));
          }
        }

        const room = roomManager.createRoom(socket.id, payload?.config, payload?.isPartyMode);
        socketCreatedRoomsCount++;
        socket.data.roomCode = room.roomCode;
        socket.data.role = 'host';

        socket.join(room.roomCode);
        setupRoomTimer(room);

        socket.emit('room:joined', {
          roomCode: room.roomCode,
          role: 'host'
        });

        broadcastGameState(room);
        if (callback) callback({ success: true, roomCode: room.roomCode });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 2. Join Room
    socket.on('room:join', (payload, callback) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const rawName = String(payload?.playerName || '').trim();
        const playerName = rawName.slice(0, 30);
        if (!playerName) {
          throw new Error('Imię gracza nie może być puste.');
        }
        const role = payload?.role === 'spectator' ? 'spectator' : 'player';
        const { room, player } = roomManager.joinRoom(roomCode, playerName, socket.id, role);

        socket.data.roomCode = room.roomCode;
        socket.data.role = role;
        socket.data.playerId = player?.id;
        socket.data.playerName = player?.name || playerName;

        socket.join(room.roomCode);

        socket.emit('room:joined', {
          roomCode: room.roomCode,
          role,
          playerId: player?.id,
          playerName: player?.name
        });

        io.to(room.roomCode).emit('notification', {
          type: 'info',
          message: `${player?.name || playerName} dołączył(a) do gry jako ${role === 'player' ? 'gracz' : 'widz'}.`
        });

        broadcastGameState(room);
        if (callback) callback({ success: true, playerId: player?.id });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 3. Reconnect
    socket.on('room:reconnect', (payload, callback) => {
      try {
        const { roomCode, playerId } = payload;
        const { room, player } = roomManager.reconnectPlayer(roomCode, playerId, socket.id);

        socket.data.roomCode = room.roomCode;
        socket.data.role = 'player';
        socket.data.playerId = player.id;
        socket.data.playerName = player.name;

        socket.join(room.roomCode);

        socket.emit('room:joined', {
          roomCode: room.roomCode,
          role: 'player',
          playerId: player.id,
          playerName: player.name
        });

        broadcastGameState(room);
        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 4. Start Game
    socket.on('game:start', (payload) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      try {
        // If party players list is provided, populate engine
        if (payload?.players && Array.isArray(payload.players) && payload.players.length >= 4) {
          // If room already had players in lobby, clear them or keep
          const currentCount = room.engine.getState().players.length;
          if (currentCount === 0) {
            for (const name of payload.players) {
              room.engine.addPlayer(name);
            }
          }
        }

        // Apply custom config and category selection before start
        if (payload?.config) {
          room.engine.updateConfig(payload.config);
        }
        if (payload?.categories && payload.categories.length > 0) {
          room.engine.updateConfig({ allowedCategories: payload.categories });
        }

        room.engine.startGame();
        if (room.isPartyMode) {
          room.timer.reset(room.engine.getState().config.answerTimeLimitSeconds);
        } else {
          room.timer.start(room.engine.getState().config.answerTimeLimitSeconds);
        }

        io.to(room.roomCode).emit('notification', {
          type: 'success',
          message: 'Gra została rozpoczęta! Rozpoczyna się Etap 1.'
        });

        broadcastGameState(room);
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    // 5. Answer Verdict (Game Master)
    socket.on('game:answer_verdict', (payload) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      try {
        room.engine.recordAnswer(payload.isCorrect);
        room.submittedAnswer = null;
        io.to(room.roomCode).emit('answer:cleared');

        const state = room.engine.getState();

        // Start timer based on new state and game mode
        if (room.isPartyMode) {
          if (state.stage === GameStage.STAGE_3) {
            if (state.stage3Phase === Stage3Phase.BUZZER) {
              room.timer.reset(state.config.buzzerTimeLimitSeconds);
            } else if (state.stage3Phase === Stage3Phase.ANSWERING_NOMINATED) {
              room.timer.reset(state.config.answerTimeLimitSeconds);
            } else {
              room.timer.stop();
            }
          } else if (state.stage === GameStage.STAGE_1) {
            room.timer.reset(state.config.answerTimeLimitSeconds);
          } else if (state.stage === GameStage.STAGE_2) {
            if (state.activePlayerId && state.questionState === QuestionState.ANSWERING) {
              room.timer.reset(state.config.answerTimeLimitSeconds);
            } else {
              room.timer.stop();
            }
          } else {
            room.timer.stop();
          }
        } else {
          if (state.stage === GameStage.STAGE_3) {
            if (state.stage3Phase === Stage3Phase.BUZZER) {
              room.timer.start(state.config.buzzerTimeLimitSeconds);
            } else if (state.stage3Phase === Stage3Phase.ANSWERING_NOMINATED) {
              room.timer.start(state.config.answerTimeLimitSeconds);
            } else {
              room.timer.stop();
            }
          } else if (state.stage === GameStage.STAGE_1) {
            room.timer.start(state.config.answerTimeLimitSeconds);
          } else if (state.stage === GameStage.STAGE_2) {
            if (state.activePlayerId && state.questionState === QuestionState.ANSWERING) {
              room.timer.start(state.config.answerTimeLimitSeconds);
            } else {
              room.timer.stop();
            }
          } else {
            room.timer.stop();
          }
        }

        broadcastGameState(room);
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    // 6. Nominate Target
    socket.on('game:nominate', (payload) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      // Host or player with nomination rights can nominate
      const state = room.engine.getState();
      const playerId = room.socketPlayers.get(socket.id) || socket.data.playerId;
      const isHost = room.hostSocketId === socket.id;
      const isHolder = playerId === state.nominationHolderId;

      if (!isHost && !isHolder) {
        socket.emit('room:error', { message: 'Nie masz uprawnień do wyznaczania gracza.' });
        return;
      }

      try {
        room.engine.nominate(payload.targetPlayerId);
        room.submittedAnswer = null;
        io.to(room.roomCode).emit('answer:cleared');
        if (room.isPartyMode) {
          room.timer.reset(room.engine.getState().config.answerTimeLimitSeconds);
        } else {
          room.timer.start(room.engine.getState().config.answerTimeLimitSeconds);
        }
        broadcastGameState(room);
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    // 7. Buzzer (Stage 3 Phase 1)
    socket.on('game:buzz', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const playerId = room.socketPlayers.get(socket.id) || socket.data.playerId;
      if (!playerId) return;

      try {
        room.engine.buzz(playerId);
        room.submittedAnswer = null;
        io.to(room.roomCode).emit('answer:cleared');
        room.timer.stop(); // stop 10s buzzer timer
        room.timer.start(room.engine.getState().config.answerTimeLimitSeconds); // start 30s answer timer

        const player = room.engine.getState().players.find(p => p.id === playerId);
        io.to(room.roomCode).emit('buzzer:won', {
          playerId,
          playerName: player?.name || 'Gracz'
        });

        broadcastGameState(room);
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    // 8. Submit Open Text Answer (Player Phone)
    socket.on('game:submit_text_answer', (payload) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const playerId = room.socketPlayers.get(socket.id) || socket.data.playerId;
      const state = room.engine.getState();
      if (!playerId || playerId !== state.activePlayerId) {
        socket.emit('room:error', { message: 'Nie twoja kolej na odpowiedź.' });
        return;
      }

      const rawText = typeof payload?.answerText === 'string' ? payload.answerText : '';
      const answerText = rawText.trim().slice(0, 200);
      if (!answerText) return;

      const player = state.players.find(p => p.id === playerId);
      const answerPayload = {
        playerId,
        playerName: player?.name || 'Gracz',
        answerText,
        submittedAt: Date.now()
      };

      room.submittedAnswer = answerPayload;

      // Send to Host for evaluation
      io.to(room.hostSocketId).emit('answer:submitted', answerPayload);
      // Pause timer while Host evaluates
      room.timer.pause();
      broadcastGameState(room);
    });

    // 9. Skip Buzzer Question (Host or timeout)
    socket.on('game:skip_buzzer_question', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      try {
        room.engine.skipBuzzerQuestion();
        room.submittedAnswer = null;
        io.to(room.roomCode).emit('answer:cleared');
        const updated = room.engine.getState();
        if (updated.stage === GameStage.STAGE_3 && updated.stage3Phase === Stage3Phase.BUZZER) {
          room.timer.start(updated.config.buzzerTimeLimitSeconds);
        } else {
          room.timer.stop();
        }
        broadcastGameState(room);
      } catch (err: any) {
        socket.emit('room:error', { message: err.message });
      }
    });

    // 10. Timer Controls (Game Master)
    socket.on('timer:start', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.timer.start(payload?.durationSeconds);
      }
    });

    socket.on('timer:pause', () => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.timer.pause();
      }
    });

    socket.on('timer:resume', () => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.timer.resume();
      }
    });

    socket.on('timer:reset', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.timer.reset(payload?.durationSeconds);
      }
    });

    socket.on('timer:add_time', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        const seconds = Number(payload?.seconds);
        if (Number.isFinite(seconds) && seconds >= -60 && seconds <= 60) {
          room.timer.addTime(seconds);
        }
      }
    });

    // 11. Manual Host Corrections
    socket.on('host:adjust_score', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        const delta = Number(payload?.delta);
        if (Number.isFinite(delta) && delta >= -100 && delta <= 100) {
          room.engine.manualAdjustScore(payload.playerId, delta);
          broadcastGameState(room);
        }
      }
    });

    socket.on('host:adjust_chances', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        const delta = Number(payload?.delta);
        if (Number.isFinite(delta) && delta >= -3 && delta <= 3) {
          room.engine.manualAdjustChances(payload.playerId, delta);
          broadcastGameState(room);
        }
      }
    });

    // 12. Disconnect
    socket.on('disconnect', () => {
      const { room, playerId, isHost } = roomManager.handleDisconnect(socket.id);
      if (room) {
        if (isHost) {
          io.to(room.roomCode).emit('notification', {
            type: 'warning',
            message: 'Mistrz Gry rozłączył się. Oczekiwanie na ponowne połączenie...'
          });
        } else if (playerId) {
          const p = room.engine.getState().players.find(x => x.id === playerId);
          io.to(room.roomCode).emit('notification', {
            type: 'info',
            message: `Gracz ${p?.name || 'Uczestnik'} utracił połączenie.`
          });
        }
        broadcastGameState(room);
      }
    });
  });
}
