let ws: WebSocket | null = null;
let listeners: ((data: Record<string, unknown>) => void)[] = [];
let reconnectTimeout: NodeJS.Timeout | null = null;
let connectInProgress = false;
const sendQueue: Record<string, unknown>[] = [];
const URL =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `wss://${window.location.hostname}:8080` // adapte si en prod (utilise wss)
    : "ws://localhost:8080";

function createSocket() {
  console.log("[WS] createSocket ->", URL);
  connectInProgress = true;
  ws = new WebSocket(URL);

  ws.onopen = () => {
    console.log("[WS] onopen");
    connectInProgress = false;

    // flush send queue
    while (sendQueue.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
      const item = sendQueue.shift();
      try {
        ws.send(JSON.stringify(item));
        console.log("[WS] flushed queued message:", item);
      } catch (e) {
        console.error("[WS] flush send error:", e);
      }
    }
  };

  ws.onmessage = (ev) => {
    console.log("[WS] raw message:", ev.data);
    try {
      const data = JSON.parse(ev.data);
      console.log("[WS] parsed message:", data);
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
    // try reconnect
    if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      console.log("[WS] reconnecting...");
      createSocket();
    }, 1500);
  };

  ws.onerror = (err) => {
    console.error("[WS] onerror", err);
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
    listeners = listeners.filter((f) => f !== fn);
    console.log("[WS] unsubscribe, total listeners =", listeners.length);
  };
}

export function isWSConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

export function sendWS(obj: Record<string, unknown>) {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // queue it
      console.log("[WS] not open, queueing:", obj);
      sendQueue.push(obj);
      // ensure socket exists / tries to connect
      if (!ws && !connectInProgress) createSocket();
      return false;
    }
    ws.send(JSON.stringify(obj));
    console.log("[WS] sent:", obj);
    return true;
  } catch (e) {
    console.error("[WS] send error, queueing:", e, obj);
    sendQueue.push(obj);
    return false;
  }
}
