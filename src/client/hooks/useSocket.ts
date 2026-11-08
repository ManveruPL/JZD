import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../types/socket.js';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Determine target URL: in dev proxy works on current origin, in prod on same origin
    const socket: TypedSocket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
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
