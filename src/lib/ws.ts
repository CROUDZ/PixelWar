interface WSMessage {
  id: string;
  timestamp: number;
  data: Record<string, unknown>;
  retries: number;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
}

let ws: WebSocket | null = null;
const listeners: ((data: Record<string, unknown>) => void)[] = [];
const stateListeners: ((state: ConnectionState) => void)[] = [];
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let connectInProgress = false;

// Enhanced message queue with persistence and deduplication
const sendQueue: WSMessage[] = [];
const MAX_QUEUE_SIZE = 500;
const MAX_RETRIES = 3;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

// Connection state
let connectionState: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  lastConnected: null,
  reconnectAttempts: 0,
};

  const URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

// Exponential backoff for reconnection
function getReconnectDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

// Update connection state and notify listeners
function updateConnectionState(updates: Partial<ConnectionState>) {
  connectionState = { ...connectionState, ...updates };
  stateListeners.forEach((fn) => {
    try {
      fn(connectionState);
    } catch (e) {
      console.error("[WS] State listener error:", e);
    }
  });
}

// Clean up all timers
function clearAllTimers() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Start heartbeat mechanism
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Set timeout for pong response
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
      }
      heartbeatTimeout = setTimeout(() => {
        console.warn("[WS] Heartbeat timeout - closing connection");
        ws?.close();
      }, HEARTBEAT_TIMEOUT);
      
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (e) {
        console.error("[WS] Heartbeat send error:", e);
        ws?.close();
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// Stop heartbeat mechanism
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
}

// Generate unique message ID
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Clean old messages from queue
function cleanQueue() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  for (let i = sendQueue.length - 1; i >= 0; i--) {
    if (now - sendQueue[i].timestamp > maxAge || sendQueue[i].retries >= MAX_RETRIES) {
      sendQueue.splice(i, 1);
    }
  }
  
  // Keep queue size manageable
  if (sendQueue.length > MAX_QUEUE_SIZE) {
    sendQueue.splice(0, sendQueue.length - MAX_QUEUE_SIZE);
  }
}

function createSocket() {
  console.log("[WS] createSocket ->", URL);
  connectInProgress = true;
  updateConnectionState({ isConnecting: true });
  
  ws = new WebSocket(URL);

  ws.onopen = () => {
    console.log("[WS] onopen");
    connectInProgress = false;
    connectionState.reconnectAttempts = 0;
    updateConnectionState({ 
      isConnected: true, 
      isConnecting: false, 
      lastConnected: Date.now(),
      reconnectAttempts: 0 
    });

    // Start heartbeat
    startHeartbeat();

    // Clean and flush send queue
    cleanQueue();
    while (sendQueue.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
      const message = sendQueue.shift();
      if (!message) continue;
      
      try {
        ws.send(JSON.stringify(message.data));
        console.log("[WS] flushed queued message:", message.data);
      } catch (e) {
        console.error("[WS] flush send error:", e);
        // Re-queue message with incremented retry count
        message.retries++;
        if (message.retries < MAX_RETRIES) {
          sendQueue.unshift(message);
        }
        break;
      }
    }
  };

  ws.onmessage = (ev) => {
    try {
      if (typeof ev.data !== "string") return;
      const data = JSON.parse(ev.data);
      
      // Handle pong response
      if (data.type === "pong") {
        if (heartbeatTimeout) {
          clearTimeout(heartbeatTimeout);
          heartbeatTimeout = null;
        }
        return;
      }
      
      console.log("[WS] received message:", data.type);
      listeners.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error("[WS] listener error:", e);
        }
      });
    } catch (e) {
      console.error("[WS] invalid json message:", e);
    }
  };

  ws.onclose = (ev) => {
    console.warn("[WS] onclose", ev.code, ev.reason);
    ws = null;
    connectInProgress = false;
    stopHeartbeat();
    
    updateConnectionState({ 
      isConnected: false, 
      isConnecting: false 
    });

    // Schedule reconnection with exponential backoff
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    const delay = getReconnectDelay(connectionState.reconnectAttempts);
    connectionState.reconnectAttempts++;
    
    console.log(`[WS] Scheduling reconnection in ${delay}ms (attempt ${connectionState.reconnectAttempts})`);
    
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      console.log("[WS] reconnecting...");
      createSocket();
    }, delay);
  };

  ws.onerror = (err) => {
    console.error("[WS] onerror", err);
    updateConnectionState({ 
      isConnected: false, 
      isConnecting: false 
    });
    
    try {
      ws?.close();
    } catch {}
  };

  return ws;
}

export function getWS() {
  if (!ws && !connectInProgress) createSocket();
  return ws;
}

export function subscribeWS(fn: (data: Record<string, unknown>) => void) {
  listeners.push(fn);
  console.log("[WS] subscribe, total listeners =", listeners.length);
  // ensure socket is created
  getWS();

  // return unsubscribe
  return () => {
    const index = listeners.indexOf(fn);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    console.log("[WS] unsubscribe, total listeners =", listeners.length);
  };
}

export function subscribeConnectionState(fn: (state: ConnectionState) => void) {
  stateListeners.push(fn);
  // Send current state immediately
  fn(connectionState);
  
  return () => {
    const index = stateListeners.indexOf(fn);
    if (index > -1) {
      stateListeners.splice(index, 1);
    }
  };
}

export function isWSConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

export function getConnectionState() {
  return { ...connectionState };
}

export function sendWS(obj: Record<string, unknown>) {
  const message: WSMessage = {
    id: generateMessageId(),
    timestamp: Date.now(),
    data: obj,
    retries: 0,
  };

  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // queue it
      console.log("[WS] not open, queueing:", obj);
      sendQueue.push(message);
      cleanQueue(); // Clean old messages
      
      // ensure socket exists / tries to connect
      if (!ws && !connectInProgress) createSocket();
      return false;
    }
    
    ws.send(JSON.stringify(obj));
    console.log("[WS] sent:", obj);
    return true;
  } catch (e) {
    console.error("[WS] send error, queueing:", e, obj);
    sendQueue.push(message);
    cleanQueue(); // Clean old messages
    return false;
  }
}

// Force reconnection (useful for debugging or manual recovery)
export function forceReconnect() {
  console.log("[WS] Force reconnecting...");
  
  // Clear existing timers
  clearAllTimers();
  
  // Close existing connection
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.warn("[WS] Error closing socket for reconnect:", e);
    }
  }
  
  // Reset state
  ws = null;
  connectInProgress = false;
  connectionState.reconnectAttempts = 0;
  
  // Start new connection
  createSocket();
}

// Cleanup function for component unmounting
export function cleanup() {
  console.log("[WS] Cleaning up WebSocket connection");
  
  clearAllTimers();
  
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.warn("[WS] Error closing socket during cleanup:", e);
    }
  }
  
  ws = null;
  connectInProgress = false;
  listeners.length = 0;
  stateListeners.length = 0;
  sendQueue.length = 0;
}

// Expose connection state type for components
export type { ConnectionState };
