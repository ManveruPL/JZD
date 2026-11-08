import { GameEngine } from '../engine/GameEngine.js';
import { QuestionsRepository } from '../engine/QuestionsRepository.js';
import { GameConfig, Player } from '../types/index.js';
import { SubmittedAnswer } from '../types/socket.js';
import { ServerTimer } from './ServerTimer.js';

export interface GameRoom {
  roomCode: string;
  hostSocketId: string;
  isPartyMode: boolean;
  engine: GameEngine;
  timer: ServerTimer;
  playerSockets: Map<string, string>; // playerId -> socketId
  socketPlayers: Map<string, string>; // socketId -> playerId
  spectatorSockets: Set<string>;
  submittedAnswer: SubmittedAnswer | null;
  createdAt: number;
  lastActivityAt: number;
}

export class RoomManager {
  public static readonly MAX_ACTIVE_ROOMS = 100;
  private rooms: Map<string, GameRoom> = new Map();
  private sharedRepo: QuestionsRepository;
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor(repo?: QuestionsRepository) {
    this.sharedRepo = repo || new QuestionsRepository();
    // Periodically sweep inactive rooms every 15 minutes
    this.sweepInterval = setInterval(() => {
      this.pruneInactiveRooms();
    }, 15 * 60 * 1000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `JZD-${suffix}`;
    } while (this.rooms.has(code));
    return code;
  }

  public pruneInactiveRooms(maxIdleMs: number = 2 * 60 * 60 * 1000): number {
    const now = Date.now();
    let pruned = 0;
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > maxIdleMs) {
        room.timer.stop();
        this.rooms.delete(code);
        pruned++;
      }
    }
    return pruned;
  }

  public createRoom(
    hostSocketId: string,
    customConfig?: Partial<GameConfig>,
    isPartyMode: boolean = false
  ): GameRoom {
    if (this.rooms.size >= RoomManager.MAX_ACTIVE_ROOMS) {
      this.pruneInactiveRooms();
      if (this.rooms.size >= RoomManager.MAX_ACTIVE_ROOMS) {
        throw new Error('Osiągnięto limit aktywnych pokojów teleturnieju. Spróbuj ponownie później.');
      }
    }

    const roomCode = this.generateRoomCode();
    const engine = new GameEngine(roomCode, this.sharedRepo, customConfig);
    const timer = new ServerTimer(engine.getState().config.answerTimeLimitSeconds);

    const room: GameRoom = {
      roomCode,
      hostSocketId,
      isPartyMode,
      engine,
      timer,
      playerSockets: new Map(),
      socketPlayers: new Map(),
      spectatorSockets: new Set(),
      submittedAnswer: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };

    this.rooms.set(roomCode, room);
    return room;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    const normalized = roomCode.trim().toUpperCase();
    return this.rooms.get(normalized);
  }

  public joinRoom(
    roomCode: string,
    playerName: string,
    socketId: string,
    role: 'player' | 'spectator' = 'player'
  ): { room: GameRoom; player?: Player } {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error(`Pokój o kodzie ${roomCode} nie istnieje.`);
    }

    room.lastActivityAt = Date.now();

    if (role === 'spectator') {
      room.spectatorSockets.add(socketId);
      return { room };
    }

    // Add player to game engine
    const player = room.engine.addPlayer(playerName);
    room.playerSockets.set(player.id, socketId);
    room.socketPlayers.set(socketId, player.id);

    return { room, player };
  }

  public reconnectPlayer(
    roomCode: string,
    playerId: string,
    newSocketId: string
  ): { room: GameRoom; player: Player } {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error(`Pokój o kodzie ${roomCode} nie istnieje.`);
    }

    const state = room.engine.getState();
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Nie znaleziono gracza o id ${playerId} w pokoju ${roomCode}.`);
    }

    // Update socket mapping
    const oldSocketId = room.playerSockets.get(playerId);
    if (oldSocketId) {
      room.socketPlayers.delete(oldSocketId);
    }
    room.playerSockets.set(playerId, newSocketId);
    room.socketPlayers.set(newSocketId, playerId);
    player.isConnected = true;
    room.lastActivityAt = Date.now();

    return { room, player };
  }

  public handleDisconnect(socketId: string): { room?: GameRoom; playerId?: string; isHost?: boolean } {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId) {
        room.lastActivityAt = Date.now();
        return { room, isHost: true };
      }

      const playerId = room.socketPlayers.get(socketId);
      if (playerId) {
        room.socketPlayers.delete(socketId);
        room.playerSockets.delete(playerId);
        const p = room.engine.getState().players.find(x => x.id === playerId);
        if (p) {
          p.isConnected = false;
        }
        room.lastActivityAt = Date.now();
        return { room, playerId, isHost: false };
      }

      if (room.spectatorSockets.has(socketId)) {
        room.spectatorSockets.delete(socketId);
        return { room };
      }
    }
    return {};
  }

  public removeRoom(roomCode: string): void {
    const room = this.getRoom(roomCode);
    if (room) {
      room.timer.stop();
      this.rooms.delete(room.roomCode);
    }
  }

  public get activeRoomsCount(): number {
    return this.rooms.size;
  }

  public destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    for (const room of this.rooms.values()) {
      room.timer.stop();
    }
    this.rooms.clear();
  }
}
