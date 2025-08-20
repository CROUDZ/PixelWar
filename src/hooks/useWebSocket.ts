import { useState, useEffect, useCallback } from 'react';
import { 
  subscribeConnectionState, 
  subscribeWS, 
  sendWS, 
  isWSConnected, 
  forceReconnect,
  type ConnectionState 
} from '@/lib/ws';

interface UseWebSocketOptions {
  onMessage?: (data: Record<string, unknown>) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  send: (data: Record<string, unknown>) => boolean;
  isConnected: boolean;
  reconnect: () => void;
  lastMessage: Record<string, unknown> | null;
  messageCount: number;
  errorCount: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onConnectionChange,
    autoReconnect = true,
    maxReconnectAttempts = 10
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const [lastMessage, setLastMessage] = useState<Record<string, unknown> | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribeConnectionState = subscribeConnectionState((state) => {
      setConnectionState(state);
      onConnectionChange?.(state);
      
      // Auto-reconnect logic
      if (autoReconnect && !state.isConnected && !state.isConnecting) {
        if (state.reconnectAttempts < maxReconnectAttempts) {
          console.log(`[useWebSocket] Auto-reconnect attempt ${state.reconnectAttempts}/${maxReconnectAttempts}`);
        } else {
          console.warn(`[useWebSocket] Max reconnect attempts (${maxReconnectAttempts}) reached`);
          setErrorCount(prev => prev + 1);
        }
      }
    });

    return unsubscribeConnectionState;
  }, [onConnectionChange, autoReconnect, maxReconnectAttempts]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribeMessages = subscribeWS((data) => {
      setLastMessage(data);
      setMessageCount(prev => prev + 1);
      onMessage?.(data);
    });

    return unsubscribeMessages;
  }, [onMessage]);

  const send = useCallback((data: Record<string, unknown>) => {
    try {
      return sendWS(data);
    } catch (error) {
      console.error('[useWebSocket] Send error:', error);
      setErrorCount(prev => prev + 1);
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    console.log('[useWebSocket] Manual reconnect requested');
    forceReconnect();
  }, []);

  return {
    connectionState,
    send,
    isConnected: isWSConnected(),
    reconnect,
    lastMessage,
    messageCount,
    errorCount,
  };
}

// Hook spécialisé pour le PixelCanvas
export function usePixelWebSocket(userId: string | null) {
  const [isGridLoaded, setIsGridLoaded] = useState(false);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);

  const {
    connectionState,
    send,
    isConnected,
    reconnect,
    messageCount,
    errorCount
  } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'init') {
        const width = Number(data.width) || 100;
        const height = Number(data.height) || 100;
        setGridDimensions({ width, height });
        setIsGridLoaded(true);
        setLastSyncTimestamp(Date.now());
        
        // Send auth after init
        if (userId) {
          send({
            type: 'auth',
            userId,
            clientToken: `${Date.now()}-${Math.random()}`
          });
        }
      } else if (data.type === 'updatePixel' && data.timestamp) {
        setLastSyncTimestamp(Number(data.timestamp));
      }
    },
    onConnectionChange: (state) => {
      if (!state.isConnected) {
        setIsGridLoaded(false);
      }
    }
  });

  const requestResync = useCallback(() => {
    if (userId) {
      send({ type: 'requestInit', userId });
    }
  }, [send, userId]);

  const sendPixel = useCallback((x: number, y: number, color: string, isAdmin = false) => {
    return send({ 
      type: 'placePixel', 
      x, 
      y, 
      color, 
      userId, 
      isAdmin 
    });
  }, [send, userId]);

  return {
    connectionState,
    isConnected,
    isGridLoaded,
    gridDimensions,
    lastSyncTimestamp,
    messageCount,
    errorCount,
    reconnect,
    requestResync,
    sendPixel,
    send
  };
}
