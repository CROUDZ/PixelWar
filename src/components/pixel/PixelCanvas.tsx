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
import { subscribeWS, subscribeConnectionState, sendWS, isWSConnected, type ConnectionState } from "@/lib/ws";
import { CanvasMonitor } from "@/lib/canvas-monitor";
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
    const animationFrameRef = useRef<number | null>(null);

    const gridRef = useRef<string[] | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [canvasDisplaySize, setCanvasDisplaySize] = useState({
      width: 0,
      height: 0,
    });
    const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
    const [isGridLoaded, setIsGridLoaded] = useState(false);
    
    // Connection state from centralized WebSocket manager
    const [connectionState, setConnectionState] = useState<ConnectionState>({
      isConnected: false,
      isConnecting: true,
      lastConnected: null,
      reconnectAttempts: 0,
    });

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
    const [validationPixel, setValidationPixel] = useState<{ x: number; y: number; color: string } | null>(null);

    // Admin state
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [adminSelectedSize, setAdminSelectedSize] = useState(5);
    const [adminColor, setAdminColor] = useState("#FF0000");
    const [isAdminSelecting, setIsAdminSelecting] = useState(false);
    const [adminSelectionStart, setAdminSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const [adminPreview, setAdminPreview] = useState<AdminPreview | null>(null);

    // Grid synchronization state with monitoring
    const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(0);
    const [missedUpdates, setMissedUpdates] = useState<number>(0);
    const monitor = CanvasMonitor.getInstance();

    // Debug: Log missed updates when they change
    useEffect(() => {
      if (missedUpdates > 0) {
        console.warn(`[PixelCanvas] Missed updates: ${missedUpdates}`);
      }
    }, [missedUpdates]);

    // pixelSize memo
    const pixelSize = useMemo(() => {
      if (dimensions.width === 0 || canvasDisplaySize.width === 0) return 0;
      return canvasDisplaySize.width / dimensions.width;
    }, [dimensions.width, canvasDisplaySize.width]);

    // screen->grid
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
        return { x: Math.floor(transformedX / pixelSize), y: Math.floor(transformedY / pixelSize) };
      },
      [dimensions, zoom, pan, pixelSize],
    );

    // notify parent state change
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
      [isNavigationMode, isMobile, showAdminPanel, isAdminSelecting, adminSelectionStart, zoom, pan],
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

    // controlled props sync
    useEffect(() => {
      if (typeof showAdminPanelProp === "boolean") setShowAdminPanel(showAdminPanelProp);
    }, [showAdminPanelProp]);
    useEffect(() => {
      if (typeof adminSelectedSizeProp === "number") setAdminSelectedSize(adminSelectedSizeProp);
    }, [adminSelectedSizeProp]);
    useEffect(() => {
      if (typeof adminColorProp === "string") setAdminColor(adminColorProp);
    }, [adminColorProp]);
    useEffect(() => {
      if (typeof isAdminSelectingProp === "boolean") setIsAdminSelecting(isAdminSelectingProp);
    }, [isAdminSelectingProp]);

    // redraw function
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const grid = gridRef.current;
      if (!canvas || !ctx || dimensions.width === 0 || pixelSize === 0) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!grid || !isGridLoaded) {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#666";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        const text = connectionState.isConnecting ? "Connexion..." : "Chargement de la toile...";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        return;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);

      const viewportStartX = Math.max(0, Math.floor(-pan.x / pixelSize));
      const viewportStartY = Math.max(0, Math.floor(-pan.y / pixelSize));
      const viewportEndX = Math.min(dimensions.width, Math.ceil((canvas.width / zoom - pan.x) / pixelSize));
      const viewportEndY = Math.min(dimensions.height, Math.ceil((canvas.height / zoom - pan.y) / pixelSize));

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, dimensions.width * pixelSize, dimensions.height * pixelSize);

      for (let y = viewportStartY; y < viewportEndY; y++) {
        for (let x = viewportStartX; x < viewportEndX; x++) {
          const color = grid[y * dimensions.width + x] ?? "#FFFFFF";
          if (color !== "#FFFFFF") {
            ctx.fillStyle = color;
            const pixelX = x * pixelSize;
            const pixelY = y * pixelSize;
            ctx.fillRect(pixelX, pixelY, Math.ceil(pixelSize), Math.ceil(pixelSize));
          }
        }
      }

      if (isAdmin && adminPreview) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = adminPreview.color;
        const previewX = adminPreview.x * pixelSize;
        const previewY = adminPreview.y * pixelSize;
        const previewWidth = adminPreview.width * pixelSize;
        const previewHeight = adminPreview.height * pixelSize;
        ctx.fillRect(previewX, previewY, previewWidth, previewHeight);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = adminPreview.isSelecting ? "#00FF00" : "#FF0000";
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(previewX, previewY, previewWidth, previewHeight);
        ctx.restore();
      }

      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 2 / zoom;
      const canvasWidth = dimensions.width * pixelSize;
      const canvasHeight = dimensions.height * pixelSize;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

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
      connectionState.isConnecting,
      isGridLoaded,
    ]);

    // Enhanced WebSocket setup with centralized connection management
    useEffect(() => {
      if (typeof window === "undefined") return;

      console.log("[PixelCanvas] Setting up WebSocket subscriptions");
      
      // Subscribe to connection state changes with monitoring
      const unsubscribeConnectionState = subscribeConnectionState((state) => {
        console.log("[PixelCanvas] Connection state changed:", state);
        setConnectionState(state);
        
        // Update monitor
        monitor.updateConnectionStatus(
          state.isConnected ? 'connected' : 
          state.isConnecting ? 'connecting' : 'disconnected'
        );
        
        // Reset grid loading state on disconnection
        if (!state.isConnected && !state.isConnecting) {
          setIsGridLoaded(false);
          monitor.updateGridStatus('loading');
        }
      });

      // Subscribe to WebSocket messages
      const unsubscribeMessages = subscribeWS((data) => {
        console.log("[PixelCanvas] Received message:", data.type);
        
        try {
          if (data.type === "init") {
            const w = Number(data.width) || pixelWidth;
            const h = Number(data.height) || pixelHeight;
            setDimensions({ width: w, height: h });

            if (Array.isArray(data.grid) && data.grid.length === w * h) {
              gridRef.current = data.grid.map((c: string) => 
                typeof c === "string" ? c.toUpperCase() : "#FFFFFF"
              );
            } else {
              gridRef.current = new Array(w * h).fill("#FFFFFF");
            }

            setIsGridLoaded(true);
            setLastSyncTimestamp(Date.now());
            setMissedUpdates(0);
            
            // Update monitor
            monitor.updateGridStatus('loaded');
            monitor.updateSyncTime();
            monitor.resetMissedUpdates();
            monitor.checkGridConsistency(gridRef.current, w * h);
            
            // Send auth after successful init
            if (userId) {
              sendWS({ 
                type: "auth", 
                userId,
                clientToken: `${Date.now()}-${Math.random()}` 
              });
            }
            return;
          }

          if (data.type === "updatePixel") {
            const { x, y, color, timestamp } = data;
            if (typeof x !== "number" || typeof y !== "number" || !gridRef.current || dimensions.width === 0) {
              return;
            }
            
            // Check for missed updates (basic sync validation)
            if (timestamp && typeof timestamp === "number" && lastSyncTimestamp > 0) {
              const timeDiff = timestamp - lastSyncTimestamp;
              if (timeDiff < 0) {
                console.warn("[PixelCanvas] Received outdated pixel update");
                setMissedUpdates(prev => {
                  const newCount = prev + 1;
                  monitor.incrementMissedUpdates();
                  return newCount;
                });
                return; // Skip outdated updates
              }
              setLastSyncTimestamp(timestamp);
              monitor.updateSyncTime();
            }
            
            const index = y * dimensions.width + x;
            if (index >= 0 && index < gridRef.current.length) {
              gridRef.current[index] = String(color ?? "#FFFFFF").toUpperCase();
            }
            return;
          }

          if (data.type === "resync") {
            console.log("[PixelCanvas] Server requested resync");
            // Request full grid resync
            sendWS({ type: "requestInit", userId });
            return;
          }

          if (data.type === "canvasClear") {
            console.log("[PixelCanvas] Canvas cleared by admin:", data);
            
            // Reset the grid to the new empty state
            if (Array.isArray(data.grid) && data.grid.length === dimensions.width * dimensions.height) {
              gridRef.current = [...data.grid];
              setLastSyncTimestamp(data.timestamp && typeof data.timestamp === "number" ? data.timestamp : Date.now());
              
              // Reset missed updates counter
              setMissedUpdates(0);
              
              // Update monitor
              monitor.updateSyncTime();
              monitor.resetMissedUpdates();
              monitor.updatePixelCount(0);
              monitor.checkGridConsistency(gridRef.current, dimensions.width * dimensions.height);
              
              console.log("[PixelCanvas] Canvas cleared and reset successfully");
            } else {
              console.warn("[PixelCanvas] Invalid canvas clear data, requesting resync");
              monitor.updateGridStatus('error');
              sendWS({ type: "requestInit", userId });
            }
            return;
          }

          if (data.type === "error") {
            console.error("[PixelCanvas] Server error:", data.message);
            return;
          }
          
        } catch (e) {
          console.error("[PixelCanvas] Error handling WebSocket message:", e);
        }
      });

      return () => {
        console.log("[PixelCanvas] Cleaning up WebSocket subscriptions");
        unsubscribeConnectionState();
        unsubscribeMessages();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pixelWidth, pixelHeight, userId]);

    // initialize dimensions when props change
    useEffect(() => {
      setDimensions({ width: pixelWidth, height: pixelHeight });
      setIsGridLoaded(false);
      
      // Reset sync state
      setLastSyncTimestamp(0);
      setMissedUpdates(0);
    }, [pixelWidth, pixelHeight]);

    // fallback init grid if server never answered and we're connected
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (!isGridLoaded && dimensions.width > 0 && dimensions.height > 0 && connectionState.isConnected) {
          console.warn("[PixelCanvas] Fallback: initializing empty grid");
          gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
          setIsGridLoaded(true);
        }
      }, 5000);
      return () => clearTimeout(timeoutId);
      }, [dimensions.width, dimensions.height, isGridLoaded, connectionState.isConnected]);    // events & resize: no longer forcing body overflow hidden (préserve menus mobiles)
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
        const availableHeight = Math.max(300, window.innerHeight - headerHeight - padding);
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

      window.addEventListener("resize", resizeCanvas);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      if (canvas) canvas.addEventListener("wheel", handleWheel, { passive: false });

      resizeCanvas();

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        if (canvas) canvas.removeEventListener("wheel", handleWheel);
      };
    }, [isMobile, zoom, pixelWidth, pixelHeight]);

    // canvas context setup
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && canvasDisplaySize.width > 0) {
        canvas.width = canvasDisplaySize.width;
        canvas.height = canvasDisplaySize.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctxRef.current = ctx;
          ctx.imageSmoothingEnabled = false;
        }
      }
    }, [canvasDisplaySize]);

    // place admin block
    const placeAdminBlock = useCallback(
      (x: number, y: number, width: number, height: number, color: string) => {
        if (!isWSConnected()) {
          console.warn("[ADMIN] WebSocket not connected");
          return;
        }
        if (!gridRef.current) gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
        const pixels = [];
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < dimensions.width && py >= 0 && py < dimensions.height) {
              const index = py * dimensions.width + px;
              gridRef.current[index] = color.toUpperCase();
              pixels.push({ x: px, y: py, color });
            }
          }
        }
        
        // Try to send as a batch first
        const success = sendWS({ type: "placeAdminBlock", pixels, userId, isAdmin: true });
        
        if (!success) {
          // Fallback to individual pixel sends if batch failed
          console.warn("Batch admin block failed, trying individual pixels");
          pixels.forEach(({ x: px, y: py, color: pixelColor }) => {
            sendWS({ type: "placePixel", x: px, y: py, color: pixelColor, userId, isAdmin: true });
          });
        }
      },
      [dimensions, userId],
    );

    // RAF loop
    useEffect(() => {
      const animate = () => {
        redrawCanvas();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }, [redrawCanvas]);

    // admin click/move handlers
    const handleAdminClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAdmin || !showAdminPanel) return false;
        const gridPos = screenToGrid(e.clientX, e.clientY);
        if (gridPos.x < 0 || gridPos.x >= dimensions.width || gridPos.y < 0 || gridPos.y >= dimensions.height) return false;

        if (isAdminSelecting) {
          if (!adminSelectionStart) {
            setAdminSelectionStart(gridPos);
            setAdminPreview({ x: gridPos.x, y: gridPos.y, width: 1, height: 1, color: adminColor, isSelecting: true });
          } else {
            const minX = Math.min(adminSelectionStart.x, gridPos.x);
            const maxX = Math.max(adminSelectionStart.x, gridPos.x);
            const minY = Math.min(adminSelectionStart.y, gridPos.y);
            const maxY = Math.max(adminSelectionStart.y, gridPos.y);
            placeAdminBlock(minX, minY, maxX - minX + 1, maxY - minY + 1, adminColor);
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
          placeAdminBlock(startX, startY, endX - startX + 1, endY - startY + 1, adminColor);
        }
        return true;
      },
      [isAdmin, showAdminPanel, isAdminSelecting, adminSelectionStart, adminSelectedSize, adminColor, dimensions, screenToGrid, placeAdminBlock],
    );

    const handleAdminMouseMove = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAdmin || !showAdminPanel) return;
        const gridPos = screenToGrid(e.clientX, e.clientY);
        if (gridPos.x < 0 || gridPos.x >= dimensions.width || gridPos.y < 0 || gridPos.y >= dimensions.height) {
          setAdminPreview(null);
          return;
        }
        if (isAdminSelecting && adminSelectionStart) {
          const minX = Math.min(adminSelectionStart.x, gridPos.x);
          const maxX = Math.max(adminSelectionStart.x, gridPos.x);
          const minY = Math.min(adminSelectionStart.y, gridPos.y);
          const maxY = Math.max(adminSelectionStart.y, gridPos.y);
          setAdminPreview({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, color: adminColor, isSelecting: true });
        } else if (!isAdminSelecting) {
          const half = Math.floor(adminSelectedSize / 2);
          const startX = Math.max(0, gridPos.x - half);
          const startY = Math.max(0, gridPos.y - half);
          const endX = Math.min(dimensions.width - 1, startX + adminSelectedSize - 1);
          const endY = Math.min(dimensions.height - 1, startY + adminSelectedSize - 1);
          setAdminPreview({ x: startX, y: startY, width: endX - startX + 1, height: endY - startY + 1, color: adminColor, isSelecting: false });
        }
      },
      [isAdmin, showAdminPanel, isAdminSelecting, adminSelectionStart, adminSelectedSize, adminColor, dimensions, screenToGrid],
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
        if (isAdmin && showAdminPanel) {
          handleAdminMouseMove(e);
          return;
        }
        if (isDragging) {
          const deltaX = e.clientX - lastMousePos.x;
          const deltaY = e.clientY - lastMousePos.y;
          setHasDragged(true);
          setPan((prev) => ({ x: prev.x + deltaX / zoom, y: prev.y + deltaY / zoom }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
        }
        const gridPos = screenToGrid(e.clientX, e.clientY);
        if (gridPos.x >= 0 && gridPos.x < dimensions.width && gridPos.y >= 0 && gridPos.y < dimensions.height) {
          setHoverPixel(gridPos);
        } else {
          setHoverPixel(null);
        }
      },
      [isAdmin, showAdminPanel, handleAdminMouseMove, isDragging, lastMousePos, zoom, screenToGrid, dimensions],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false);
        if (!hasDragged && !showAdminPanel) {
          const gridPos = screenToGrid(e.clientX, e.clientY);
          if (gridPos.x >= 0 && gridPos.x < dimensions.width && gridPos.y >= 0 && gridPos.y < dimensions.height) {
            setHoverPixel(gridPos);
          } else {
            setHoverPixel(null);
          }
        }
      },
      [hasDragged, showAdminPanel, screenToGrid, dimensions],
    );

    const handleMouseLeave = useCallback(() => {
      setIsDragging(false);
      setHasDragged(false);
      setHoverPixel(null);
      if (isAdmin && showAdminPanel) setAdminPreview(null);
    }, [isAdmin, showAdminPanel]);

    // touch handlers
    const handleTouchStart = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const gridPos = screenToGrid(touch.clientX, touch.clientY);
          if (gridPos.x >= 0 && gridPos.x < dimensions.width && gridPos.y >= 0 && gridPos.y < dimensions.height && !showAdminPanel) {
            if (isWSConnected()) {
              setValidationPixel({ x: gridPos.x, y: gridPos.y, color: selectedColor });
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
            setPan((prev) => ({ x: prev.x + deltaX / zoom, y: prev.y + deltaY / zoom }));
            setLastMousePos({ x: clientX, y: clientY });
          }
        }
      },
      [isDragging, lastMousePos, zoom],
    );

    const handleTouchEnd = useCallback(() => {
      setIsDragging(false);
    }, []);

    // place a pixel (click)
    const placePixel = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isMobile || hasDragged || showAdminPanel) return;
        if (!isWSConnected()) {
          console.warn("WebSocket not connected for pixel placement");
          return;
        }
        const gridPos = screenToGrid(e.clientX, e.clientY);
        if (gridPos.x >= 0 && gridPos.x < dimensions.width && gridPos.y >= 0 && gridPos.y < dimensions.height) {
          setValidationPixel({ x: gridPos.x, y: gridPos.y, color: selectedColor });
          setShowValidation(true);
        }
      },
      [isMobile, hasDragged, showAdminPanel, screenToGrid, dimensions, selectedColor],
    );

    // validate pixel
    const handleValidatePixel = useCallback(
      (x: number, y: number, color: string) => {
        if (!isWSConnected()) {
          console.warn("WebSocket not connected for pixel validation");
          setShowValidation(false);
          setValidationPixel(null);
          return;
        }

        const name = session?.user?.name || "Nom inconnu";
        const avatar = session?.user?.image || null;

        const success = sendWS({ type: "placePixel", x, y, color, userId, name, avatar });

        if (success) {
          // Optimistically update local grid
          if (!gridRef.current) gridRef.current = new Array(dimensions.width * dimensions.height).fill("#FFFFFF");
          const index = y * dimensions.width + x;
          if (index >= 0 && index < gridRef.current.length) {
            gridRef.current[index] = color.toUpperCase();
          }
        } else {
          console.warn("Failed to send pixel placement - queued for retry");
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
              borderRadius: 16,
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)`,
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
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
          {/* WebSocket connection status indicator */}
          <div
            className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
              !connectionState.isConnected ? "bg-red-500" : "bg-green-500"
            }`}
            title={!connectionState.isConnected ? "Disconnected" : "Connected"}
          />
          {(!isGridLoaded || !connectionState.isConnected) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-700 font-medium">{connectionState.isConnecting ? "Connexion au serveur..." : "Chargement de la toile..."}</p>
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
