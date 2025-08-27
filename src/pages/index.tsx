// pages/HomePage.tsx (amélioration responsive)

"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { X, Settings, BarChart3 } from "lucide-react";
import type { PixelCanvasHandle } from "@/components/pixel/PixelCanvas";
import Header from "@/components/header/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import Footer from "@/components/layout/Footer";
import PixelCanvas from "@/components/pixel/PixelCanvas";


const OverlayImage = dynamic(() => import("@/components/pixel/OverlayImage"), {
  ssr: false,
});
const PixelInformations = dynamic(
  () => import("@/components/layout/PixelInfo"),
  {
    ssr: false,
  },
);
const OverlayControlsImage = dynamic(
  () => import("@/components/settings/OverlayControlsImage"),
  { ssr: false },
);
const NavigationOverlay = dynamic(
  () => import("@/components/infos/NavigationOverlay"),
  { ssr: false },
);
const AdminPanel = dynamic(() => import("@/components/settings/AdminPanel"), {
  ssr: false,
});
const PixelCount = dynamic(() => import("@/components/infos/PixelCount"), {
  ssr: false,
});
const Banned = dynamic(() => import("@/components/banned"), { ssr: false });

type OverlayTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

interface CanvasNavState {
  isNavigationMode: boolean;
  isMobile: boolean;
  showAdminPanel: boolean;
  isAdminSelecting: boolean;
  adminSelectionStart: { x: number; y: number } | null;
  zoom: number;
  pan: { x: number; y: number };
  navigationDisabled: boolean;
  onNavMove: (direction: "up" | "down" | "left" | "right") => void;
}

