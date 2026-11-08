import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../types/socket.js';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // In dev mode (Vite running on port 5173), connect directly to the Fastify backend on port 3001.
    // In production, connect to the same origin serving the app.
    const serverUrl =
      typeof window !== 'undefined' && window.location.port === '5173'
        ? `http://${window.location.hostname}:3001`
        : undefined;

    const socket: TypedSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError(`Błąd połączenia: ${err.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback(<Event extends keyof ClientToServerEvents>(
    event: Event,
    ...args: Parameters<ClientToServerEvents[Event]>
  ) => {
    if (socketRef.current) {
      (socketRef.current.emit as any)(event, ...args);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit
  };
}
