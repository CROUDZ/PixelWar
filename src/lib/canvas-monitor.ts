// Utilitaire de debug et monitoring pour PixelCanvas
export interface CanvasDebugInfo {
  gridStatus: "loading" | "loaded" | "error";
  connectionStatus: "connected" | "disconnected" | "connecting";
  lastSyncTime: number;
  missedUpdates: number;
  pixelCount: number;
  gridConsistency: boolean;
}

export class CanvasMonitor {
  private static instance: CanvasMonitor;
  private debugInfo: CanvasDebugInfo = {
    gridStatus: "loading",
    connectionStatus: "disconnected",
    lastSyncTime: 0,
    missedUpdates: 0,
    pixelCount: 0,
    gridConsistency: true,
  };

  private listeners: Array<(info: CanvasDebugInfo) => void> = [];

  static getInstance(): CanvasMonitor {
    if (!CanvasMonitor.instance) {
      CanvasMonitor.instance = new CanvasMonitor();
    }
    return CanvasMonitor.instance;
  }

  subscribe(listener: (info: CanvasDebugInfo) => void): () => void {
    this.listeners.push(listener);
    // Envoyer l'état actuel immédiatement
    listener(this.debugInfo);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  updateGridStatus(status: CanvasDebugInfo["gridStatus"]) {
    this.debugInfo.gridStatus = status;
    this.notifyListeners();
  }

  updateConnectionStatus(status: CanvasDebugInfo["connectionStatus"]) {
    this.debugInfo.connectionStatus = status;
    this.notifyListeners();
  }

  updateSyncTime() {
    this.debugInfo.lastSyncTime = Date.now();
    this.notifyListeners();
  }

  incrementMissedUpdates() {
    this.debugInfo.missedUpdates++;
    this.notifyListeners();
  }

  resetMissedUpdates() {
    this.debugInfo.missedUpdates = 0;
    this.notifyListeners();
  }

  updatePixelCount(count: number) {
    this.debugInfo.pixelCount = count;
    this.notifyListeners();
  }

  checkGridConsistency(grid: string[] | null, expectedSize: number): boolean {
    const isConsistent =
      grid !== null &&
      Array.isArray(grid) &&
      grid.length === expectedSize &&
      grid.every(
        (cell) => typeof cell === "string" && /^#[0-9A-F]{6}$/i.test(cell),
      );

    this.debugInfo.gridConsistency = isConsistent;
    this.notifyListeners();
    return isConsistent;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener({ ...this.debugInfo }));
  }

  getDebugReport(): string {
    const info = this.debugInfo;
    return `
🐛 PixelCanvas Debug Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grid Status: ${info.gridStatus}
Connection: ${info.connectionStatus}
Last Sync: ${info.lastSyncTime > 0 ? new Date(info.lastSyncTime).toLocaleTimeString() : "Never"}
Missed Updates: ${info.missedUpdates}
Pixel Count: ${info.pixelCount}
Grid Consistency: ${info.gridConsistency ? "✅" : "❌"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// Hook React pour utiliser le monitor
import { useEffect, useState } from "react";

export function useCanvasMonitor() {
  const [debugInfo, setDebugInfo] = useState<CanvasDebugInfo | null>(null);

  useEffect(() => {
    const monitor = CanvasMonitor.getInstance();
    const unsubscribe = monitor.subscribe(setDebugInfo);
    return unsubscribe;
  }, []);

  return {
    debugInfo,
    monitor: CanvasMonitor.getInstance(),
  };
}
