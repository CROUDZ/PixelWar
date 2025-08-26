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
        console.log("[WSListener] (FR) Fermeture du WS car aucune session");
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

    console.log("[WSListener] (FR) Création du WS ->", WS_URL);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        "[WSListener] (FR) ws.onopen - envoi de l'auth pour",
        session.user.id,
      );
      ws.send(JSON.stringify({ type: "auth", userId: session.user.id }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        console.log("[WSListener] (FR) message reçu", msg);
        if (msg?.type === "logout") {
          console.log("[WSListener] (FR) reçu logout -> appel signOut()");
          // redirection immédiate vers login (évite refresh manuel)
          signOut();
        }
      } catch (e) {
        console.error("[WSListener] (FR) message invalide", ev.data, e);
      }
    };

    ws.onclose = (ev) => {
      console.log("[WSListener] (FR) ws.onclose", ev.code, ev.reason);
      wsRef.current = null;
      // tu peux implémenter une reconnexion si tu veux
    };

    ws.onerror = (err) => {
      console.error("[WSListener] (FR) ws.onerror", err);
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
