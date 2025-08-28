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
import {
  subscribeWS,
  subscribeConnectionState,
  sendWS,
  isWSConnected,
  type ConnectionState,
} from "@/lib/ws";
import { CanvasMonitor } from "@/lib/canvas-monitor";
import ValidePixel from "./ValidePixel";
import { useEventMode } from "@/context/EventMode";

// Helper function: convertit #RRGGBB ou #RGB -> Uint32 dans le buffer (little-endian ABGR pour ImageData)
const hexToRGBAUint32 = (hex: string): number => {
  if (!hex) return 0xffffffff;
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return 0xffffffff;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (255 << 24) | (b << 16) | (g << 8) | r;
};

// Interface pour l'aperçu admin
interface AdminPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isSelecting: boolean;
}

// Props du composant PixelCanvas
interface PixelCanvasProps {
  selectedColor?: string;
  onStateChange?: (state: {
    isNavigationMode: boolean;
    isMobile: boolean;
    showAdminPanel: boolean;
    isAdminSelecting: boolean;
    adminSelectionStart: { x: number; y: number } | null;
    zoom: number;
    pan: { x: number; y: number };
    navigationDisabled: boolean;
    onNavMove: (direction: "up" | "down" | "left" | "right") => void;
  }) => void;
  showAdminPanelProp?: boolean;
  adminSelectedSizeProp?: number;
  adminColorProp?: string;
  isAdminSelectingProp?: boolean;
}

// Type pour la référence du canvas
export type PixelCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (z: number) => void;
  resetView: () => void;
  getZoom: () => number;
  setPan: (p: { x: number; y: number }) => void;
  getPixelSize: () => number;
};

