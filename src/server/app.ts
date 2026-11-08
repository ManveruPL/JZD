import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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

  // Security Headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  });

  // Global Rate Limiting to prevent DoS attacks
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute'
  });

  // CORS configuration with environment-driven allowlist
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : true;

  await app.register(cors, {
    origin: corsOrigin,
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

  // NOTE: Static mounting of /data/ removed to prevent leaking questions.json with answers.
  // Questions are accessed strictly in-memory by GameEngine on the server.

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
      if (
        !url.startsWith('/api') &&
        !url.startsWith('/socket.io') &&
        !url.startsWith('/assets') &&
        !url.startsWith('/data') &&
        !url.includes('.')
      ) {
        return reply.sendFile('index.html');
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

  const ioCorsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : (process.env.NODE_ENV === 'production' ? false : '*');

  // Attach Socket.IO to Fastify's underlying HTTP server
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    app.server,
    {
      cors: {
        origin: ioCorsOrigin,
        methods: ['GET', 'POST']
      },
      pingTimeout: 20000,
      pingInterval: 10000,
      maxHttpBufferSize: 1e5 // 100 KB max payload limit
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
