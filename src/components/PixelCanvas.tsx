// PixelCanvas.tsx (React + Next.js app dir -> "use client")
"use client";
import React, { useEffect, useRef, useState } from "react";
import PixelSelector from "./PixelSelector";

const WS_URL = "ws://localhost:8080"; // adapte si nécessaire

interface PixelCanvasProps {
  pixelWidth?: number;
  pixelHeight?: number;
}

export default function PixelCanvas({
  pixelWidth = 100,
  pixelHeight = 100,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [connected, setConnected] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Taille d'affichage (CSS) du canvas
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [gridData, setGridData] = useState<Record<string, string>>({});
  const prevHoverRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState("#FF0000");

  useEffect(() => {
    // Empêche le scroll sur la page
    document.body.style.overflow = "hidden";
    // Ajuste la taille d'affichage du canvas à tout l'espace disponible sous le header
    const resizeCanvas = () => {
      const header = document.getElementById("header");
      const hHeight = header ? header.offsetHeight : 0;
      setHeaderHeight(hHeight);
      const availableWidth = window.innerWidth - 10;
      const availableHeight = window.innerHeight - hHeight - 10;
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
            const newGridData: Record<string, string> = {};
            for (let i = 0; i < g.length; i++) {
              const x = i % data.width;
              const y = Math.floor(i / data.width);
              newGridData[`${x},${y}`] = g[i];
              ctx.fillStyle = g[i];
              ctx.fillRect(x, y, 1, 1);
            }
            setGridData(newGridData);
            console.log("Init received, grid length =", g.length);
          } else if (data.type === "updatePixel") {
            const { x, y, color } = data;
            setGridData((prev) => ({ ...prev, [`${x},${y}`]: color }));
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

  // Dessine le pixel hover sans effacer la grille
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Restaure le pixel hover précédent s'il existe
    if (prevHoverRef.current) {
      const { x: prevX, y: prevY } = prevHoverRef.current;
      const originalColor = gridData[`${prevX},${prevY}`] || "#FFFFFF";
      ctx.fillStyle = originalColor;
      ctx.fillRect(prevX, prevY, 1, 1);
    }

    // Dessine le nouveau hover s'il existe
    if (hoverPixel) {
      const originalColor =
        gridData[`${hoverPixel.x},${hoverPixel.y}`] || "#FFFFFF";
      ctx.fillStyle = originalColor;
      ctx.fillRect(hoverPixel.x, hoverPixel.y, 1, 1);

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(hoverPixel.x, hoverPixel.y, 1, 1);
      ctx.restore();
    }

    // Met à jour la référence du hover précédent
    prevHoverRef.current = hoverPixel;
  }, [hoverPixel, gridData]);

  // Gestion du hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX =
      (e.clientX - rect.left) * (dimensions.width / canvasDisplaySize.width);
    const relY =
      (e.clientY - rect.top) * (dimensions.height / canvasDisplaySize.height);
    const x = Math.floor(relX);
    const y = Math.floor(relY);
    setHoverPixel({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!canvas || !socket || socket.readyState !== WebSocket.OPEN) return;

    // Calculer la position logique du pixel dans la grille
    const rect = canvas.getBoundingClientRect();
    const relX =
      (e.clientX - rect.left) * (dimensions.width / canvasDisplaySize.width);
    const relY =
      (e.clientY - rect.top) * (dimensions.height / canvasDisplaySize.height);
    const x = Math.floor(relX);
    const y = Math.floor(relY);

    socket.send(
      JSON.stringify({ type: "placePixel", x, y, color: selectedColor }),
    );
  };

  return (
    <div
      id="pixel-canvas-parent"
      className="fixed left-0 right-0 flex justify-center items-center overflow-hidden"
      style={{ top: headerHeight, height: `calc(100vh - ${headerHeight}px)` }}
    >
      {/* Fond blanc qui occupe toute la zone sous le header */}
      <div
        className="absolute left-0 right-0 bg-white z-0"
        style={{ top: 0, height: `calc(100vh - ${headerHeight}px)` }}
      />

      {/* Color Selector - Mobile (top) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 md:hidden">
        <PixelSelector onSelect={setSelectedColor} />
      </div>

      {/* Color Selector - Desktop (left) */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 hidden md:block">
        <PixelSelector onSelect={setSelectedColor} />
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
        }}
        className="border border-gray-300 z-10"
        onClick={placePixel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
