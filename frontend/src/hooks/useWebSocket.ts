import { useState, useEffect, useCallback } from 'react';
import webSocketService, { WebSocketService } from '../services/WebSocketService';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (event: string, data: any) => void;
  joinScan: (scanId: string, token: string) => void;
  leaveScan: (scanId: string) => void;
  error: Error | null;
  reconnectAttempts: number;
}

/**
 * Hook for using WebSocket connections
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const { autoConnect = true, onConnected, onDisconnected, onError } = options;
  
  const [isConnected, setIsConnected] = useState<boolean>(webSocketService.isConnected());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await webSocketService.connect();
      setIsConnected(true);
      onConnected?.();
    } catch (err) {
      setError(err as Error);
      onError?.(err);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onConnected, onError]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  const send = useCallback((event: string, data: any) => {
    webSocketService.send(event, data);
  }, []);

  const joinScan = useCallback((scanId: string, token: string) => {
    webSocketService.joinScan(scanId, token);
  }, []);

  const leaveScan = useCallback((scanId: string) => {
    webSocketService.leaveScan(scanId);
  }, []);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      setReconnectAttempts(0);
      onConnected?.();
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      onDisconnected?.();
    };

    const handleError = (err: any) => {
      setError(err);
      setIsConnecting(false);
      onError?.(err);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt);
    };

    // Subscribe to WebSocket events
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('connection_error', handleError);
    webSocketService.on('error', handleError);
    webSocketService.on('reconnect_attempt', handleReconnectAttempt);

    // Connect if autoConnect is true
    if (autoConnect) {
      connect();
    }

    // Cleanup event listeners
    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('connection_error', handleError);
      webSocketService.off('error', handleError);
      webSocketService.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [autoConnect, connect, onConnected, onDisconnected, onError]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    send,
    joinScan,
    leaveScan,
    error,
    reconnectAttempts
  };
};

export default useWebSocket;