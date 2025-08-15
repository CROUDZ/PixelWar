// PixelCanvas.tsx (React + Next.js app dir -> "use client")
"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import PixelSelector from "@/components/PixelSelector";
import ValidePixel from "@/components/ValidePixel";
import { useCooldown } from "@/hooks/useCooldown";
import { useSession } from "next-auth/react";

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
  const [selectedColor, setSelectedColor] = useState("#FF0000");

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  // Navigation mode state
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [longPressTimeout, setLongPressTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Validation pixel state
  const [showValidation, setShowValidation] = useState(false);
  const [validationPixel, setValidationPixel] = useState<{
    x: number;
    y: number;
    color: string;
  } | null>(null);

  // Hook pour gérer le cooldown côté serveur
  const { cooldown } = useCooldown();
  const { data: session } = useSession();

  // Transform screen coordinates to grid coordinates
  const screenToGrid = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const pixelSize = canvasDisplaySize.width / dimensions.width;
    return {
      x: Math.floor((canvasX / zoom - pan.x) / pixelSize),
      y: Math.floor((canvasY / zoom - pan.y) / pixelSize),
    };
  }, [canvasDisplaySize, dimensions, zoom, pan]);

  // Redraw the entire canvas with zoom and pan transformations
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || dimensions.width === 0) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);
    const pixelSize = canvasDisplaySize.width / dimensions.width;
    // Draw grid & hover in one pass
    for (let x = 0; x < dimensions.width; x++) {
      for (let y = 0; y < dimensions.height; y++) {
        const color = gridData[`${x},${y}`] || "#FFFFFF";
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        // Draw hover effect directly if needed
        if (
          hoverPixel &&
          hoverPixel.x === x &&
          hoverPixel.y === y
        ) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#CCCCCC";
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          ctx.restore();
        }
      }
    }
    // Draw border
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2222FF";
    ctx.strokeRect(0, 0, dimensions.width * pixelSize, dimensions.height * pixelSize);
    ctx.restore();
    ctx.restore();
  }, [zoom, pan, dimensions, canvasDisplaySize, gridData, hoverPixel]);

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
      };

      socket.onerror = (err) => {
        console.error("WS error", err);
      };

      socket.onclose = (ev) => {
        console.log("WS closed", ev.reason || ev.code);
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
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
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
      if (!isMobile && (e.key === "Shift" || e.key === "Control")) {
        setIsNavigationMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isMobile && (e.key === "Shift" || e.key === "Control")) {
        setIsNavigationMode(false);
      }
    };

    // Add wheel event listener manually to allow preventDefault
    const canvasElement = canvasRef.current;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasElement!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(10, zoom * zoomFactor));
      const zoomRatio = newZoom / zoom;
      setPan((prev) => ({
        x: mouseX / zoom + (prev.x - mouseX / zoom) * zoomRatio,
        y: mouseY / zoom + (prev.y - mouseY / zoom) * zoomRatio,
      }));
      setZoom(newZoom);
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    if (canvasElement) {
      canvasElement.addEventListener("wheel", wheelHandler, { passive: false });
    }
    
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
      if (canvasElement) {
        canvasElement.removeEventListener("wheel", wheelHandler);
      }
      document.body.style.overflow = "";
    };
  }, [isMobile, zoom]);

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
  }, [redrawCanvas]);

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setHasDragged(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    if (isMobile || isNavigationMode) setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (isDragging) {
      if (moveDistance > 5 && lastMousePos.x !== 0 && lastMousePos.y !== 0) {
        setHasDragged(true);
        setPan((prev) => ({ x: prev.x + deltaX / zoom, y: prev.y + deltaY / zoom }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
      return;
    }
    
    // Always update hover pixel when not dragging
    const gridPos = screenToGrid(e.clientX, e.clientY);
    if (
      gridPos.x >= 0 &&
      gridPos.x < dimensions.width &&
      gridPos.y >= 0 &&
      gridPos.y < dimensions.height
    ) {
      setHoverPixel(gridPos);
    } else {
      setHoverPixel(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    // Update hover pixel immediately after stopping drag
    if (!hasDragged) {
      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (
        gridPos.x >= 0 &&
        gridPos.x < dimensions.width &&
        gridPos.y >= 0 &&
        gridPos.y < dimensions.height
      ) {
        setHoverPixel(gridPos);
      } else {
        setHoverPixel(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasDragged(false);
    setHoverPixel(null);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const gridPos = screenToGrid(touch.clientX, touch.clientY);
      if (
        gridPos.x >= 0 &&
        gridPos.x < dimensions.width &&
        gridPos.y >= 0 &&
        gridPos.y < dimensions.height
      ) {
        // Check if cooldown is active before showing validation
        if (cooldown > 0) {
          console.log(`Cooldown actif: ${cooldown} secondes restantes`);
          return;
        }
        
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          setValidationPixel({ x: gridPos.x, y: gridPos.y, color: selectedColor });
          setShowValidation(true);
          return;
        }
      }
      setIsDragging(true);
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      setLastTouchDistance(distance);
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    if (e.touches.length === 1 && isDragging) {
      const { clientX, clientY } = e.touches[0];
      setPan((prev) => ({ x: prev.x + (clientX - lastMousePos.x) / zoom, y: prev.y + (clientY - lastMousePos.y) / zoom }));
      setLastMousePos({ x: clientX, y: clientY });
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      if (lastTouchDistance > 0) {
        setZoom(Math.max(0.5, Math.min(10, zoom * (distance / lastTouchDistance))));
      }
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log("placePixel called - isMobile:", isMobile, "hasDragged:", hasDragged);
    
    // Reset hasDragged for next interaction
    setHasDragged(false);
    
    // Don't place pixel if we just dragged or if we're on mobile (touch events handle this)
    if (isMobile || hasDragged) {
      console.log("Pixel placement blocked");
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready");
      return;
    }

    const gridPos = screenToGrid(e.clientX, e.clientY);
    console.log("Grid position:", gridPos);
    
    if (
      gridPos.x >= 0 &&
      gridPos.x < dimensions.width &&
      gridPos.y >= 0 &&
      gridPos.y < dimensions.height
    ) {
      // Check if cooldown is active before showing validation
      if (cooldown > 0) {
        console.log(`Cooldown actif: ${cooldown} secondes restantes`);
        return;
      }
      
      console.log("Setting validation pixel");
      setValidationPixel({
        x: gridPos.x,
        y: gridPos.y,
        color: selectedColor,
      });
      setShowValidation(true);
    }
  };

  // Handle pixel validation
  const handleValidatePixel = (x: number, y: number, color: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "placePixel",
          x,
          y,
          color,
          userId: session?.user?.id, // Ajouter l'ID utilisateur
        }),
      );
    }
    setShowValidation(false);
    setValidationPixel(null);
  };

  // Handle pixel validation cancellation
  const handleCancelValidation = () => {
    console.log("Cancelling validation");
    setShowValidation(false);
    setValidationPixel(null);
  };

  // Debug: log validation state
  useEffect(() => {
    console.log("Validation state:", { showValidation, validationPixel });
  }, [showValidation, validationPixel]);

  // Get cursor style based on mode
  const getCursorStyle = () =>
    isDragging && hasDragged ? "grabbing" : isMobile ? "crosshair" : isNavigationMode ? "grab" : "crosshair";

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

      {/* Cooldown indicator */}
      {cooldown > 0 && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Cooldown: {cooldown}s
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(10, prev * 1.2))}
          className="bg-white border border-gray-300 p-2 rounded shadow hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.5, prev / 1.2))}
          className="bg-white border border-gray-300 p-2 rounded shadow hover:bg-gray-50"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="bg-white border border-gray-300 p-1 text-xs rounded shadow hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {/* Navigation hint for desktop */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-20 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
          {isNavigationMode
            ? "Mode Navigation (Shift/Ctrl) - Glissez pour naviguer"
            : "Cliquez pour placer un pixel - Maintenez Shift/Ctrl + Glissez pour naviguer"}
        </div>
      )}

      {/* Mobile instructions */}
      {isMobile && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-black bg-opacity-75 text-white p-2 rounded text-sm text-center">
          Touchez pour placer un pixel
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: `${canvasDisplaySize.width}px`,
          height: `${canvasDisplaySize.height}px`,
          imageRendering: "pixelated",
          cursor: getCursorStyle(),
        }}
        className="border border-gray-300 z-10"
        onClick={placePixel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Pixel validation modal */}
      {showValidation && validationPixel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ValidePixel
            initialX={validationPixel.x}
            initialY={validationPixel.y}
            initialColor={validationPixel.color}
            onValidate={handleValidatePixel}
            onCancel={handleCancelValidation}
          />
        </div>
      )}
    </div>
  );
}
