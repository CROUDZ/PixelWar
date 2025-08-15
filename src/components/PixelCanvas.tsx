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

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  
  // Navigation mode state
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapPos, setLastTapPos] = useState({ x: 0, y: 0 });
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);

  // Transform screen coordinates to grid coordinates
  const screenToGrid = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    // Convert canvas coordinates to grid coordinates
    const pixelSize = canvasDisplaySize.width / dimensions.width;
    const gridX = (canvasX / zoom - pan.x) / pixelSize;
    const gridY = (canvasY / zoom - pan.y) / pixelSize;
    
    return {
      x: Math.floor(gridX),
      y: Math.floor(gridY)
    };
  };

  // Redraw the entire canvas with zoom and pan transformations
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || dimensions.width === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transformations
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Draw grid
    const pixelSize = canvasDisplaySize.width / dimensions.width;
    
    for (let x = 0; x < dimensions.width; x++) {
      for (let y = 0; y < dimensions.height; y++) {
        const color = gridData[`${x},${y}`] || "#FFFFFF";
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw border around pixel placement area
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2222FF";
    ctx.strokeRect(
      0, // x
      0, // y
      dimensions.width * pixelSize, // width
      dimensions.height * pixelSize // height
    );
    ctx.restore();

    // Draw hover effect
    if (
      hoverPixel &&
      hoverPixel.x >= 0 &&
      hoverPixel.x < dimensions.width &&
      hoverPixel.y >= 0 &&
      hoverPixel.y < dimensions.height
    ) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(
        hoverPixel.x * pixelSize,
        hoverPixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
      ctx.restore();
    }

    ctx.restore();
  };

  // Initialize canvas and WebSocket - separate useEffect to avoid loops
  useEffect(() => {
    setDimensions({ width: pixelWidth, height: pixelHeight });
    
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
            }
            setGridData(newGridData);
            console.log("Init received, grid length =", g.length);
          } else if (data.type === "updatePixel") {
            const { x, y, color } = data;
            setGridData((prev) => ({ ...prev, [`${x},${y}`]: color }));
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
    };
  }, [pixelWidth, pixelHeight]);

  // Handle canvas setup and resizing
  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Detect if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
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
      checkMobile();
    };

    // Keyboard event listeners for navigation mode (desktop only)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && (e.key === 'Shift' || e.key === 'Control')) {
        setIsNavigationMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isMobile && (e.key === 'Shift' || e.key === 'Control')) {
        setIsNavigationMode(false);
      }
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    resizeCanvas();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctxRef.current = ctx;
        ctx.imageSmoothingEnabled = false;
      }
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.style.overflow = "";
    };
  }, [isMobile]);

  // Update canvas size when display size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasDisplaySize.width > 0) {
      canvas.width = canvasDisplaySize.width;
      canvas.height = canvasDisplaySize.height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctxRef.current = ctx;
      }
    }
  }, [canvasDisplaySize]);

  // Redraw canvas when relevant state changes
  useEffect(() => {
    redrawCanvas();
  }, [gridData, zoom, pan, hoverPixel, dimensions, canvasDisplaySize]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(10, zoom * zoomFactor));

    // Zoom towards mouse position
    const zoomRatio = newZoom / zoom;
    setPan(prev => ({
      x: mouseX / zoom + (prev.x - mouseX / zoom) * zoomRatio,
      y: mouseY / zoom + (prev.y - mouseY / zoom) * zoomRatio
    }));
    setZoom(newZoom);
  };

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      // On desktop: only drag if navigation mode is active
      // On mobile: always allow dragging
      if (isMobile || isNavigationMode) {
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      setPan(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (gridPos.x >= 0 && gridPos.x < dimensions.width && 
          gridPos.y >= 0 && gridPos.y < dimensions.height) {
        setHoverPixel(gridPos);
      } else {
        setHoverPixel(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverPixel(null);
  };

  // Touch events for mobile with long-press detection
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const gridPos = screenToGrid(touch.clientX, touch.clientY);

      // Start long-press timer
      const timeout = setTimeout(() => {
        if (gridPos.x >= 0 && gridPos.x < dimensions.width && 
            gridPos.y >= 0 && gridPos.y < dimensions.height) {
          const socket = socketRef.current;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({ type: "placePixel", x: gridPos.x, y: gridPos.y, color: selectedColor }),
            );
          }
        }
      }, 2000); // 2 seconds
      setLongPressTimeout(timeout);

      setIsDragging(true);
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastTouchDistance(distance);
      setIsDragging(false); // Stop dragging when pinching
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (longPressTimeout) {
      clearTimeout(longPressTimeout); // Cancel long-press if the user moves
      setLongPressTimeout(null);
    }
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - lastMousePos.x;
      const deltaY = e.touches[0].clientY - lastMousePos.y;
      setPan(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }));
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (lastTouchDistance > 0) {
        const zoomFactor = distance / lastTouchDistance;
        const newZoom = Math.max(0.5, Math.min(10, zoom * zoomFactor));
        setZoom(newZoom);
      }
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout); // Cancel long-press if the user lifts their finger
      setLongPressTimeout(null);
    }
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only allow pixel placement on desktop when not in navigation mode and not dragging
    if (isMobile || isDragging || isNavigationMode) return;
    
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const gridPos = screenToGrid(e.clientX, e.clientY);
    if (gridPos.x >= 0 && gridPos.x < dimensions.width && 
        gridPos.y >= 0 && gridPos.y < dimensions.height) {
      socket.send(
        JSON.stringify({ type: "placePixel", x: gridPos.x, y: gridPos.y, color: selectedColor }),
      );
    }
  };

  // Get cursor style based on mode
  const getCursorStyle = () => {
    if (isDragging) return "grabbing";
    if (isMobile || isNavigationMode) return "grab";
    return "crosshair";
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

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(10, prev * 1.2))}
          className="bg-white border border-gray-300 p-2 rounded shadow hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))}
          className="bg-white border border-gray-300 p-2 rounded shadow hover:bg-gray-50"
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="bg-white border border-gray-300 p-1 text-xs rounded shadow hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {/* Navigation hint for desktop */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-20 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
          {isNavigationMode ? "Mode Navigation (Shift/Ctrl)" : "Mode Placement - Maintenez Shift/Ctrl pour naviguer"}
        </div>
      )}

      {/* Mobile instructions */}
      {isMobile && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-black bg-opacity-75 text-white p-2 rounded text-sm text-center">
          Appuyez longuement pour placer un pixel
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: `${canvasDisplaySize.width}px`,
          height: `${canvasDisplaySize.height}px`,
          imageRendering: "pixelated",
          cursor: getCursorStyle()
        }}
        className="border border-gray-300 z-10"
        onClick={placePixel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
