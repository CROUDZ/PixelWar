// PixelCanvas.tsx (React + Next.js app dir -> "use client")
"use client";
import React, { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8080"; // adapte si nécessaire

interface PixelCanvasProps {
  pixelWidth?: number;
  pixelHeight?: number;
}

export default function PixelCanvas({ pixelWidth = 100, pixelHeight = 100 }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [connected, setConnected] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Taille d'affichage (CSS) du canvas
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Empêche le scroll sur la page
    document.body.style.overflow = "hidden";
    // Ajuste la taille d'affichage du canvas à tout l'espace disponible sous le header
    const resizeCanvas = () => {
      const header = document.getElementById("header");
      const headerHeight = header ? header.offsetHeight : 0;
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight - headerHeight;
      
      // Calcule la taille maximale en gardant le ratio carré (1:1)
      const maxSize = Math.min(availableWidth, availableHeight);
      
      setCanvasDisplaySize({
        width: maxSize,
        height: maxSize,
      });
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    setDimensions({ width: pixelWidth, height: pixelWidth }); // Force un canvas carré pour éviter la déformation

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    let shouldStop = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      console.log("Connecting to", WS_URL);
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };

      socket.onerror = (err) => {
        console.error("WS error", err);
      };

      socket.onclose = (ev) => {
        console.log("WS closed", ev.reason || ev.code);
        setConnected(false);
        if (!shouldStop) {
          reconnectTimeout = setTimeout(connect, 1000);
        }
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "init") {
            const g = data.grid as string[];
            for (let i = 0; i < g.length; i++) {
              const x = i % data.width;
              const y = Math.floor(i / data.width);
              ctx.fillStyle = g[i];
              ctx.fillRect(x, y, 1, 1);
            }
            console.log("Init received, grid length =", g.length);
          } else if (data.type === "updatePixel") {
            const { x, y, color } = data;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          } else if (data.type === "error") {
            console.warn("Server error:", data.message);
          }
        } catch (e) {
          console.error("Bad message from server", e);
        }
      };
    };

    connect();

    return () => {
      shouldStop = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socketRef.current?.close();
      window.removeEventListener("resize", resizeCanvas);
      document.body.style.overflow = "";
    };
  }, [pixelWidth, pixelHeight]);

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!canvas || !socket || socket.readyState !== WebSocket.OPEN) return;

    // Calculer la position logique du pixel dans la grille
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (dimensions.width / canvasDisplaySize.width);
    const relY = (e.clientY - rect.top) * (dimensions.height / canvasDisplaySize.height);
    const x = Math.floor(relX);
    const y = Math.floor(relY);
    const color = "#FF0000"; // remplacer par la couleur UI

    socket.send(JSON.stringify({ type: "placePixel", x, y, color }));
  };

  return (
    <div id="pixel-canvas-parent"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden"
      }}>
      {/* Fond blanc qui occupe toute la zone sous le header */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#fff",
        zIndex: 0
      }} />
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 10, margin: 8, background: "rgba(255,255,255,0.7)", borderRadius: 4, padding: 4 }}>
        WebSocket: {connected ? "connecté" : "déconnecté"} (ws://localhost:8080)
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: "block",
          width: `${canvasDisplaySize.width}px`,
          height: `${canvasDisplaySize.height}px`,
          imageRendering: "pixelated",
          border: "1px solid #ddd",
          zIndex: 1
        }}
        onClick={placePixel}
      />
    </div>
  );
}
