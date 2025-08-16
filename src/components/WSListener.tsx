// src/components/WSListener.tsx
import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

export default function WSListener() {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      // fermer si déconnecté
      if (wsRef.current) {
        console.log("[WSListener] closing WS because no session");
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Construire l'URL WS depuis la config (ou fallback localhost)
    // Définis NEXT_PUBLIC_WS_URL = ws://example.com:8080 (ou wss://...) dans .env
    const WS_URL =
      (process.env.NEXT_PUBLIC_WS_URL as string) ||
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8080`;

    console.log("[WSListener] creating WS ->", WS_URL);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WSListener] ws.onopen - sending auth for", session.user.id);
      ws.send(JSON.stringify({ type: "auth", userId: session.user.id }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        console.log("[WSListener] received message", msg);
        if (msg?.type === "logout") {
          console.log("[WSListener] received logout -> calling signOut()");
          // redirect immediate vers login (évite refresh manuel)
          signOut();
        }
      } catch (e) {
        console.error("[WSListener] invalid message", ev.data, e);
      }
    };

    ws.onclose = (ev) => {
      console.log("[WSListener] ws.onclose", ev.code, ev.reason);
      wsRef.current = null;
      // tu peux implémenter une reconnexion si tu veux
    };

    ws.onerror = (err) => {
      console.error("[WSListener] ws.onerror", err);
    };

    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [session?.user?.id]);

  return null;
}
