import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { QuestionsRepository } from '../engine/QuestionsRepository.js';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '../types/socket.js';
import { RoomManager } from './RoomManager.js';
import { registerSocketHandlers } from './socketHandlers.js';

export interface AppServerContext {
  app: FastifyInstance;
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  roomManager: RoomManager;
  questionsRepo: QuestionsRepository;
}

export async function buildApp(
  customRepo?: QuestionsRepository
): Promise<AppServerContext> {
  const app = fastify({
    logger: false
  });

  // CORS configuration for local development and online clients
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Serve audio assets
  const soundsDir = path.resolve(process.cwd(), 'assets/sounds');
  if (fs.existsSync(soundsDir)) {
    await app.register(fastifyStatic, {
      root: soundsDir,
      prefix: '/assets/sounds/',
      decorateReply: false
    });
  }

  // Serve questions data if needed
  const dataDir = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(dataDir)) {
    await app.register(fastifyStatic, {
      root: dataDir,
      prefix: '/data/',
      decorateReply: false
    });
  }

  // Serve compiled client frontend if present (Production / Docker build)
  const clientDistDir = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDistDir)) {
    await app.register(fastifyStatic, {
      root: clientDistDir,
      prefix: '/',
      decorateReply: false
    });

    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url || '';
      if (!url.startsWith('/api') && !url.startsWith('/socket.io') && !url.startsWith('/data') && !url.startsWith('/assets')) {
        return reply.sendFile('index.html', clientDistDir);
      }
      reply.status(404).send({ error: 'Endpoint nie istnieje' });
    });
  }

  const questionsRepo = customRepo || new QuestionsRepository();
  const roomManager = new RoomManager(questionsRepo);

  // REST API Routes
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      activeRooms: roomManager.activeRoomsCount,
      totalQuestions: questionsRepo.totalQuestionsCount
    };
  });

  app.get('/api/categories', async () => {
    const categoriesPath = path.resolve(process.cwd(), 'data/categories.json');
    if (fs.existsSync(categoriesPath)) {
      const content = fs.readFileSync(categoriesPath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  });

  app.get('/api/rooms/:roomCode', async (request, reply) => {
    const { roomCode } = request.params as { roomCode: string };
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      reply.status(404);
      return { error: 'Pokój nie został znaleziony.' };
    }

    const state = room.engine.getPublicState();
    return {
      roomCode: room.roomCode,
      stage: state.stage,
      playersCount: state.players.length,
      maxPlayers: state.config.maxPlayers,
      createdAt: room.createdAt
    };
  });

  // Attach Socket.IO to Fastify's underlying HTTP server
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    app.server,
    {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 20000,
      pingInterval: 10000
    }
  );

  registerSocketHandlers(io, roomManager);

  return {
    app,
    io,
    roomManager,
    questionsRepo
  };
}
