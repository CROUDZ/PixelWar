let ws: WebSocket | null = null;
let listeners: ((data: Record<string, unknown>) => void)[] = [];
let isConnecting = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

export function getWS() {
  console.log("getWS called, current ws state:", ws?.readyState, "isConnecting:", isConnecting);
  
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    if (isConnecting) {
      console.log("Connection already in progress, returning existing ws");
      return ws;
    }
    
    console.log("Creating new WebSocket connection...");
    isConnecting = true;
    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("Connected to WebSocket server - listeners count:", listeners.length);
      isConnecting = false;
    };

    ws.onmessage = (event) => {
      console.log("Raw WebSocket message:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed WebSocket data:", data, "will notify", listeners.length, "listeners");
        
        // Notifier tous les listeners
        listeners.forEach((fn, index) => {
          try {
            console.log(`Calling listener ${index}...`);
            fn(data);
          } catch (e) {
            console.error(`Error in WebSocket listener ${index}:`, e);
          }
        });
      } catch (e) {
        console.error("Invalid WS message:", event.data, e);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected, retry in 3s...", event.reason || event.code);
      isConnecting = false;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      reconnectTimeout = setTimeout(() => {
        console.log("Attempting to reconnect...");
        ws = null;
        getWS();
        reconnectTimeout = null;
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      isConnecting = false;
      ws?.close();
    };
  } else {
    console.log("Reusing existing WebSocket connection");
  }

  return ws;
}

export function subscribeWS(callback: (data: Record<string, unknown>) => void) {
  console.log("subscribeWS called, adding listener. Total listeners before:", listeners.length);
  listeners.push(callback);
  console.log("Total listeners after:", listeners.length);
  
  // S'assurer qu'une connexion WebSocket existe
  const socket = getWS();
  console.log("WebSocket state after getWS():", socket?.readyState);
  
  // Fonction de désabonnement
  return () => {
    console.log("Unsubscribing listener. Listeners before:", listeners.length);
    listeners = listeners.filter((fn) => fn !== callback);
    console.log("Listeners after:", listeners.length);
  };
}

export function isWSConnected() {
  const connected = ws && ws.readyState === WebSocket.OPEN;
  console.log("isWSConnected check:", connected, "readyState:", ws?.readyState);
  return connected;
}

export function sendWS(data: Record<string, unknown>) {
  const socket = getWS();
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("Sending WebSocket message:", data);
    socket.send(JSON.stringify(data));
    return true;
  }
  console.warn("WebSocket not connected, message not sent:", data);
  return false;
}