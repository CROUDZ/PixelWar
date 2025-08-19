"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { getWS } from "@/lib/ws";
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
  onStateChange?: (state: {
    isNavigationMode: boolean;
    isMobile: boolean;
    showAdminPanel: boolean;
    isAdminSelecting: boolean;
    adminSelectionStart: { x: number; y: number } | null;
    zoom: number;
    pan: { x: number; y: number };
  }) => void;

  // admin control (optionnel)
  showAdminPanelProp?: boolean;
  adminSelectedSizeProp?: number;
  adminColorProp?: string;
  isAdminSelectingProp?: boolean;
}

export type PixelCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (z: number) => void;
  resetView: () => void;
  getZoom: () => number;
  setPan: (p: { x: number; y: number }) => void;
};

const PixelCanvas = forwardRef<PixelCanvasHandle, PixelCanvasProps>(
  function PixelCanvas(
    {
      pixelWidth = 100,
      pixelHeight = 100,
      selectedColor = "#000000",
      onStateChange,
      showAdminPanelProp,
      adminSelectedSizeProp,
      adminColorProp,
      isAdminSelectingProp,
    },
    ref,
  ) {
    const { data: session } = useSession();
    const userId = session?.user?.id ?? null;
    const isAdmin = session?.user?.role === "ADMIN";

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Grid et état basique
    const gridRef = useRef<string[] | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [canvasDisplaySize, setCanvasDisplaySize] = useState({
      width: 0,
      height: 0,
    });
    const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
      null,
    );
    const [isGridLoaded, setIsGridLoaded] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Mémoisation des valeurs calculées
    const pixelSize = useMemo(() => {
      if (dimensions.width === 0 || canvasDisplaySize.width === 0) return 0;
      return canvasDisplaySize.width / dimensions.width;
    }, [dimensions.width, canvasDisplaySize.width]);

    // Conversion coordonnées écran -> grille optimisée
    const screenToGrid = useCallback(
      (screenX: number, screenY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || dimensions.width === 0 || pixelSize === 0) {
          return { x: -1, y: -1 };
        }

        const rect = canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const realCanvasX = canvasX * scaleX;
        const realCanvasY = canvasY * scaleY;

        const transformedX = realCanvasX / zoom - pan.x;
        const transformedY = realCanvasY / zoom - pan.y;

        return {
          x: Math.floor(transformedX / pixelSize),
          y: Math.floor(transformedY / pixelSize),
        };
      },
      [dimensions, zoom, pan, pixelSize],
    );

    // Notification des changements d'état optimisée
    const stateChangeData = useMemo(
      () => ({
        isNavigationMode,
        isMobile,
        showAdminPanel,
        isAdminSelecting,
        adminSelectionStart,
        zoom,
        pan,
      }),
      [
        isNavigationMode,
        isMobile,
        showAdminPanel,
        isAdminSelecting,
        adminSelectionStart,
        zoom,
        pan,
      ],
    );

    useEffect(() => {
      if (typeof onStateChange === "function") {
        onStateChange(stateChangeData);
      }
    }, [stateChangeData, onStateChange]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => setZoom((p) => Math.min(10, p * 1.2)),
        zoomOut: () => setZoom((p) => Math.max(0.5, p / 1.2)),
        setZoom: (z: number) => setZoom(Math.max(0.5, Math.min(10, z))),
        resetView: () => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        },
        getZoom: () => zoom,
        setPan: (p: { x: number; y: number }) => setPan(p),
      }),
      [zoom],
    );

    // Synchronisation des props contrôlées
    useEffect(() => {
      if (typeof showAdminPanelProp === "boolean") {
        setShowAdminPanel(showAdminPanelProp);
      }
    }, [showAdminPanelProp]);

    useEffect(() => {
      if (typeof adminSelectedSizeProp === "number") {
        setAdminSelectedSize(adminSelectedSizeProp);
      }
    }, [adminSelectedSizeProp]);

    useEffect(() => {
      if (typeof adminColorProp === "string") {
        setAdminColor(adminColorProp);
      }
    }, [adminColorProp]);

    useEffect(() => {
      if (typeof isAdminSelectingProp === "boolean") {
        setIsAdminSelecting(isAdminSelectingProp);
      }
    }, [isAdminSelectingProp]);

    // Fonction de dessin optimisée avec correction des espaces entre pixels
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const grid = gridRef.current;

      if (!canvas || !ctx || dimensions.width === 0 || pixelSize === 0) {
        return;
      }

      // Nettoyer le canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Si la grille n'est pas encore chargée, afficher un indicateur de chargement
      if (!grid || !isGridLoaded) {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#666";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        const text = isConnecting ? "Connexion..." : "Chargement de la toile...";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        return;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);

      // Calculer la zone visible pour optimiser le rendu
      const viewportStartX = Math.max(0, Math.floor(-pan.x / pixelSize));
      const viewportStartY = Math.max(0, Math.floor(-pan.y / pixelSize));
      const viewportEndX = Math.min(
        dimensions.width,
        Math.ceil((canvas.width / zoom - pan.x) / pixelSize),
      );
      const viewportEndY = Math.min(
        dimensions.height,
        Math.ceil((canvas.height / zoom - pan.y) / pixelSize),
      );

      // Dessiner d'abord le fond blanc pour toute la grille
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, dimensions.width * pixelSize, dimensions.height * pixelSize);

      // Puis dessiner uniquement les pixels colorés par-dessus
      for (let y = viewportStartY; y < viewportEndY; y++) {
        for (let x = viewportStartX; x < viewportEndX; x++) {
          const color = grid[y * dimensions.width + x] ?? "#FFFFFF";
          if (color !== "#FFFFFF") {
            ctx.fillStyle = color;
            // Utiliser des coordonnées et tailles exactes sans arrondi
            const pixelX = x * pixelSize;
            const pixelY = y * pixelSize;
            
            // Utiliser Math.ceil pour s'assurer que les pixels couvrent complètement leur zone
            ctx.fillRect(pixelX, pixelY, Math.ceil(pixelSize), Math.ceil(pixelSize));
          }
        }
      }

      // Preview admin
      if (isAdmin && adminPreview) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = adminPreview.color;
        const previewX = adminPreview.x * pixelSize;
        const previewY = adminPreview.y * pixelSize;
        const previewWidth = adminPreview.width * pixelSize;
        const previewHeight = adminPreview.height * pixelSize;
        
        ctx.fillRect(previewX, previewY, previewWidth, previewHeight);

        // Bordure pour la preview
        ctx.globalAlpha = 1;
        ctx.strokeStyle = adminPreview.isSelecting ? "#00FF00" : "#FF0000";
        ctx.lineWidth = 2 / zoom; // Ajuster l'épaisseur selon le zoom
        ctx.strokeRect(previewX, previewY, previewWidth, previewHeight);
        ctx.restore();
      }

      // Bordure du canvas
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 2 / zoom; // Ajuster l'épaisseur selon le zoom
      const canvasWidth = dimensions.width * pixelSize;
      const canvasHeight = dimensions.height * pixelSize;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

      // Hover normal (seulement si pas en mode admin)
      if (!showAdminPanel && hoverPixel) {
        const { x, y } = hoverPixel;
        if (x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = selectedColor;
          const hoverX = x * pixelSize;
          const hoverY = y * pixelSize;
          
          ctx.fillRect(hoverX, hoverY, Math.ceil(pixelSize), Math.ceil(pixelSize));
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
      pixelSize,
      isConnecting,
      isGridLoaded,
    ]);

    // WebSocket setup avec gestion d'erreur améliorée
    useEffect(() => {
      let ws: WebSocket | null = null;
      let reconnectTimeout: NodeJS.Timeout | null = null;

      const connectWebSocket = () => {
        try {
          ws = getWS();
          socketRef.current = ws;

          if (!ws) {
            console.error("Failed to create WebSocket connection");
            return;
          }

          const handleMessage = (ev: MessageEvent) => {
            try {
              if (typeof ev.data !== "string") return;

              const data = JSON.parse(ev.data);

              if (data.type === "init") {
                const w = Number(data.width) || pixelWidth;
                const h = Number(data.height) || pixelHeight;
                setDimensions({ width: w, height: h });
                setTotalPixels(Number(data.totalPixels) || 0);

                if (Array.isArray(data.grid) && data.grid.length === w * h) {
                  gridRef.current = data.grid.map((c: string) =>
                    typeof c === "string" ? c.toUpperCase() : "#FFFFFF",
                  );
                } else {
                  // Initialiser avec un grid vide si pas de données
                  gridRef.current = new Array(w * h).fill("#FFFFFF");
                }
                
                // Marquer la grille comme chargée
                setIsGridLoaded(true);
                setIsConnecting(false);
                console.log("Grid loaded successfully");
                return;
              }

              if (data.type === "updatePixel") {
                const { x, y, color } = data;
                if (
                  typeof x !== "number" ||
                  typeof y !== "number" ||
                  !gridRef.current ||
                  dimensions.width === 0
                ) {
                  return;
                }

                const index = y * dimensions.width + x;
                if (index >= 0 && index < gridRef.current.length) {
                  gridRef.current[index] = (color ?? "#FFFFFF").toUpperCase();
                }
                return;
              }
            } catch (e) {
              console.warn("Error handling WebSocket message:", e);
            }
          };

          const handleOpen = () => {
            console.log("WebSocket connected");
            setIsConnecting(false);
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
            
            // Envoyer l'authentification si disponible
            if (userId && ws) {
              try {
                ws.send(JSON.stringify({
                  type: "auth",
                  userId: userId,
                  clientToken: `${Date.now()}-${Math.random()}`
                }));
              } catch (e) {
                console.warn("Failed to send auth:", e);
              }
            }
          };

          const handleClose = () => {
            console.log("WebSocket disconnected");
            socketRef.current = null;
            setIsConnecting(true);
            setIsGridLoaded(false);
            // Tentative de reconnexion après 3 secondes
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          };

          const handleError = (e: Event) => {
            console.error("WebSocket error:", e);
            setIsConnecting(false);
            // Initialiser une grille vide en cas d'erreur de connexion
            if (!gridRef.current && dimensions.width > 0 && dimensions.height > 0) {
              gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
              setIsGridLoaded(true);
              console.log("Initialized empty grid due to connection error");
            }
          };

          ws.addEventListener("message", handleMessage);
          ws.addEventListener("open", handleOpen);
          ws.addEventListener("close", handleClose);
          ws.addEventListener("error", handleError);

        } catch (error) {
          console.error("Error setting up WebSocket:", error);
        }
      };

      connectWebSocket();

      return () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        if (ws) {
          try {
            ws.close();
          } catch (e) {
            console.warn("Error closing WebSocket:", e);
          }
        }
        socketRef.current = null;
      };
    }, [pixelWidth, pixelHeight, dimensions.width, dimensions.height, userId]);

    // Initialisation des dimensions
    useEffect(() => {
      setDimensions({ width: pixelWidth, height: pixelHeight });
      setIsGridLoaded(false);
      setIsConnecting(true);
    }, [pixelWidth, pixelHeight]);

    // Fallback pour initialiser la grille si pas de données reçues
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (!isGridLoaded && dimensions.width > 0 && dimensions.height > 0) {
          console.log("Initializing empty grid after timeout");
          gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
          setIsGridLoaded(true);
          setIsConnecting(false);
        }
      }, 5000); // Timeout de 5 secondes

      return () => clearTimeout(timeoutId);
    }, [dimensions.width, dimensions.height, isGridLoaded]);

    // Setup des événements et redimensionnement optimisé
    useEffect(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const checkMobile = () => {
        const mobile = window.innerWidth <= 768 || "ontouchstart" in window;
        setIsMobile(mobile);
        return mobile;
      };

      const resizeCanvas = () => {
        const header = document.getElementById("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const padding = 32; // 16px de chaque côté

        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - headerHeight - padding;

        const aspectRatio = pixelWidth / pixelHeight;
        let canvasSize: number;

        if (availableWidth / availableHeight > aspectRatio) {
          canvasSize = Math.min(availableHeight, availableWidth / aspectRatio);
        } else {
          canvasSize = Math.min(availableWidth, availableHeight * aspectRatio);
        }

        // Contraintes de taille
        canvasSize = Math.max(300, Math.min(canvasSize, 1200));
        
        // S'assurer que la taille est un multiple entier pour éviter les problèmes de pixel
        canvasSize = Math.floor(canvasSize);

        setCanvasDisplaySize({
          width: canvasSize,
          height: canvasSize,
        });
        
        checkMobile();
      };

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

      const canvas = canvasRef.current;
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
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

      // Event listeners
      window.addEventListener("resize", resizeCanvas);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      if (canvas) {
        canvas.addEventListener("wheel", handleWheel, { passive: false });
      }

      // Initialisation
      resizeCanvas();

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        if (canvas) {
          canvas.removeEventListener("wheel", handleWheel);
        }
      };
    }, [isMobile, zoom, pixelWidth, pixelHeight]);

    // Setup du contexte canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && canvasDisplaySize.width > 0) {
        // Utiliser la taille d'affichage comme taille réelle du canvas
        canvas.width = canvasDisplaySize.width;
        canvas.height = canvasDisplaySize.height;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctxRef.current = ctx;
          // Configuration du contexte
          ctx.imageSmoothingEnabled = false;
        }
      }
    }, [canvasDisplaySize]);

    // Placement de blocs admin optimisé
    const placeAdminBlock = useCallback(
      (x: number, y: number, width: number, height: number, color: string) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          console.warn("[ADMIN] Socket not ready");
          return;
        }

        if (!gridRef.current) {
          gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
        }

        const pixels = [];
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
              const index = py * dimensions.width + px;
              gridRef.current[index] = color.toUpperCase();
              pixels.push({ x: px, y: py, color });
            }
          }
        }

        // Envoyer tous les pixels en une seule fois si possible
        const payload = {
          type: "placeAdminBlock",
          pixels,
          userId,
          isAdmin: true,
        };

        try {
          socket.send(JSON.stringify(payload));
        } catch (error) {
          console.warn("Error sending admin block:", error);
          // Fallback: envoyer pixel par pixel
          pixels.forEach(({ x: px, y: py, color: pixelColor }) => {
            try {
              socket.send(JSON.stringify({
                type: "placePixel",
                x: px,
                y: py,
                color: pixelColor,
                userId,
                isAdmin: true,
              }));
            } catch (e) {
              console.warn("Error sending individual pixel:", e);
            }
          });
        }
      },
      [dimensions, userId],
    );

    // Animation loop optimisée avec RAF
    useEffect(() => {
      const animate = () => {
        redrawCanvas();
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [redrawCanvas]);

    // Gestion des clics admin optimisée
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
          const half = Math.floor(adminSelectedSize / 2);
          const startX = Math.max(0, gridPos.x - half);
          const startY = Math.max(0, gridPos.y - half);
          const endX = Math.min(dimensions.width - 1, startX + adminSelectedSize - 1);
          const endY = Math.min(dimensions.height - 1, startY + adminSelectedSize - 1);

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
        placeAdminBlock,
      ],
    );

    // Gestion du survol admin optimisée
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

        if (isAdminSelecting && adminSelectionStart) {
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
        } else if (!isAdminSelecting) {
          const half = Math.floor(adminSelectedSize / 2);
          const startX = Math.max(0, gridPos.x - half);
          const startY = Math.max(0, gridPos.y - half);
          const endX = Math.min(dimensions.width - 1, startX + adminSelectedSize - 1);
          const endY = Math.min(dimensions.height - 1, startY + adminSelectedSize - 1);

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

    // Gestion des événements souris optimisée
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;

      if (isAdmin && showAdminPanel) {
        const handled = handleAdminClick(e);
        if (handled) return;
      }

      setHasDragged(false);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      if (isMobile || isNavigationMode) {
        setIsDragging(true);
      }
    }, [isAdmin, showAdminPanel, handleAdminClick, isMobile, isNavigationMode]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isAdmin && showAdminPanel) {
        handleAdminMouseMove(e);
        return;
      }

      if (isDragging) {
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;
        
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
    }, [isAdmin, showAdminPanel, handleAdminMouseMove, isDragging, lastMousePos, zoom, screenToGrid, dimensions]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
        } else {
          setHoverPixel(null);
        }
      }
    }, [hasDragged, showAdminPanel, screenToGrid, dimensions]);

    const handleMouseLeave = useCallback(() => {
      setIsDragging(false);
      setHasDragged(false);
      setHoverPixel(null);
      if (isAdmin && showAdminPanel) {
        setAdminPreview(null);
      }
    }, [isAdmin, showAdminPanel]);

    // Événements tactiles optimisés
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const gridPos = screenToGrid(touch.clientX, touch.clientY);
        
        if (
          gridPos.x >= 0 &&
          gridPos.x < dimensions.width &&
          gridPos.y >= 0 &&
          gridPos.y < dimensions.height &&
          !showAdminPanel
        ) {
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
        }
        
        setIsDragging(true);
        setHasDragged(false);
        setLastMousePos({ x: touch.clientX, y: touch.clientY });
      }
    }, [screenToGrid, dimensions, showAdminPanel, selectedColor]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const { clientX, clientY } = e.touches[0];
        const deltaX = clientX - lastMousePos.x;
        const deltaY = clientY - lastMousePos.y;
        
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          setHasDragged(true);
          setPan((prev) => ({
            x: prev.x + deltaX / zoom,
            y: prev.y + deltaY / zoom,
          }));
          setLastMousePos({ x: clientX, y: clientY });
        }
      }
    }, [isDragging, lastMousePos, zoom]);

    const handleTouchEnd = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Placement de pixel optimisé
    const placePixel = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isMobile || hasDragged || showAdminPanel) return;

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("Socket not ready for pixel placement");
        return;
      }

      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (
        gridPos.x >= 0 &&
        gridPos.x < dimensions.width &&
        gridPos.y >= 0 &&
        gridPos.y < dimensions.height
      ) {
        setValidationPixel({ 
          x: gridPos.x, 
          y: gridPos.y, 
          color: selectedColor 
        });
        setShowValidation(true);
      }
    }, [isMobile, hasDragged, showAdminPanel, screenToGrid, dimensions, selectedColor]);

    // Validation de pixel optimisée
    const handleValidatePixel = useCallback((x: number, y: number, color: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("Socket not ready for pixel validation");
        setShowValidation(false);
        setValidationPixel(null);
        return;
      }

      const payload = { type: "placePixel", x, y, color, userId };
      
      try {
        socket.send(JSON.stringify(payload));

        // Mise à jour optimiste locale
        if (!gridRef.current) {
          gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
        }
        
        const index = y * dimensions.width + x;
        if (index >= 0 && index < gridRef.current.length) {
          gridRef.current[index] = color.toUpperCase();
          setTotalPixels((t) => t + 1);
        }
      } catch (error) {
        console.error("Error sending pixel placement:", error);
      }

      setShowValidation(false);
      setValidationPixel(null);
    }, [userId, dimensions]);

    const handleCancelValidation = useCallback(() => {
      setShowValidation(false);
      setValidationPixel(null);
    }, []);

    // Style de curseur optimisé
    const getCursorStyle = useMemo(() => {
      if (showAdminPanel && isAdmin) return "crosshair";
      if (isDragging && hasDragged) return "grabbing";
      if (isMobile) return "crosshair";
      if (isNavigationMode) return "grab";
      return "crosshair";
    }, [showAdminPanel, isAdmin, isDragging, hasDragged, isMobile, isNavigationMode]);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: `${canvasDisplaySize.width}px`,
              height: `${canvasDisplaySize.height}px`,
              imageRendering: "pixelated",
              cursor: getCursorStyle,
              touchAction: "none",
              msTouchAction: "none",
              WebkitTapHighlightColor: "transparent",
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: isGridLoaded ? 1 : 0.7,
            }}
            onClick={placePixel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            aria-label="Zone de dessin pixel-art collaborative"
            role="application"
            className="hover:shadow-2xl transition-all duration-300 ease-out"
          />
          
          {/* Indicateur de chargement par-dessus le canvas */}
          {(!isGridLoaded || isConnecting) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-700 font-medium">
                  {isConnecting ? "Connexion au serveur..." : "Chargement de la toile..."}
                </p>
              </div>
            </div>
          )}
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
  },
);

export default PixelCanvas;