const PixelCanvas = forwardRef<PixelCanvasHandle, PixelCanvasProps>(
  function PixelCanvas(
    {
      selectedColor = "#000000",
      onStateChange,
      showAdminPanelProp,
      adminSelectedSizeProp,
      adminColorProp,
      isAdminSelectingProp,
    },
    ref,
  ) {
    // Récupération de la session utilisateur
    const { data: session } = useSession();
    const userId = session?.user?.id ?? null;
    const isAdmin = session?.user?.role === "ADMIN";

    const { width: pixelWidth, height: pixelHeight } = useEventMode();

    // Références pour les canvas (bg + overlay)
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Références pour l'offscreen rendering
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const offscreenImageDataRef = useRef<ImageData | null>(null);
    const bufferRef = useRef<Uint32Array | null>(null);

    const lastHoverProcessRef = useRef<number>(0);

    // Flags de redraw pour éviter les rendus inutiles
    const needsRedrawRef = useRef({ bg: false, overlay: false });
    const offscreenDirtyRef = useRef(false);

    // Refs pour éviter setState intensifs
    const zoomRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const hoverRef = useRef<{ x: number; y: number } | null>(null);
    const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);

    const gridRef = useRef<string[] | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [canvasDisplaySize, setCanvasDisplaySize] = useState({
      width: 0,
      height: 0,
    });
    const [isGridLoaded, setIsGridLoaded] = useState(false);

    // État de connexion WebSocket centralisé
    const [connectionState, setConnectionState] = useState<ConnectionState>({
      isConnected: false,
      isConnecting: true,
      lastConnected: null,
      reconnectAttempts: 0,
    });

    // Navigation (utilise des refs pour éviter setState intensifs)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [isNavigationMode, setIsNavigationMode] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Synchroniser les refs avec les états
    useEffect(() => {
      zoomRef.current = zoom;
      needsRedrawRef.current.bg = true;
      needsRedrawRef.current.overlay = true;
    }, [zoom]);

    useEffect(() => {
      panRef.current = pan;
      needsRedrawRef.current.bg = true;
      needsRedrawRef.current.overlay = true;
    }, [pan]);

    // Validation
    const [showValidation, setShowValidation] = useState(false);
    const [validationPixel, setValidationPixel] = useState<{
      x: number;
      y: number;
      color: string;
    } | null>(null);

    // État admin
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [adminSelectedSize, setAdminSelectedSize] = useState(5);
    const [adminColor, setAdminColor] = useState("#FF0000");
    const [isAdminSelecting, setIsAdminSelecting] = useState(false);
    const [adminSelectionStart, setAdminSelectionStart] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [adminPreview, setAdminPreview] = useState<AdminPreview | null>(null);

    // Synchronisation de la grille avec monitoring
    const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(0);
    const [missedUpdates, setMissedUpdates] = useState<number>(0);
    const monitor = CanvasMonitor.getInstance();

    // Débogage : log des mises à jour manquées
    useEffect(() => {
      if (missedUpdates > 0 && process.env.NODE_ENV !== "production") {
        console.warn(`[PixelCanvas] Mises à jour manquées : ${missedUpdates}`);
        console.log(
          "[PixelCanvas] (FR) Nombre de mises à jour manquées :",
          missedUpdates,
        );
      }
    }, [missedUpdates]);

    // pixelSize memo
    const pixelSize = useMemo(() => {
      if (dimensions.width === 0 || canvasDisplaySize.width === 0) return 0;
      return canvasDisplaySize.width / dimensions.width;
    }, [dimensions.width, canvasDisplaySize.width]);

    // Calcul du nombre de pixels visibles dans le viewport (UTILISE CSS pixels, pas device pixels)
    const visiblePixelCount = useMemo(() => {
      if (dimensions.width === 0 || dimensions.height === 0) return 0;
      const canvas = bgCanvasRef.current;
      if (!canvas) return 0;

      // obtenir la taille en CSS pixels (clientWidth = CSS px)
      const cssWidth =
        canvas.clientWidth || canvas.width / (window.devicePixelRatio || 1);
      const cssHeight =
        canvas.clientHeight || canvas.height / (window.devicePixelRatio || 1);

      // Utiliser l'état zoom au lieu de zoomRef.current pour déclencher le recalcul
      const cssPixelSize =
        zoom || canvasDisplaySize.width / Math.max(1, dimensions.width);

      const visiblePixelsX = Math.ceil(cssWidth / cssPixelSize);
      const visiblePixelsY = Math.ceil(cssHeight / cssPixelSize);

      return Math.min(
        visiblePixelsX * visiblePixelsY,
        dimensions.width * dimensions.height,
      );
    }, [dimensions, canvasDisplaySize.width, zoom]); // Ajouter zoom dans les dépendances

    const shouldDisableMouseMove = useMemo(
      () => visiblePixelCount > 20000,
      [visiblePixelCount],
    );

    // Initialisation offscreen canvas et buffer
    const initOffscreenCanvas = useCallback(
      (gridWidth: number, gridHeight: number, grid?: string[]) => {
        const off = document.createElement("canvas");
        off.width = gridWidth;
        off.height = gridHeight;
        const offCtx = off.getContext("2d")!;
        const imageData = offCtx.createImageData(gridWidth, gridHeight);
        const buffer = new Uint32Array(imageData.data.buffer);

        // Remplir buffer depuis la grille
        if (grid && grid.length === buffer.length) {
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = hexToRGBAUint32(grid[i] ?? "#FFFFFF");
          }
        } else {
          buffer.fill(hexToRGBAUint32("#FFFFFF"));
        }

        offCtx.putImageData(imageData, 0, 0);

        // Stocker dans les refs
        offscreenCanvasRef.current = off;
        offscreenCtxRef.current = offCtx;
        offscreenImageDataRef.current = imageData;
        bufferRef.current = buffer;
        offscreenDirtyRef.current = false;

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] Offscreen canvas initialisé:",
            gridWidth,
            "x",
            gridHeight,
          );
        }
      },
      [],
    );

    // Conversion écran -> grille
    // Conversion écran -> grille (utilise CSS pixels et la même convention que le rendu)
    // Conversion écran -> grille (CSS px coherent avec zoomRef)
    const screenToGrid = useCallback(
      (screenX: number, screenY: number) => {
        const canvas = overlayCanvasRef.current || bgCanvasRef.current;
        if (!canvas || dimensions.width === 0 || dimensions.height === 0) {
          return { x: -1, y: -1 };
        }
        const rect = canvas.getBoundingClientRect();
        // coords en CSS pixels
        const canvasX_css = screenX - rect.left;
        const canvasY_css = screenY - rect.top;

        // finalCssPixelSize = CSS px par pixel de grille (zoomRef est défini comme ça)
        const finalCssPixelSize = zoomRef.current;
        if (!finalCssPixelSize || finalCssPixelSize <= 0)
          return { x: -1, y: -1 };

        // panRef.current est en CSS pixels
        const transformedX_css = canvasX_css - panRef.current.x;
        const transformedY_css = canvasY_css - panRef.current.y;

        return {
          x: Math.floor(transformedX_css / finalCssPixelSize),
          y: Math.floor(transformedY_css / finalCssPixelSize),
        };
      },
      [dimensions],
    );

    // Fonction pour déplacer la vue avec le clavier ou les boutons
    const handleNavMove = useCallback(
      (direction: "up" | "down" | "left" | "right") => {
        // distance en CSS pixels (tu peux ajuster 50 => autre valeur)
        const moveCss = 50;
        const newPan = { ...panRef.current };
        switch (direction) {
          case "up":
            newPan.y += moveCss; // move canvas down (viewer moves up)
            break;
          case "down":
            newPan.y -= moveCss;
            break;
          case "left":
            newPan.x += moveCss;
            break;
          case "right":
            newPan.x -= moveCss;
            break;
        }
        panRef.current = newPan;
        setPan(newPan);
        needsRedrawRef.current.bg = true;
        needsRedrawRef.current.overlay = true;

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[PixelCanvas] Navigation ${direction}, nouveau pan:`,
            newPan,
          );
        }
      },
      [],
    );

    // Notifier le parent du changement d'état
    const stateChangeData = useMemo(
      () => ({
        isNavigationMode,
        isMobile,
        showAdminPanel,
        isAdminSelecting,
        adminSelectionStart,
        zoom,
        pan,
        navigationDisabled: shouldDisableMouseMove,
        onNavMove: handleNavMove,
      }),
      [
        isNavigationMode,
        isMobile,
        showAdminPanel,
        isAdminSelecting,
        adminSelectionStart,
        zoom,
        pan,
        shouldDisableMouseMove,
        handleNavMove,
      ],
    );

    useEffect(() => {
      if (typeof onStateChange === "function") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] (FR) Changement d'état transmis au parent :",
            stateChangeData,
          );
        }
        onStateChange(stateChangeData);
      }
    }, [stateChangeData, onStateChange]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => setZoom((p) => Math.min(10, p * 1.2)),
        zoomOut: () => setZoom((p) => Math.max(1, p / 1.2)),
        setZoom: (z: number) => setZoom(Math.max(1, Math.min(10, z))),
        resetView: () => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        },
        getZoom: () => zoomRef.current,
        setPan: (p: { x: number; y: number }) => setPan(p),
        getPixelSize: () => pixelSize,
      }),
      [pixelSize],
    );

    // Synchronisation des props contrôlées
    useEffect(() => {
      if (typeof showAdminPanelProp === "boolean") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] (FR) Prop showAdminPanel modifiée :",
            showAdminPanelProp,
          );
        }
        setShowAdminPanel(showAdminPanelProp);
      }
    }, [showAdminPanelProp]);
    useEffect(() => {
      if (typeof adminSelectedSizeProp === "number") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] (FR) Prop adminSelectedSize modifiée :",
            adminSelectedSizeProp,
          );
        }
        setAdminSelectedSize(adminSelectedSizeProp);
      }
    }, [adminSelectedSizeProp]);
    useEffect(() => {
      if (typeof adminColorProp === "string") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] (FR) Prop adminColor modifiée :",
            adminColorProp,
          );
        }
        setAdminColor(adminColorProp);
      }
    }, [adminColorProp]);
    useEffect(() => {
      if (typeof isAdminSelectingProp === "boolean") {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[PixelCanvas] (FR) Prop isAdminSelecting modifiée :",
            isAdminSelectingProp,
          );
        }
        setIsAdminSelecting(isAdminSelectingProp);
      }
    }, [isAdminSelectingProp]);

    // Remplacer la fonction redrawBgCanvas existante par celle-ci
    const redrawBgCanvas = useCallback(() => {
      const canvas = bgCanvasRef.current;
      const ctx = bgCtxRef.current;
      const offscreenCanvas = offscreenCanvasRef.current;

      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;

      // clear en device pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // affichage placeholder si grille pas encore prête
      if (!isGridLoaded || !offscreenCanvas) {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#666";
        ctx.font = `${16 * dpr}px Arial`;
        ctx.textAlign = "center";
        const text = connectionState.isConnecting
          ? "Connexion..."
          : "Chargement de la toile...";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        return;
      }

      // Transform : 1 unité = 1 pixel de grille, converti en device pixels
      const scale = dpr * zoomRef.current;
      // panRef.current est en CSS px -> on multiplie par dpr pour device px translation
      const tx = Math.round(panRef.current.x * dpr);
      const ty = Math.round(panRef.current.y * dpr);

      // Appliquer transform (scale et translation)
      ctx.setTransform(scale, 0, 0, scale, tx, ty);
      ctx.imageSmoothingEnabled = false;

      // Dessiner l'offscreen (1:1 en pixels de grille). Le transform gère le scaling.
      try {
        ctx.drawImage(offscreenCanvas, 0, 0);
      } catch (e) {
        if (process.env.NODE_ENV !== "production")
          console.error("[PixelCanvas] drawImage failed:", e);
      }

      // RAZ du transform (pratique pour les clears suivants)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }, [isGridLoaded, connectionState.isConnecting]);

    // Centre et adapte le zoom automatiquement quand la grille est prête ou quand la taille du canvas change.
    useEffect(() => {
      if (!isGridLoaded) return;
      if (dimensions.width === 0 || dimensions.height === 0) return;
      if (canvasDisplaySize.width === 0 || canvasDisplaySize.height === 0)
        return;

      // CSS px par pixel de grille pour tout voir
      const pixelSizeCSS_X = canvasDisplaySize.width / dimensions.width;
      const pixelSizeCSS_Y = canvasDisplaySize.height / dimensions.height;
      const fitPixelSizeCSS = Math.min(pixelSizeCSS_X, pixelSizeCSS_Y);

      // zoomRef représente LA taille CSS (px) d'un pixel de grille
      zoomRef.current = fitPixelSizeCSS;
      setZoom(fitPixelSizeCSS);

      // center pan en CSS pixels
      const finalGridWidthCss = dimensions.width * fitPixelSizeCSS;
      const finalGridHeightCss = dimensions.height * fitPixelSizeCSS;
      panRef.current = {
        x: Math.round((canvasDisplaySize.width - finalGridWidthCss) / 2),
        y: Math.round((canvasDisplaySize.height - finalGridHeightCss) / 2),
      };
      setPan({ x: panRef.current.x, y: panRef.current.y });

      needsRedrawRef.current.bg = true;
      needsRedrawRef.current.overlay = true;
    }, [
      isGridLoaded,
      dimensions.width,
      dimensions.height,
      canvasDisplaySize.width,
      canvasDisplaySize.height,
    ]);

    // Fonction de redraw du overlay canvas
    const redrawOverlayCanvas = useCallback(() => {
      const canvas = overlayCanvasRef.current;
      const ctx = overlayCtxRef.current;
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;

      // clear en device pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      if (!isGridLoaded) return;

      // Même transform que pour le bg : 1 unité = 1 pixel de grille
      const scale = dpr * zoomRef.current;
      const tx = Math.round(panRef.current.x * dpr);
      const ty = Math.round(panRef.current.y * dpr);
      ctx.setTransform(scale, 0, 0, scale, tx, ty);

      // Dessiner admin preview en unités de grille
      if (isAdmin && adminPreview) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = adminPreview.color;
        ctx.fillRect(
          adminPreview.x,
          adminPreview.y,
          adminPreview.width,
          adminPreview.height,
        );
        ctx.globalAlpha = 1;
        ctx.strokeStyle = adminPreview.isSelecting ? "#00FF00" : "#FF0000";
        ctx.lineWidth = 2 / zoomRef.current; // largeur en unités grille adaptée à l'écran
        ctx.strokeRect(
          adminPreview.x,
          adminPreview.y,
          adminPreview.width,
          adminPreview.height,
        );
        ctx.restore();
      }

      // Hover (1x1 pixel de grille)
      if (!showAdminPanel && hoverRef.current) {
        const { x, y } = hoverRef.current;
        if (x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = selectedColor;
          ctx.fillRect(x, y, 1, 1); // 1 unité = 1 pixel grille
          ctx.restore();
        }
      }

      // Bordure en unités grille
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 2 / zoomRef.current;
      ctx.strokeRect(0, 0, dimensions.width, dimensions.height);

      // remettre transform à l'identité
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }, [
      isAdmin,
      adminPreview,
      selectedColor,
      isGridLoaded,
      dimensions.width,
      dimensions.height,
      showAdminPanel,
    ]);

    // Setup WebSocket amélioré avec gestion centralisée
    useEffect(() => {
      if (typeof window === "undefined") return;

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[PixelCanvas] (FR) Initialisation des abonnements WebSocket",
        );
      }

      // Abonnement aux changements d'état de connexion
      const unsubscribeConnectionState = subscribeConnectionState((state) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[PixelCanvas] (FR) État de connexion modifié :", state);
        }
        setConnectionState(state);

        // Update monitor
        monitor.updateConnectionStatus(
          state.isConnected
            ? "connected"
            : state.isConnecting
              ? "connecting"
              : "disconnected",
        );

        // Réinitialiser l'état de chargement de la grille en cas de déconnexion
        if (!state.isConnected && !state.isConnecting) {
          setIsGridLoaded(false);
          monitor.updateGridStatus("loading");
        }
      });

      // Abonnement aux messages WebSocket
      const unsubscribeMessages = subscribeWS((data) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[PixelCanvas] (FR) Message reçu :", data.type);
        }

        try {
          if (data.type === "init") {
            const w = Number(data.width) || pixelWidth;
            const h = Number(data.height) || pixelHeight;
            if (process.env.NODE_ENV !== "production") {
              console.log(
                "[PixelCanvas] (FR) Dimensions de la grille :",
                Number(data.width),
                pixelWidth,
              );
              console.log(data.grid);
            }
            setDimensions({ width: w, height: h });

            let grid: string[];
            if (Array.isArray(data.grid) && data.grid.length === w * h) {
              grid = data.grid.map((c: string) =>
                typeof c === "string" ? c.toUpperCase() : "#FFFFFF",
              );
            } else {
              grid = new Array(w * h).fill("#FFFFFF");
            }

            gridRef.current = grid;
            initOffscreenCanvas(w, h, grid);

            setIsGridLoaded(true);
            setLastSyncTimestamp(Date.now());
            setMissedUpdates(0);

            needsRedrawRef.current.bg = true;
            needsRedrawRef.current.overlay = true;

            // Update monitor
            monitor.updateGridStatus("loaded");
            monitor.updateSyncTime();
            monitor.resetMissedUpdates();
            monitor.checkGridConsistency(gridRef.current, w * h);

            // Send auth after successful init
            if (userId) {
              sendWS({
                type: "auth",
                userId,
                clientToken: `${Date.now()}-${Math.random()}`,
              });
            }
            return;
          }

          if (data.type === "updatePixel") {
            const { x, y, color, timestamp } = data;
            if (
              typeof x !== "number" ||
              typeof y !== "number" ||
              !gridRef.current ||
              dimensions.width === 0
            ) {
              return;
            }

            // Vérification des mises à jour manquées
            if (
              timestamp &&
              typeof timestamp === "number" &&
              lastSyncTimestamp > 0
            ) {
              const timeDiff = timestamp - lastSyncTimestamp;
              if (timeDiff < 0) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn(
                    "[PixelCanvas] (FR) Mise à jour pixel obsolète reçue",
                  );
                }
                setMissedUpdates((prev) => {
                  const newCount = prev + 1;
                  monitor.incrementMissedUpdates();
                  return newCount;
                });
                return;
              }
              setLastSyncTimestamp(timestamp);
              monitor.updateSyncTime();
            }

            const index = y * dimensions.width + x;
            if (index >= 0 && index < gridRef.current.length) {
              const colorUpper = String(color ?? "#FFFFFF").toUpperCase();
              gridRef.current[index] = colorUpper;

              // Mise à jour du buffer
              if (bufferRef.current) {
                bufferRef.current[index] = hexToRGBAUint32(colorUpper);
                offscreenDirtyRef.current = true;
              }

              needsRedrawRef.current.bg = true;

              if (process.env.NODE_ENV !== "production") {
                console.log("[PixelCanvas] (FR) Pixel mis à jour :", {
                  x,
                  y,
                  color,
                });
              }
            }
            return;
          }

          if (data.type === "resync") {
            if (process.env.NODE_ENV !== "production") {
              console.log(
                "[PixelCanvas] (FR) Demande de resynchronisation du serveur",
              );
            }
            sendWS({ type: "requestInit", userId });
            return;
          }

          if (data.type === "canvasClear") {
            if (process.env.NODE_ENV !== "production") {
              console.log(
                "[PixelCanvas] (FR) Canvas effacé par l'admin :",
                data,
              );
            }

            if (
              Array.isArray(data.grid) &&
              data.grid.length === dimensions.width * dimensions.height
            ) {
              gridRef.current = [...data.grid];
              initOffscreenCanvas(
                dimensions.width,
                dimensions.height,
                gridRef.current,
              );

              setLastSyncTimestamp(
                data.timestamp && typeof data.timestamp === "number"
                  ? data.timestamp
                  : Date.now(),
              );

              setMissedUpdates(0);
              needsRedrawRef.current.bg = true;
              needsRedrawRef.current.overlay = true;

              // Update monitor
              monitor.updateSyncTime();
              monitor.resetMissedUpdates();
              monitor.updatePixelCount(0);
              monitor.checkGridConsistency(
                gridRef.current,
                dimensions.width * dimensions.height,
              );

              if (process.env.NODE_ENV !== "production") {
                console.log(
                  "[PixelCanvas] (FR) Canvas effacé et réinitialisé avec succès",
                );
              }
            } else {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  "[PixelCanvas] (FR) Données d'effacement de canvas invalides, demande de resynchronisation",
                );
              }
              monitor.updateGridStatus("error");
              sendWS({ type: "requestInit", userId });
            }
            return;
          }

          if (data.type === "error") {
            console.error("[PixelCanvas] (FR) Erreur serveur :", data.message);
            return;
          }
        } catch (e) {
          console.error(
            "[PixelCanvas] (FR) Erreur lors du traitement du message WebSocket :",
            e,
          );
        }
      });

      return () => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[PixelCanvas] (FR) Nettoyage des abonnements WebSocket");
        }
        unsubscribeConnectionState();
        unsubscribeMessages();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pixelWidth, pixelHeight, userId, dimensions.width, dimensions.height]);

    // Initialisation des dimensions lors du changement des props
    useEffect(() => {
      setDimensions({ width: pixelWidth, height: pixelHeight });
      setIsGridLoaded(false);
      setLastSyncTimestamp(0);
      setMissedUpdates(0);
    }, [pixelWidth, pixelHeight]);

    // Fallback init grid si le serveur ne répond jamais et qu'on est connecté
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (
          !isGridLoaded &&
          dimensions.width > 0 &&
          dimensions.height > 0 &&
          connectionState.isConnected
        ) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[PixelCanvas] (FR) Fallback : initialisation d'une grille vide",
            );
          }
          const emptyGrid = new Array(
            dimensions.width * dimensions.height,
          ).fill("#FFFFFF");
          gridRef.current = emptyGrid;
          initOffscreenCanvas(dimensions.width, dimensions.height, emptyGrid);
          setIsGridLoaded(true);
          needsRedrawRef.current.bg = true;
        }
      }, 5000);
      return () => clearTimeout(timeoutId);
    }, [
      dimensions.width,
      dimensions.height,
      isGridLoaded,
      connectionState.isConnected,
      initOffscreenCanvas,
    ]);

    // Traitement batché des mouvements de pointeur
    useEffect(() => {
      let rafId: number | null = null;

      const processPendingPointer = () => {
        const now = performance.now();
        const pending = pendingPointerRef.current;

        if (pending) {
          // n'essaye de mettre à jour le hover que si suffisamment de temps s'est écoulé
          const gridPos = screenToGrid(pending.x, pending.y);
          if (
            gridPos.x >= 0 &&
            gridPos.x < dimensions.width &&
            gridPos.y >= 0 &&
            gridPos.y < dimensions.height
          ) {
            const newHover = { x: gridPos.x, y: gridPos.y };
            if (
              !hoverRef.current ||
              hoverRef.current.x !== newHover.x ||
              hoverRef.current.y !== newHover.y
            ) {
              hoverRef.current = newHover;
              needsRedrawRef.current.overlay = true;
            }
          } else {
            if (hoverRef.current) {
              hoverRef.current = null;
              needsRedrawRef.current.overlay = true;
            }

            // on a consommé le pending (on peut le vider)
            pendingPointerRef.current = null;
            lastHoverProcessRef.current = now;
          }
          // sinon on attend (on laisse pending en place pour la prochaine passe)
        }

        rafId = requestAnimationFrame(processPendingPointer);
      };

      rafId = requestAnimationFrame(processPendingPointer);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [shouldDisableMouseMove, screenToGrid, dimensions]);

    // events & resize: no longer forcing body overflow hidden (préserve menus mobiles)
    useEffect(() => {
      const checkMobile = () => {
        const mobile = window.innerWidth <= 768 || "ontouchstart" in window;
        setIsMobile(mobile);
        return mobile;
      };

      const resizeCanvas = () => {
        const header = document.getElementById("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const padding = 32;
        const availableWidth = Math.max(300, window.innerWidth - padding);
        const availableHeight = Math.max(
          300,
          window.innerHeight - headerHeight - padding,
        );
        const aspectRatio = pixelWidth / pixelHeight;
        let canvasSize: number;
        if (availableWidth / availableHeight > aspectRatio) {
          canvasSize = Math.min(availableHeight, availableWidth / aspectRatio);
        } else {
          canvasSize = Math.min(availableWidth, availableHeight * aspectRatio);
        }
        canvasSize = Math.max(300, Math.min(canvasSize, 1200));
        canvasSize = Math.floor(canvasSize);
        setCanvasDisplaySize({ width: canvasSize, height: canvasSize });
        needsRedrawRef.current.bg = true;
        needsRedrawRef.current.overlay = true;
        checkMobile();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isMobile && (e.key === "Shift" || e.key === "Control")) {
          setIsNavigationMode(true);
        }

        // Navigation avec ZQSD et flèches (toujours actif, même si shouldDisableMouseMove est true)
        if (!showAdminPanel) {
          // Pas de navigation clavier en mode admin
          switch (e.key.toLowerCase()) {
            case "z":
            case "arrowup":
              e.preventDefault();
              handleNavMove("up");
              break;
            case "s":
            case "arrowdown":
              e.preventDefault();
              handleNavMove("down");
              break;
            case "q":
            case "arrowleft":
              e.preventDefault();
              handleNavMove("left");
              break;
            case "d":
            case "arrowright":
              e.preventDefault();
              handleNavMove("right");
              break;
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (!isMobile && (e.key === "Shift" || e.key === "Control")) {
          setIsNavigationMode(false);
        }
      };

      window.addEventListener("resize", resizeCanvas);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      resizeCanvas();

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isMobile, handleNavMove, showAdminPanel, pixelWidth, pixelHeight]);

    // --- replace previous wheel attachment with this robust effect ---
    useEffect(() => {
      // target l'overlay s'il existe sinon le bg
      const target = overlayCanvasRef.current || bgCanvasRef.current;
      if (!target) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = (overlayCanvasRef.current ||
          bgCanvasRef.current)!.getBoundingClientRect();
        const mouseX_css = e.clientX - rect.left;
        const mouseY_css = e.clientY - rect.top;

        const oldZoom = zoomRef.current;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.5, Math.min(40, oldZoom * zoomFactor)); // clamp raisonnable

        const zoomRatio = newZoom / oldZoom;

        // garder le point sous la souris
        panRef.current = {
          x: mouseX_css - zoomRatio * (mouseX_css - panRef.current.x),
          y: mouseY_css - zoomRatio * (mouseY_css - panRef.current.y),
        };

        zoomRef.current = newZoom;
        setZoom(newZoom);
        setPan({ x: panRef.current.x, y: panRef.current.y });

        needsRedrawRef.current.bg = true;
        needsRedrawRef.current.overlay = true;
      };

      // Important: passive: false pour pouvoir preventDefault()
      target.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        target.removeEventListener("wheel", handleWheel);
      };
    }, []); // pas de dépendances qui recréeraient le handler inutilement

    // canvas context setup
    useEffect(() => {
      const bgCanvas = bgCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (bgCanvas && overlayCanvas && canvasDisplaySize.width > 0) {
        const dpr = window.devicePixelRatio || 1;

        // Setup background canvas
        bgCanvas.width = Math.floor(canvasDisplaySize.width * dpr);
        bgCanvas.height = Math.floor(canvasDisplaySize.height * dpr);
        bgCanvas.style.width = canvasDisplaySize.width + "px";
        bgCanvas.style.height = canvasDisplaySize.height + "px";

        // Setup overlay canvas
        overlayCanvas.width = Math.floor(canvasDisplaySize.width * dpr);
        overlayCanvas.height = Math.floor(canvasDisplaySize.height * dpr);
        overlayCanvas.style.width = canvasDisplaySize.width + "px";
        overlayCanvas.style.height = canvasDisplaySize.height + "px";

        const bgCtx = bgCanvas.getContext("2d");
        const overlayCtx = overlayCanvas.getContext("2d");

        if (bgCtx && overlayCtx) {
          bgCtxRef.current = bgCtx;
          overlayCtxRef.current = overlayCtx;
          bgCtx.imageSmoothingEnabled = false;
          overlayCtx.imageSmoothingEnabled = false;

          needsRedrawRef.current.bg = true;
          needsRedrawRef.current.overlay = true;
        }
      }
    }, [canvasDisplaySize]);

    // placeAdminBlock : log en français
    const placeAdminBlock = useCallback(
      (x: number, y: number, width: number, height: number, color: string) => {
        if (!isWSConnected()) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[ADMIN] (FR) WebSocket non connecté");
          }
          return;
        }
        if (!gridRef.current)
          gridRef.current = new Array(
            dimensions.width * dimensions.height,
          ).fill("#FFFFFF");

        const pixels = [];
        const colorUpper = color.toUpperCase();

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
              gridRef.current[index] = colorUpper;

              // Mise à jour du buffer
              if (bufferRef.current) {
                bufferRef.current[index] = hexToRGBAUint32(colorUpper);
              }

              pixels.push({ x: px, y: py, color });
            }
          }
        }

        if (bufferRef.current) {
          offscreenDirtyRef.current = true;
        }
        needsRedrawRef.current.bg = true;

        // Essayer d'envoyer en batch d'abord
        const success = sendWS({
          type: "placeAdminBlock",
          pixels,
          userId,
          isAdmin: true,
        });

        if (!success) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[ADMIN] (FR) Échec de l'envoi du bloc admin en batch, tentative pixel par pixel",
            );
          }
          // Fallback to individual pixel sends if batch failed
          pixels.forEach(({ x: px, y: py, color: pixelColor }) => {
            sendWS({
              type: "placePixel",
              x: px,
              y: py,
              color: pixelColor,
              userId,
              isAdmin: true,
            });
          });
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[ADMIN] (FR) Bloc admin envoyé avec succès :",
              pixels.length,
              "pixels",
            );
          }
        }
      },
      [dimensions, userId],
    );

    // RAF principal avec optimisations
    useEffect(() => {
      const animate = () => {
        // Mise à jour de l'offscreen canvas si nécessaire
        if (
          offscreenDirtyRef.current &&
          offscreenCtxRef.current &&
          offscreenImageDataRef.current
        ) {
          offscreenCtxRef.current.putImageData(
            offscreenImageDataRef.current,
            0,
            0,
          );
          offscreenDirtyRef.current = false;
        }

        // Redraw background seulement si nécessaire
        if (needsRedrawRef.current.bg) {
          redrawBgCanvas();
          needsRedrawRef.current.bg = false;
        }

        // Redraw overlay seulement si nécessaire
        if (needsRedrawRef.current.overlay) {
          redrawOverlayCanvas();
          needsRedrawRef.current.overlay = false;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
      };
    }, [redrawBgCanvas, redrawOverlayCanvas]);

    // admin click/move handlers
    const handleAdminClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAdmin || !showAdminPanel) return false;
        const gridPos = screenToGrid(e.clientX, e.clientY);
        if (
          gridPos.x < 0 ||
          gridPos.x >= dimensions.width ||
          gridPos.y < 0 ||
          gridPos.y >= dimensions.height
        )
          return false;

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
            needsRedrawRef.current.overlay = true;
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
            needsRedrawRef.current.overlay = true;
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
          needsRedrawRef.current.overlay = true;
          return;
        }

        let newPreview: AdminPreview | null = null;

        if (isAdminSelecting && adminSelectionStart) {
          const minX = Math.min(adminSelectionStart.x, gridPos.x);
          const maxX = Math.max(adminSelectionStart.x, gridPos.x);
          const minY = Math.min(adminSelectionStart.y, gridPos.y);
          const maxY = Math.max(adminSelectionStart.y, gridPos.y);
          newPreview = {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            color: adminColor,
            isSelecting: true,
          };
        } else if (!isAdminSelecting) {
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
          newPreview = {
            x: startX,
            y: startY,
            width: endX - startX + 1,
            height: endY - startY + 1,
            color: adminColor,
            isSelecting: false,
          };
        }

        setAdminPreview(newPreview);
        needsRedrawRef.current.overlay = true;
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

    // mouse/touch events
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        if (isAdmin && showAdminPanel) {
          const handled = handleAdminClick(e);
          if (handled) return;
        }
        setHasDragged(false);
        setLastMousePos({ x: e.clientX, y: e.clientY });
        if (isMobile || isNavigationMode) setIsDragging(true);
      },
      [isAdmin, showAdminPanel, handleAdminClick, isMobile, isNavigationMode],
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Admin handling prioritaire
        if (isAdmin && showAdminPanel) {
          handleAdminMouseMove(e);
          return;
        }

        // Gestion du drag
        if (isDragging) {
          const deltaX = e.clientX - lastMousePos.x; // client coords are CSS px
          const deltaY = e.clientY - lastMousePos.y;
          setHasDragged(true);

          // pan is in CSS pixels — on l'incrémente directement par le delta de la souris
          panRef.current = {
            x: panRef.current.x + deltaX,
            y: panRef.current.y + deltaY,
          };
          setPan({ x: panRef.current.x, y: panRef.current.y });
          setLastMousePos({ x: e.clientX, y: e.clientY });

          needsRedrawRef.current.bg = true;
          needsRedrawRef.current.overlay = true;
          return;
        }

        // On alimente le batcher **à chaque move** (même si on throttlera ensuite)
        pendingPointerRef.current = { x: e.clientX, y: e.clientY };
      },
      [isAdmin, showAdminPanel, handleAdminMouseMove, isDragging, lastMousePos],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false);
        if (!hasDragged && !showAdminPanel && !shouldDisableMouseMove) {
          const gridPos = screenToGrid(e.clientX, e.clientY);
          if (
            gridPos.x >= 0 &&
            gridPos.x < dimensions.width &&
            gridPos.y >= 0 &&
            gridPos.y < dimensions.height
          ) {
            hoverRef.current = gridPos;
            needsRedrawRef.current.overlay = true;
          } else {
            hoverRef.current = null;
            needsRedrawRef.current.overlay = true;
          }
        }
      },
      [
        hasDragged,
        showAdminPanel,
        shouldDisableMouseMove,
        screenToGrid,
        dimensions,
      ],
    );

    const handleMouseLeave = useCallback(() => {
      setIsDragging(false);
      setHasDragged(false);
      hoverRef.current = null;
      pendingPointerRef.current = null;
      if (isAdmin && showAdminPanel) {
        setAdminPreview(null);
      }
      needsRedrawRef.current.overlay = true;
    }, [isAdmin, showAdminPanel]);

    // touch handlers
    const handleTouchStart = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
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
            if (isWSConnected()) {
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
      },
      [screenToGrid, dimensions, showAdminPanel, selectedColor],
    );

    const handleTouchMove = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          const { clientX, clientY } = e.touches[0];
          const deltaX = clientX - lastMousePos.x;
          const deltaY = clientY - lastMousePos.y;
          if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            setHasDragged(true);
            panRef.current = {
              x: panRef.current.x + deltaX,
              y: panRef.current.y + deltaY,
            };
            setPan({ x: panRef.current.x, y: panRef.current.y });
            setLastMousePos({ x: clientX, y: clientY });

            needsRedrawRef.current.bg = true;
            needsRedrawRef.current.overlay = true;
          }
        }
      },
      [isDragging, lastMousePos],
    );

    const handleTouchEnd = useCallback(() => {
      setIsDragging(false);
    }, []);

    // place a pixel (click)
    const placePixel = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isMobile || hasDragged || showAdminPanel) return;
        if (!isWSConnected()) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("WebSocket non connecté pour le placement du pixel");
          }
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
            color: selectedColor,
          });
          setShowValidation(true);
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[PixelCanvas] (FR) Pixel sélectionné pour validation :",
              gridPos.x,
              gridPos.y,
              selectedColor,
            );
          }
        }
      },
      [
        isMobile,
        hasDragged,
        showAdminPanel,
        screenToGrid,
        dimensions,
        selectedColor,
      ],
    );

    // validate pixel
    const handleValidatePixel = useCallback(
      (x: number, y: number, color: string) => {
        if (!isWSConnected()) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("WebSocket non connecté pour la validation du pixel");
          }
          setShowValidation(false);
          setValidationPixel(null);
          return;
        }

        const name = session?.user?.name || "Nom inconnu";
        const avatar = session?.user?.image || null;

        const success = sendWS({
          type: "placePixel",
          x,
          y,
          color,
          userId,
          name,
          avatar,
        });

        if (success) {
          // Mise à jour optimiste de la grille locale
          if (!gridRef.current)
            gridRef.current = new Array(
              dimensions.width * dimensions.height,
            ).fill("#FFFFFF");
          const index = y * dimensions.width + x;
          const colorUpper = color.toUpperCase();
          if (index >= 0 && index < gridRef.current.length) {
            gridRef.current[index] = colorUpper;

            // Mise à jour du buffer
            if (bufferRef.current) {
              bufferRef.current[index] = hexToRGBAUint32(colorUpper);
              offscreenDirtyRef.current = true;
            }
            needsRedrawRef.current.bg = true;
          }
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[PixelCanvas] (FR) Pixel validé et mis à jour localement :",
              x,
              y,
              color,
            );
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "Échec de l'envoi du placement du pixel - mis en attente pour retry",
            );
          }
        }

        setShowValidation(false);
        setValidationPixel(null);
      },
      [userId, dimensions, session?.user?.name, session?.user?.image],
    );

    const handleCancelValidation = useCallback(() => {
      setShowValidation(false);
      setValidationPixel(null);
    }, []);

    const getCursorStyle = useMemo(() => {
      if (showAdminPanel && isAdmin) return "crosshair";
      if (isDragging && hasDragged) return "grabbing";
      if (isMobile) return "crosshair";
      if (isNavigationMode) return "grab";
      return "crosshair";
    }, [
      showAdminPanel,
      isAdmin,
      isDragging,
      hasDragged,
      isMobile,
      isNavigationMode,
    ]);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Background Canvas */}
          <canvas
            ref={bgCanvasRef}
            style={{
              display: "block",
              width: `${canvasDisplaySize.width}px`,
              height: `${canvasDisplaySize.height}px`,
              imageRendering: "pixelated",
              touchAction: "none",
              msTouchAction: "none",
              WebkitTapHighlightColor: "transparent",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)`,
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              opacity: isGridLoaded ? 1 : 0.7,
            }}
            aria-label="Zone de dessin pixel-art collaborative"
            role="application"
            className="hover:shadow-2xl transition-all duration-300 ease-out"
          />
          {/* Overlay Canvas */}
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              display: "block",
              width: `${canvasDisplaySize.width}px`,
              height: `${canvasDisplaySize.height}px`,
              imageRendering: "pixelated",
              cursor: getCursorStyle,
              touchAction: "none",
              msTouchAction: "none",
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
            }}
            onClick={placePixel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          {(!isGridLoaded || !connectionState.isConnected) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-700 font-medium">
                  {connectionState.isConnecting
                    ? "Connexion au serveur..."
                    : "Chargement de la toile..."}
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
