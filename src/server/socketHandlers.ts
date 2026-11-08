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
    // 1. Create Room
    socket.on('room:create', (payload, callback) => {
      try {
        const room = roomManager.createRoom(socket.id, payload.config);
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
        const { roomCode, playerName, role = 'player' } = payload;
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
    socket.on('game:start', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      try {
        room.engine.startGame();
        room.timer.start(room.engine.getState().config.answerTimeLimitSeconds);

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

        // Start timer based on new state
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
      const isHost = room.hostSocketId === socket.id;
      const isHolder = socket.data.playerId === state.nominationHolderId;

      if (!isHost && !isHolder) {
        socket.emit('room:error', { message: 'Nie masz uprawnień do wyznaczania gracza.' });
        return;
      }

      try {
        room.engine.nominate(payload.targetPlayerId);
        room.timer.start(room.engine.getState().config.answerTimeLimitSeconds);
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

      const playerId = socket.data.playerId;
      if (!playerId) return;

      try {
        room.engine.buzz(playerId);
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

      const player = state.players.find(p => p.id === playerId);
      const answerPayload = {
        playerId,
        playerName: player?.name || 'Gracz',
        answerText: payload.answerText.trim(),
        submittedAt: Date.now()
      };

      room.submittedAnswer = answerPayload;

      // Send to Host for evaluation
      io.to(room.hostSocketId).emit('answer:submitted', answerPayload);
      // Pause timer while Host evaluates
      room.timer.pause();
    });

    // 9. Skip Buzzer Question (Host or timeout)
    socket.on('game:skip_buzzer_question', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      try {
        room.engine.skipBuzzerQuestion();
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
        room.timer.addTime(payload.seconds);
      }
    });

    // 11. Manual Host Corrections
    socket.on('host:adjust_score', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.engine.manualAdjustScore(payload.playerId, payload.delta);
        broadcastGameState(room);
      }
    });

    socket.on('host:adjust_chances', (payload) => {
      const room = roomManager.getRoom(socket.data.roomCode || '');
      if (room && room.hostSocketId === socket.id) {
        room.engine.manualAdjustChances(payload.playerId, payload.delta);
        broadcastGameState(room);
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
