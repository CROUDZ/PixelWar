"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getWS } from "@/lib/ws";
import PixelSelector from "./PixelSelector";
import ValidePixel from "./ValidePixel";

interface AdminPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isSelecting: boolean;
}

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
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Grid et état basique
  const gridRef = useRef<string[] | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Navigation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Validation
  const [showValidation, setShowValidation] = useState(false);
  const [validationPixel, setValidationPixel] = useState<{
    x: number;
    y: number;
    color: string;
  } | null>(null);
  const [totalPixels, setTotalPixels] = useState<number>(0);

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSelectedSize, setAdminSelectedSize] = useState(5);
  const [adminColor, setAdminColor] = useState("#FF0000");
  const [isAdminSelecting, setIsAdminSelecting] = useState(false);
  const [adminSelectionStart, setAdminSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [adminPreview, setAdminPreview] = useState<AdminPreview | null>(null);

  // Conversion coordonnées écran -> grille
  const screenToGrid = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || dimensions.width === 0) return { x: -1, y: -1 };

      const rect = canvas.getBoundingClientRect();
      const canvasX = screenX - rect.left;
      const canvasY = screenY - rect.top;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const realCanvasX = canvasX * scaleX;
      const realCanvasY = canvasY * scaleY;

      const transformedX = realCanvasX / zoom - pan.x;
      const transformedY = realCanvasY / zoom - pan.y;

      const pixelSize = canvas.width / dimensions.width;
      return {
        x: Math.floor(transformedX / pixelSize),
        y: Math.floor(transformedY / pixelSize),
      };
    },
    [dimensions, zoom, pan],
  );

  // Fonction pour dessiner le canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const grid = gridRef.current;
    if (!canvas || !ctx || !grid || dimensions.width === 0) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    const pixelSize = canvas.width / dimensions.width;

    // Dessiner la grille
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        const color = grid[y * dimensions.width + x] ?? "#FFFFFF";
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round(x * pixelSize),
          Math.round(y * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize),
        );
      }
    }

    // Preview admin
    if (isAdmin && adminPreview) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = adminPreview.color;
      ctx.fillRect(
        Math.round(adminPreview.x * pixelSize),
        Math.round(adminPreview.y * pixelSize),
        Math.ceil(adminPreview.width * pixelSize),
        Math.ceil(adminPreview.height * pixelSize),
      );

      // Bordure pour la preview
      ctx.globalAlpha = 1;
      ctx.strokeStyle = adminPreview.isSelecting ? "#00FF00" : "#FF0000";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(adminPreview.x * pixelSize),
        Math.round(adminPreview.y * pixelSize),
        Math.ceil(adminPreview.width * pixelSize),
        Math.ceil(adminPreview.height * pixelSize),
      );
      ctx.restore();
    }

    // Hover normal (seulement si pas en mode admin)
    if (!showAdminPanel && hoverPixel) {
      const { x, y } = hoverPixel;
      if (x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = selectedColor;
        ctx.fillRect(
          Math.round(x * pixelSize),
          Math.round(y * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize),
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    zoom,
    pan,
    dimensions,
    hoverPixel,
    selectedColor,
    isAdmin,
    adminPreview,
    showAdminPanel,
  ]);

  // WebSocket setup (inchangé)
  useEffect(() => {
    console.log("Setting up WebSocket connection...", totalPixels);
    const ws = getWS();
    socketRef.current = ws;
    if (!ws) {
      console.error("Failed to create WebSocket connection");
      return;
    }

    const handleText = async (text: string) => {
      let data: {
        type: string;
        width?: number;
        height?: number;
        totalPixels?: number;
        grid?: string[];
        x?: number;
        y?: number;
        color?: string;
      };
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn("Invalid JSON from WS:", e);
        return;
      }

      if (data.type === "init") {
        const w = Number(data.width);
        const h = Number(data.height);
        setDimensions({ width: w, height: h });
        setTotalPixels(Number(data.totalPixels ?? 0));
        if (Array.isArray(data.grid) && data.grid.length === w * h) {
          gridRef.current = data.grid.map((c: string) =>
            typeof c === "string" ? c.toUpperCase() : "#FFFFFF",
          );
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvasDisplaySize.width) {
              canvas.width = canvasDisplaySize.width;
              canvas.height = canvasDisplaySize.height;
            }
            ctxRef.current = canvas.getContext("2d");
          }
          redrawCanvas();
          return;
        }
        return;
      }

      if (data.type === "updatePixel") {
        const { x, y, color } = data;
        if (typeof x !== "number" || typeof y !== "number") return;
        if (!gridRef.current || dimensions.width === 0) {
          console.warn("[CLIENT] updatePixel but grid not ready -> ignoring");
          return;
        }
        gridRef.current[y * dimensions.width + x] = (
          color ?? "#FFFFFF"
        ).toUpperCase();
        redrawCanvas();
        return;
      }
    };

    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data === "string") void handleText(ev.data);
    };

    ws.addEventListener("message", onMessage);
    ws.addEventListener("open", () => console.log("WS open (client)"));
    ws.addEventListener("close", () => console.log("WS closed (client)"));
    ws.addEventListener("error", (e) => console.error("WS error (client)", e));

    return () => {
      try {
        ws.removeEventListener("message", onMessage);
      } catch {}
    };
  }, [canvasDisplaySize.width, dimensions.width, redrawCanvas]);

  // Sizing et event setup (inchangé en partie)
  useEffect(() => {
    setDimensions({ width: pixelWidth, height: pixelHeight });
  }, [pixelWidth, pixelHeight]);

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
      if (!canvasElement) return;
      const rect = canvasElement.getBoundingClientRect();
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

  useEffect(() => {
    const id = requestAnimationFrame(() => redrawCanvas());
    return () => cancelAnimationFrame(id);
  }, [redrawCanvas]);

  // Gestion des événements admin
  const handleAdminClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAdmin || !showAdminPanel) return false;

      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (
        gridPos.x < 0 ||
        gridPos.x >= dimensions.width ||
        gridPos.y < 0 ||
        gridPos.y >= dimensions.height
      ) {
        return false;
      }

      if (isAdminSelecting) {
        if (!adminSelectionStart) {
          // Premier clic : début de sélection
          setAdminSelectionStart(gridPos);
          setAdminPreview({
            x: gridPos.x,
            y: gridPos.y,
            width: 1,
            height: 1,
            color: adminColor,
            isSelecting: true,
          });
        } else {
          // Deuxième clic : fin de sélection et placement
          const minX = Math.min(adminSelectionStart.x, gridPos.x);
          const maxX = Math.max(adminSelectionStart.x, gridPos.x);
          const minY = Math.min(adminSelectionStart.y, gridPos.y);
          const maxY = Math.max(adminSelectionStart.y, gridPos.y);

          placeAdminBlock(
            minX,
            minY,
            maxX - minX + 1,
            maxY - minY + 1,
            adminColor,
          );

          setAdminSelectionStart(null);
          setIsAdminSelecting(false);
          setAdminPreview(null);
        }
      } else {
        // Mode bloc fixe
        const half = Math.floor(adminSelectedSize / 2);
        const startX = Math.max(0, gridPos.x - half);
        const startY = Math.max(0, gridPos.y - half);
        const endX = Math.min(
          dimensions.width - 1,
          startX + adminSelectedSize - 1,
        );
        const endY = Math.min(
          dimensions.height - 1,
          startY + adminSelectedSize - 1,
        );

        placeAdminBlock(
          startX,
          startY,
          endX - startX + 1,
          endY - startY + 1,
          adminColor,
        );
      }
      return true;
    },
    [
      isAdmin,
      showAdminPanel,
      isAdminSelecting,
      adminSelectionStart,
      adminSelectedSize,
      adminColor,
      dimensions,
      screenToGrid,
    ],
  );

  const handleAdminMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAdmin || !showAdminPanel) return;

      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (
        gridPos.x < 0 ||
        gridPos.x >= dimensions.width ||
        gridPos.y < 0 ||
        gridPos.y >= dimensions.height
      ) {
        setAdminPreview(null);
        return;
      }

      if (isAdminSelecting) {
        if (adminSelectionStart) {
          const minX = Math.min(adminSelectionStart.x, gridPos.x);
          const maxX = Math.max(adminSelectionStart.x, gridPos.x);
          const minY = Math.min(adminSelectionStart.y, gridPos.y);
          const maxY = Math.max(adminSelectionStart.y, gridPos.y);

          setAdminPreview({
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            color: adminColor,
            isSelecting: true,
          });
        }
      } else {
        const half = Math.floor(adminSelectedSize / 2);
        const startX = Math.max(0, gridPos.x - half);
        const startY = Math.max(0, gridPos.y - half);
        const endX = Math.min(
          dimensions.width - 1,
          startX + adminSelectedSize - 1,
        );
        const endY = Math.min(
          dimensions.height - 1,
          startY + adminSelectedSize - 1,
        );

        setAdminPreview({
          x: startX,
          y: startY,
          width: endX - startX + 1,
          height: endY - startY + 1,
          color: adminColor,
          isSelecting: false,
        });
      }
    },
    [
      isAdmin,
      showAdminPanel,
      isAdminSelecting,
      adminSelectionStart,
      adminSelectedSize,
      adminColor,
      dimensions,
      screenToGrid,
    ],
  );

  const placeAdminBlock = useCallback(
    (x: number, y: number, width: number, height: number, color: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("[ADMIN] Socket not open");
        return;
      }

      // Placement optimiste local
      if (!gridRef.current) {
        gridRef.current = new Array(dimensions.width * dimensions.height).fill(
          "#FFFFFF",
        );
      }

      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (
            px >= 0 &&
            px < dimensions.width &&
            py >= 0 &&
            py < dimensions.height
          ) {
            gridRef.current[py * dimensions.width + px] = color.toUpperCase();

            // Envoyer chaque pixel individuellement au serveur
            const payload = {
              type: "placePixel",
              x: px,
              y: py,
              color: color,
              userId,
              isAdmin: true,
            };
            socket.send(JSON.stringify(payload));
          }
        }
      }

      redrawCanvas();
    },
    [dimensions, userId, redrawCanvas],
  );

  // Gestion des événements souris normaux
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    // Si admin et panneau ouvert, traiter avec la logique admin
    if (isAdmin && showAdminPanel) {
      const handled = handleAdminClick(e);
      if (handled) return;
    }

    setHasDragged(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    if (isMobile || isNavigationMode) setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Si admin et panneau ouvert, traiter avec la logique admin
    if (isAdmin && showAdminPanel) {
      handleAdminMouseMove(e);
      return;
    }

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
    if (!hasDragged && !showAdminPanel) {
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
    if (isAdmin && showAdminPanel) {
      setAdminPreview(null);
    }
  };

  // Événements tactiles (simplifiés)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const gridPos = screenToGrid(touch.clientX, touch.clientY);
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && !showAdminPanel) {
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
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const placePixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHasDragged(false);
    if (isMobile || hasDragged || showAdminPanel) return;

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
    const payload = { type: "placePixel", x, y, color, userId };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }

    if (!gridRef.current)
      gridRef.current = new Array(dimensions.width * dimensions.height).fill(
        "#FFFFFF",
      );
    gridRef.current[y * dimensions.width + x] = (
      color ?? "#FFFFFF"
    ).toUpperCase();
    setTotalPixels((t) => t + 1);
    redrawCanvas();

    setShowValidation(false);
    setValidationPixel(null);
  };

  const handleCancelValidation = () => {
    setShowValidation(false);
    setValidationPixel(null);
  };

  const getCursorStyle = () => {
    if (showAdminPanel && isAdmin) return "crosshair";
    return isDragging && hasDragged
      ? "grabbing"
      : isMobile
        ? "crosshair"
        : isNavigationMode
          ? "grab"
          : "crosshair";
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white">
      {/* Bouton admin */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-30">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              showAdminPanel
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {showAdminPanel ? "Fermer Admin" : "Ouvrir Admin"}
          </button>
        </div>
      )}

      {/* Panneau admin */}
      {isAdmin && showAdminPanel && (
        <div className="absolute top-16 right-4 bg-white border rounded-lg shadow-lg p-4 z-20 w-80">
          <h3 className="text-lg font-semibold mb-4">Panneau Admin</h3>
          <PixelSelector onSelect={setAdminColor} />
          <div className="space-y-4">
            {/* Couleur */}
            <div>
              <label className="block text-sm font-medium mb-2">Couleur</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={adminColor}
                  onChange={(e) => setAdminColor(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  placeholder="#ff0000"
                />
              </div>
            </div>

            {/* Tailles prédéfinies */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Taille de bloc
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 5, 10, 20, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setAdminSelectedSize(size);
                      setIsAdminSelecting(false);
                      setAdminSelectionStart(null);
                      setAdminPreview(null);
                    }}
                    className={`px-2 py-1 text-sm border rounded transition-colors ${
                      adminSelectedSize === size && !isAdminSelecting
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
                <input
                  type="number"
                  value={adminSelectedSize}
                  onChange={(e) => {
                    const value = Math.max(
                      1,
                      Math.min(100, parseInt(e.target.value, 10)),
                    );
                    setAdminSelectedSize(value);
                    setIsAdminSelecting(false);
                    setAdminSelectionStart(null);
                    setAdminPreview(null);
                  }}
                  className="col-span-5 px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            {/* Sélection manuelle */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Sélection manuelle
              </label>
              <button
                onClick={() => {
                  setIsAdminSelecting(!isAdminSelecting);
                  setAdminSelectionStart(null);
                  setAdminPreview(null);
                }}
                className={`w-full px-3 py-2 text-sm border rounded transition-colors ${
                  isAdminSelecting
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {isAdminSelecting
                  ? "Mode sélection activé"
                  : "Activer la sélection"}
              </button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              {isAdminSelecting
                ? adminSelectionStart
                  ? "Cliquez pour définir la fin"
                  : "Cliquez pour définir le début"
                : "Cliquez sur le canvas pour placer un bloc"}
            </div>
          </div>
        </div>
      )}

      {/* Contrôles de zoom */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="flex flex-col gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <button
            aria-label="Zoomer"
            onClick={() => setZoom((p) => Math.min(10, p * 1.2))}
            className="w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            +
          </button>
          <button
            aria-label="Dézoomer"
            onClick={() => setZoom((p) => Math.max(0.5, p / 1.2))}
            className="w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            −
          </button>
          <button
            aria-label="Réinitialiser la vue"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="w-12 h-8 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Mode hint */}
      {!isMobile && !showAdminPanel && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 max-w-xs shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                {isNavigationMode ? (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                    <path
                      d="M7 11l5-5m0 0l5 5m-5-5v12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                    <path
                      d="M15 15l-2 5L9 9l11 4-5 2z"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                  {isNavigationMode ? "Mode Navigation" : "Mode Dessin"}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {isNavigationMode
                    ? "Maintenez Shift/Ctrl • Glissez pour naviguer"
                    : "Cliquez pour placer • Shift/Ctrl + Glisser pour naviguer"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hint admin mode */}
      {!isMobile && showAdminPanel && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm rounded-xl p-4 max-w-xs shadow-lg border border-red-200/50 dark:border-red-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                  <path
                    d="M12 15l3.01-6L9 12l3.01-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-red-900 dark:text-red-100 mb-1">
                  Mode Admin Actif
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {isAdminSelecting
                    ? adminSelectionStart
                      ? "Cliquez pour finir la sélection"
                      : "Cliquez pour commencer la sélection"
                    : "Cliquez pour placer un bloc"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl px-6 py-3">
            <p className="text-sm text-center text-gray-700 dark:text-gray-300 font-medium">
              👆 Touchez pour placer • ✋ Maintenez pour naviguer • 🤏 Pincez
              pour zoomer
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-center w-full h-full p-6">
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: `min(${canvasDisplaySize.width}px, calc(100vw - 8rem))`,
              height: `min(${canvasDisplaySize.height}px, calc(100vh - ${headerHeight}px - 12rem))`,
              maxWidth: "640px",
              maxHeight: "640px",
              imageRendering: "pixelated",
              cursor: getCursorStyle(),
              touchAction: "none",
              msTouchAction: "none",
              WebkitTapHighlightColor: "transparent",
              backgroundColor: "#FFFFFF",
            }}
            onClick={placePixel}
            onMouseDown={(e) => handleMouseDown(e)}
            onMouseMove={(e) => handleMouseMove(e)}
            onMouseUp={(e) => handleMouseUp(e)}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            aria-label="Zone de dessin pixel-art collaborative"
            role="application"
          />
        </div>
      </div>

      {showValidation && validationPixel && (
        <ValidePixel
          initialX={validationPixel.x}
          initialY={validationPixel.y}
          initialColor={validationPixel.color}
          onValidate={handleValidatePixel}
          onCancel={handleCancelValidation}
        />
      )}
    </div>
  );
}
