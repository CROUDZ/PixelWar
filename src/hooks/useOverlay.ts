import { useState, useCallback } from "react";

/**
 * Interface pour la transformation de l'overlay
 */
export interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Hook personnalisé pour gérer l'état de l'overlay
 * Simplifie la gestion de l'overlay dans vos composants
 */
export interface UseOverlayReturn {
  // États
  overlaySrc: string;
  overlayOpacity: number;
  showOverlay: boolean;
  overlayTransform: OverlayTransform;
  
  // Actions
  setOverlaySrc: (src: string) => void;
  setOverlayOpacity: (opacity: number) => void;
  setShowOverlay: (show: boolean) => void;
  setOverlayTransform: (transform: OverlayTransform) => void;
  toggleOverlay: () => void;
  resetOverlay: () => void;
  resetTransform: () => void;
  
  // Configurations rapides
  loadOverlay: (src: string, opacity?: number, show?: boolean) => void;
}

export interface UseOverlayOptions {
  initialSrc?: string;
  initialOpacity?: number;
  initialShow?: boolean;
  initialTransform?: OverlayTransform;
}

const defaultTransform: OverlayTransform = {
  x: 0,
  y: 0,
  width: 300,
  height: 300,
  rotation: 0,
};

export function useOverlay(options: UseOverlayOptions = {}): UseOverlayReturn {
  const {
    initialSrc = "",
    initialOpacity = 0.5,
    initialShow = false,
    initialTransform = defaultTransform,
  } = options;

  const [overlaySrc, setOverlaySrc] = useState(initialSrc);
  const [overlayOpacity, setOverlayOpacity] = useState(initialOpacity);
  const [showOverlay, setShowOverlay] = useState(initialShow);
  const [overlayTransform, setOverlayTransform] = useState<OverlayTransform>(initialTransform);

  const toggleOverlay = useCallback(() => {
    setShowOverlay(prev => !prev);
  }, []);

  const resetOverlay = useCallback(() => {
    setOverlaySrc("");
    setOverlayOpacity(0.5);
    setShowOverlay(false);
    setOverlayTransform(defaultTransform);
  }, []);

  const resetTransform = useCallback(() => {
    setOverlayTransform(defaultTransform);
  }, []);

  const loadOverlay = useCallback((
    src: string, 
    opacity: number = 0.5, 
    show: boolean = true
  ) => {
    setOverlaySrc(src);
    setOverlayOpacity(opacity);
    setShowOverlay(show);
    // Garder la transformation actuelle ou réinitialiser selon les besoins
  }, []);

  return {
    overlaySrc,
    overlayOpacity,
    showOverlay,
    overlayTransform,
    setOverlaySrc,
    setOverlayOpacity,
    setShowOverlay,
    setOverlayTransform,
    toggleOverlay,
    resetOverlay,
    resetTransform,
    loadOverlay,
  };
}

/**
 * Exemples d'utilisation du hook useOverlay
 */

// Exemple 1: Utilisation basique
// const overlay = useOverlay();

// Exemple 2: Avec configuration initiale
// const overlay = useOverlay({
//   initialSrc: "/images/logo.png",
//   initialOpacity: 0.3,
//   initialShow: true
// });

// Exemple 3: Dans un composant
// function MyComponent() {
//   const overlay = useOverlay();
//   
//   return (
//     <PixelCanvasWithOverlay
//       overlaySrc={overlay.overlaySrc}
//       overlayOpacity={overlay.overlayOpacity}
//       showOverlay={overlay.showOverlay}
//       onOverlayChange={overlay.setOverlaySrc}
//       onOpacityChange={overlay.setOverlayOpacity}
//       onShowOverlayChange={overlay.setShowOverlay}
//     />
//   );
// }