const HomePage: React.FC = () => {
  const { data: session } = useSession();
  const [showOverlayControls, setShowOverlayControls] = useState<boolean>(false);
  const [showPixelInfos, setShowPixelInfos] = useState<boolean>(false);
  const [showNavInfo, setShowNavInfo] = useState<boolean>(false);
  const [canvasNavState, setCanvasNavState] = useState<CanvasNavState>({
    isNavigationMode: false,
    isMobile: false,
    showAdminPanel: false,
    isAdminSelecting: false,
    adminSelectionStart: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    navigationDisabled: false,
    onNavMove: () => {}, // Fonction vide par défaut, sera remplacée par celle du canvas
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasApiRef = useRef<PixelCanvasHandle | null>(null);

  const [src, setSrc] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.5);
  const [transform, setTransform] = useState<OverlayTransform>({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    rotation: 0,
  });
  const [showPixelCount, setShowPixelCount] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSelectedSize, setAdminSelectedSize] = useState(5);
  const [adminColor, setAdminColor] = useState("#FF0000");
  const [isAdminSelecting, setIsAdminSelecting] = useState(false);

  useEffect(() => {
    const updateMobile = () => {
      const isMobile = window.innerWidth < 768;
      setCanvasNavState((s) => ({ ...s, isMobile }));
      console.log("[HomePage] (FR) Mode mobile mis à jour :", isMobile);
    };
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  // Fermeture rapide des overlays avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowOverlayControls(false);
        setShowPixelInfos(false);
        setShowNavInfo(false);
        setShowPixelCount(false);
        setShowAdminPanel(false);
        console.log("[HomePage] (FR) Fermeture rapide des overlays avec Échap");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fonction de reset pour remettre la vue à l'état initial
  const handleResetGrid = () => {
    if (canvasApiRef.current) {
      canvasApiRef.current.resetView();
      console.log("[HomePage] (FR) Vue du canvas réinitialisée");
    }
  };

  const closeAllOverlays = () => {
    setShowOverlayControls(false);
    setShowPixelInfos(false);
    setShowNavInfo(false);
    setShowPixelCount(false);
    setShowAdminPanel(false);
  };

  if (session?.user?.banned) {
    console.log(
      "[HomePage] (FR) Utilisateur banni, affichage du composant Banned",
    );
    return <Banned />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      <Header />

      <main
        className="relative z-10 flex flex-col"
        style={{ minHeight: "calc(100vh - 96px)" }}
      >
        {/* Mobile overlay backdrop */}
        <AnimatePresence>
          {(showOverlayControls ||
            showPixelInfos ||
            showNavInfo ||
            showPixelCount ||
            showAdminPanel) && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
              onClick={closeAllOverlays}
            />
          )}
        </AnimatePresence>

        <div className="flex w-full justify-center items-center">
          {/* Left Sidebar */}
          <div className="z-50 pointer-events-auto">
            <div className="w-full md:w-20">
              <LeftSidebar
                showOverlayControls={showOverlayControls}
                showPixelInfos={showPixelInfos}
                showNavInfo={showNavInfo}
                showPixelCount={showPixelCount}
                showAdminPanel={showAdminPanel}
                onToggleOverlayControls={() => setShowOverlayControls((s) => !s)}
                onTogglePixelInfos={() => setShowPixelInfos((s) => !s)}
                onToggleNavInfo={() => setShowNavInfo((s) => !s)}
                onTogglePixelCount={() => setShowPixelCount((s) => !s)}
                onToggleAdminPanel={() => setShowAdminPanel((s) => !s)}
                isAdmin={session?.user?.role === "ADMIN"}
                A2F={session?.user?.twoFA ?? false} // Ajout de la vérification A2F avec une valeur par défaut
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex justify-center items-center w-full px-4 md:px-12 py-6">
            {/* Left Side Panel */}
            <AnimatePresence>
              {showOverlayControls && (
                <m.aside
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto shadow-2xl z-40 rounded-2xl mr-4"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Contrôles Overlay
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Gestion des images
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowOverlayControls(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                    <OverlayControlsImage
                      src={src}
                      show={show}
                      opacity={opacity}
                      transform={transform}
                      onToggleShow={setShow}
                      onChangeSrc={(s) => setSrc(s)}
                      onChangeOpacity={setOpacity}
                      onChangeTransform={(patch) =>
                        setTransform((t) => ({ ...t, ...patch }))
                      }
                      onRemove={() => {
                        setSrc("");
                        setShow(false);
                      }}
                      onClose={() => setShowOverlayControls(false)}
                    />
                  </div>
                </m.aside>
              )}
            </AnimatePresence>

            {/* Canvas Section */}
            <m.section
              className="flex-1 flex items-center justify-center w-full"
              layout
            >
              <div
                ref={canvasContainerRef}
                className="relative flex items-center justify-center"
                style={{
                  width: "min(94vw, 980px)",
                  maxWidth: "980px",
                  aspectRatio: "1 / 1",
                }}
              >
                <div className="relative group w-full h-full">
                  <PixelCanvas
                    ref={canvasApiRef}
                    onStateChange={setCanvasNavState}
                    showAdminPanelProp={showAdminPanel}
                    adminSelectedSizeProp={adminSelectedSize}
                    adminColorProp={adminColor}
                    isAdminSelectingProp={isAdminSelecting}
                  />
                </div>

                <OverlayImage
                  targetRef={canvasContainerRef as React.RefObject<HTMLElement>}
                  src={src}
                  show={show}
                  opacity={opacity}
                  transform={transform}
                  zIndex={20}
                  canvasZoom={canvasNavState.zoom}
                  canvasPan={canvasNavState.pan}
                  pixelSize={canvasApiRef.current?.getPixelSize() || 1}
                />
              </div>
            </m.section>

            {/* Right Side Panel */}
            <AnimatePresence>
              {(showNavInfo || showPixelCount || showAdminPanel) && (
                <m.aside
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="hidden md:block bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50 overflow-y-auto shadow-2xl z-40 rounded-2xl ml-4"
                >
                  <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Stats & Contrôles
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Performances en temps réel
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closeAllOverlays}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden"
                      >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <AnimatePresence mode="wait">
                      {showNavInfo && (
                        <m.div
                          key="nav-info"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <NavigationOverlay
                            isMobile={canvasNavState.isMobile}
                            isNavigationMode={canvasNavState.isNavigationMode}
                            showAdminPanel={canvasNavState.showAdminPanel}
                            isAdminSelecting={canvasNavState.isAdminSelecting}
                            isVisible={() => setShowNavInfo(!showNavInfo)}
                            onResetGrid={handleResetGrid}
                          />
                        </m.div>
                      )}

                      {showPixelCount && (
                        <m.div
                          key="pixel-count"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <PixelCount />
                        </m.div>
                      )}

                      {showAdminPanel && (
                        <m.div
                          key="admin-panel"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <AdminPanel
                            visible={showAdminPanel}
                            adminColor={adminColor}
                            adminSelectedSize={adminSelectedSize}
                            isAdminSelecting={isAdminSelecting}
                            onClose={() => setShowAdminPanel(false)}
                            onChangeColor={(c) => setAdminColor(c)}
                            onChangeSelectedSize={(s) => setAdminSelectedSize(s)}
                            onToggleSelecting={(b) => setIsAdminSelecting(b)}
                          />
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                </m.aside>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Pixel Informations Modal */}
      <AnimatePresence>
        {showPixelInfos && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-4 md:mx-32 my-8 p-6 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50"
          >
            <PixelInformations />
          </m.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default HomePage;
