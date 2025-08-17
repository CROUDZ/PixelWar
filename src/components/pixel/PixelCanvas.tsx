"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import ValidePixel from "@/components/pixel/ValidePixel";
import { useSession } from "next-auth/react";
import { getWS, subscribeWS } from "@/lib/ws";

interface PixelCanvasProps {
  pixelWidth?: number;
  pixelHeight?: number;
  selectedColor?: string;
}

export default function PixelCanvas({
  pixelWidth = 100,
  pixelHeight = 100,
  selectedColor = "#000000",
}: PixelCanvasProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [gridData, setGridData] = useState<Record<string, string>>({});

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [showValidation, setShowValidation] = useState(false);
  const [validationPixel, setValidationPixel] = useState<{
    x: number;
    y: number;
    color: string;
  } | null>(null);

  const screenToGrid = useCallback(
    (screenX: number, screenY: number) => {
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
    },
    [canvasDisplaySize, dimensions, zoom, pan],
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || dimensions.width === 0) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);
    const pixelSize = canvasDisplaySize.width / dimensions.width;
    for (let x = 0; x < dimensions.width; x++) {
      for (let y = 0; y < dimensions.height; y++) {
        const color = gridData[`${x},${y}`] || "#FFFFFF";
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        if (hoverPixel && hoverPixel.x === x && hoverPixel.y === y) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#CCCCCC";
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          ctx.restore();
        }
      }
    }
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2222FF";
    ctx.strokeRect(
      0,
      0,
      dimensions.width * pixelSize,
      dimensions.height * pixelSize,
    );
    ctx.restore();
    ctx.restore();
  }, [zoom, pan, dimensions, canvasDisplaySize, gridData, hoverPixel]);

  // Dans votre PixelCanvas, remplacez cette partie :

  useEffect(() => {
    setDimensions({ width: pixelWidth, height: pixelHeight });

    const reconnectTimeout: NodeJS.Timeout | null = null;

    const socket = getWS();
    socketRef.current = socket;

    const unsubscribe = subscribeWS((data) => {
      try {
        if (data.type === "init") {
          const g = data.grid as string[];
          const newGridData: Record<string, string> = {};
          for (let i = 0; i < g.length; i++) {
            const x = i % (data.width as number);
            const y = Math.floor(i / (data.width as number));
            newGridData[`${x},${y}`] = g[i];
          }
          setGridData(newGridData);
        } else if (data.type === "updatePixel") {
          const { x, y, color } = data as {
            x: number;
            y: number;
            color: string;
          };
          setGridData((prev) => ({ ...prev, [`${x},${y}`]: color }));
        }
      } catch (e) {
        console.error("Bad message from server", e);
      }
    });

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      unsubscribe();
    };
  }, [pixelWidth, pixelHeight]);
  // Canvas setup, resizing, navigation mode...
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const checkMobile = () =>
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    const resizeCanvas = () => {
      const header = document.getElementById("header");
      setHeaderHeight(header ? header.offsetHeight : 0);
      const maxSize = Math.min(
        window.innerWidth - 10,
        window.innerHeight - (header ? header.offsetHeight : 0) - 10,
      );
      setCanvasDisplaySize({ width: maxSize, height: maxSize });
      checkMobile();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && (e.key === "Shift" || e.key === "Control"))
        setIsNavigationMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isMobile && (e.key === "Shift" || e.key === "Control"))
        setIsNavigationMode(false);
    };

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
    if (canvasElement)
      canvasElement.addEventListener("wheel", wheelHandler, { passive: false });

    resizeCanvas();
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctxRef.current = ctx;

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (canvasElement)
        canvasElement.removeEventListener("wheel", wheelHandler);
      document.body.style.overflow = "";
    };
  }, [isMobile, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasDisplaySize.width > 0) {
      canvas.width = canvasDisplaySize.width;
      canvas.height = canvasDisplaySize.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctxRef.current = ctx;
    }
  }, [canvasDisplaySize]);

  useEffect(() => redrawCanvas(), [redrawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setHasDragged(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    if (isMobile || isNavigationMode) setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    if (isDragging) {
      setHasDragged(true);
      setPan((prev) => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom,
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
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
    if (!hasDragged) {
      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (
        gridPos.x >= 0 &&
        gridPos.x < dimensions.width &&
        gridPos.y >= 0 &&
        gridPos.y < dimensions.height
      ) {
        setHoverPixel(gridPos);
      } else setHoverPixel(null);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasDragged(false);
    setHoverPixel(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const gridPos = screenToGrid(touch.clientX, touch.clientY);
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        setValidationPixel({
          x: gridPos.x,
          y: gridPos.y,
          color: selectedColor,
        });
        setShowValidation(true);
        return;
      }
      setIsDragging(true);
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = [e.touches[0], e.touches[1]];
      setLastTouchDistance(
        Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        ),
      );
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const { clientX, clientY } = e.touches[0];
      setPan((prev) => ({
        x: prev.x + (clientX - lastMousePos.x) / zoom,
        y: prev.y + (clientY - lastMousePos.y) / zoom,
      }));
      setLastMousePos({ x: clientX, y: clientY });
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      if (lastTouchDistance > 0)
        setZoom(
          Math.max(0.5, Math.min(10, zoom * (distance / lastTouchDistance))),
        );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHasDragged(false);
    if (isMobile || hasDragged) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const gridPos = screenToGrid(e.clientX, e.clientY);
    if (
      gridPos.x >= 0 &&
      gridPos.x < dimensions.width &&
      gridPos.y >= 0 &&
      gridPos.y < dimensions.height
    ) {
      setValidationPixel({ x: gridPos.x, y: gridPos.y, color: selectedColor });
      setShowValidation(true);
    }
  };

  const handleValidatePixel = (x: number, y: number, color: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && userId) {
      socket.send(JSON.stringify({ type: "placePixel", x, y, color, userId }));
      const now = new Date().toISOString();
      session.user.lastPixelPlaced = now;
    }
    setShowValidation(false);
    setValidationPixel(null);
  };

  const handleCancelValidation = () => {
    setShowValidation(false);
    setValidationPixel(null);
  };

  const getCursorStyle = () =>
    isDragging && hasDragged
      ? "grabbing"
      : isMobile
        ? "crosshair"
        : isNavigationMode
          ? "grab"
          : "crosshair";

  return (
    <div
      id="pixel-canvas-parent"
      className="left-0 right-0 flex justify-center items-center overflow-hidden"
      style={{ top: headerHeight, height: `calc(100vh - ${headerHeight}px)` }}
    >
      <div
        className=" left-0 right-0 bg-white z-0"
        style={{ top: 0, height: `calc(100vh - ${headerHeight}px)` }}
      />

      <div className=" bottom-4 right-4 z-20 flex flex-col gap-2">
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

      {!isMobile && (
        <div className="top-4 right-4 z-20 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
          {isNavigationMode
            ? "Mode Navigation (Shift/Ctrl) - Glissez pour naviguer"
            : "Cliquez pour placer un pixel - Maintenez Shift/Ctrl + Glissez pour naviguer"}
        </div>
      )}

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
