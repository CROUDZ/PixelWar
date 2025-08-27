// pages/HomePage.tsx (design responsive parfait)

"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { X, Settings, BarChart3, Menu } from "lucide-react";
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

  // États des overlays
  const [showOverlayControls, setShowOverlayControls] =
    useState<boolean>(false);
  const [showPixelInfos, setShowPixelInfos] = useState<boolean>(false);
  const [showNavInfo, setShowNavInfo] = useState<boolean>(false);
  const [showPixelCount, setShowPixelCount] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // États responsives
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  const [canvasNavState, setCanvasNavState] = useState<CanvasNavState>({
    isNavigationMode: false,
    isMobile: false,
    showAdminPanel: false,
    isAdminSelecting: false,
    adminSelectionStart: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    navigationDisabled: false,
    onNavMove: () => {},
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasApiRef = useRef<PixelCanvasHandle | null>(null);

  // États de l'overlay image
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

  // États admin
  const [adminSelectedSize, setAdminSelectedSize] = useState(5);
  const [adminColor, setAdminColor] = useState("#FF0000");
  const [isAdminSelecting, setIsAdminSelecting] = useState(false);

  // Gestion responsive avancée
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
      });

      setCanvasNavState((s) => ({
        ...s,
        isMobile: isMobile,
      }));

      // Fermer automatiquement les overlays en mode mobile si nécessaire
      if (
        isMobile &&
        (showOverlayControls || showNavInfo || showPixelCount || showAdminPanel)
      ) {
        // Ne pas fermer automatiquement, laisser l'utilisateur contrôler
      }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, [showOverlayControls, showNavInfo, showPixelCount, showAdminPanel]);

  // Gestion des touches
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllOverlays();
        setShowMobileSidebar(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleResetGrid = () => {
    if (canvasApiRef.current) {
      canvasApiRef.current.resetView();
    }
  };

  const closeAllOverlays = () => {
    setShowOverlayControls(false);
    setShowPixelInfos(false);
    setShowNavInfo(false);
    setShowPixelCount(false);
    setShowAdminPanel(false);
  };

  const getCanvasSize = () => {
    if (screenSize.isMobile) {
      return {
        width: "min(95vw, 400px)",
        maxWidth: "400px",
      };
    } else if (screenSize.isTablet) {
      return {
        width: "min(85vw, 600px)",
        maxWidth: "600px",
      };
    } else {
      return {
        width: "min(70vw, 900px)",
        maxWidth: "900px",
      };
    }
  };

  const getPanelWidth = () => {
    if (screenSize.isMobile) return "w-full max-w-sm";
    if (screenSize.isTablet) return "w-80";
    return "w-96";
  };

  if (session?.user?.banned) {
    return <Banned />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      <Header />

      {/* Mobile Menu Button */}
      {screenSize.isMobile && (
        <div className="fixed top-20 left-4 z-50">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      )}

      <main className="relative flex flex-col min-h-[calc(100vh-96px)]">
        {/* Mobile Backdrop */}
        <AnimatePresence>
          {(showMobileSidebar ||
            showOverlayControls ||
            showPixelInfos ||
            showNavInfo ||
            showPixelCount ||
            showAdminPanel) &&
            screenSize.isMobile && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => {
                  closeAllOverlays();
                  setShowMobileSidebar(false);
                }}
              />
            )}
        </AnimatePresence>

        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          {screenSize.isDesktop && (
            <div className="w-20 mt-4 flex-shrink-0">
              <LeftSidebar
                showOverlayControls={showOverlayControls}
                showPixelInfos={showPixelInfos}
                showNavInfo={showNavInfo}
                showPixelCount={showPixelCount}
                showAdminPanel={showAdminPanel}
                onToggleOverlayControls={() =>
                  setShowOverlayControls((s) => !s)
                }
                onTogglePixelInfos={() => setShowPixelInfos((s) => !s)}
                onToggleNavInfo={() => setShowNavInfo((s) => !s)}
                onTogglePixelCount={() => setShowPixelCount((s) => !s)}
                onToggleAdminPanel={() => setShowAdminPanel((s) => !s)}
                isAdmin={session?.user?.role === "ADMIN"}
                A2F={session?.user?.twoFA ?? false}
              />
            </div>
          )}

          {/* Mobile Sidebar */}
          <AnimatePresence>
            {showMobileSidebar && screenSize.isMobile && (
              <m.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 z-50 pt-20 overflow-y-auto"
              >
                <div className="p-6 h-full flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      Menu
                    </h2>
                    <div className="h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                  </div>

                  {/* Menu Items - Version Mobile Verticale */}
                  <div className="flex-1 space-y-3">
                    <button
                      onClick={() => {
                        setShowOverlayControls((s) => !s);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        showOverlayControls
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-2 border-blue-500/30"
                          : "bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          showOverlayControls
                            ? "bg-blue-500"
                            : "bg-gradient-to-br from-blue-500 to-cyan-500"
                        }`}
                      >
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Contrôles Overlay</div>
                        <div className="text-sm opacity-75">
                          Gestion des images
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowPixelInfos((s) => !s);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        showPixelInfos
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border-2 border-green-500/30"
                          : "bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          showPixelInfos
                            ? "bg-green-500"
                            : "bg-gradient-to-br from-green-500 to-emerald-500"
                        }`}
                      >
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Infos Pixel</div>
                        <div className="text-sm opacity-75">
                          Détails en temps réel
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowNavInfo((s) => !s);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        showNavInfo
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-2 border-purple-500/30"
                          : "bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          showNavInfo
                            ? "bg-purple-500"
                            : "bg-gradient-to-br from-purple-500 to-pink-500"
                        }`}
                      >
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Navigation</div>
                        <div className="text-sm opacity-75">
                          Contrôles de vue
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowPixelCount((s) => !s);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        showPixelCount
                          ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-2 border-orange-500/30"
                          : "bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          showPixelCount
                            ? "bg-orange-500"
                            : "bg-gradient-to-br from-orange-500 to-red-500"
                        }`}
                      >
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Compteur Pixels</div>
                        <div className="text-sm opacity-75">
                          Statistiques globales
                        </div>
                      </div>
                    </button>

                    {session?.user?.role === "ADMIN" &&
                      session?.user?.twoFA && (
                        <button
                          onClick={() => {
                            setShowAdminPanel((s) => !s);
                            setShowMobileSidebar(false);
                          }}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                            showAdminPanel
                              ? "bg-red-500/20 text-red-600 dark:text-red-400 border-2 border-red-500/30"
                              : "bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              showAdminPanel
                                ? "bg-red-500"
                                : "bg-gradient-to-br from-red-500 to-pink-500"
                            }`}
                          >
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold">Panneau Admin</div>
                            <div className="text-sm opacity-75">
                              Outils administrateur
                            </div>
                          </div>
                        </button>
                      )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                    <button
                      onClick={() => setShowMobileSidebar(false)}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      <span className="font-medium">Fermer le menu</span>
                    </button>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Main Content Container */}
          <div className="flex-1 flex">
            {/* Left Panel - Overlay Controls */}
            <AnimatePresence>
              {showOverlayControls && (
                <m.aside
                  initial={{
                    x: screenSize.isMobile ? "-100%" : "-100%",
                    opacity: 0,
                  }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{
                    x: screenSize.isMobile ? "-100%" : "-100%",
                    opacity: 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`
                    ${
                      screenSize.isMobile
                        ? "fixed left-0 top-0 h-full z-50 pt-20"
                        : "relative"
                    } 
                    ${getPanelWidth()} 
                    bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
                    ${
                      screenSize.isMobile
                        ? "border-r"
                        : "border-r mr-2 lg:mr-4 rounded-2xl shadow-xl"
                    } 
                    border-gray-200/50 dark:border-gray-700/50 
                    overflow-y-auto
                  `}
                >
                  <div className="p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg lg:rounded-xl flex items-center justify-center">
                          <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white">
                            Contrôles Overlay
                          </h3>
                          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                            Gestion des images
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowOverlayControls(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500 dark:text-gray-400" />
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

            {/* Central Canvas Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6">
              <div
                ref={canvasContainerRef}
                className="relative flex items-center justify-center w-full"
                style={{
                  ...getCanvasSize(),
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
                  canvasZoom={
                    canvasApiRef.current?.getZoom?.() ?? canvasNavState.zoom
                  }
                  canvasPan={
                    canvasApiRef.current
                      ? { x: canvasNavState.pan.x, y: canvasNavState.pan.y }
                      : canvasNavState.pan
                  }
                  pixelSize={1}
                />
              </div>

              {/* Mobile Bottom Panels */}
              {screenSize.isMobile &&
                (showNavInfo || showPixelCount || showAdminPanel) && (
                  <AnimatePresence>
                    <m.div
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 z-50 max-h-[50vh] overflow-y-auto"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                              Stats & Contrôles
                            </h2>
                          </div>
                          <button
                            onClick={closeAllOverlays}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>

                        <AnimatePresence mode="wait">
                          {showNavInfo && (
                            <NavigationOverlay
                              isMobile={canvasNavState.isMobile}
                              isNavigationMode={canvasNavState.isNavigationMode}
                              showAdminPanel={canvasNavState.showAdminPanel}
                              isAdminSelecting={canvasNavState.isAdminSelecting}
                              isVisible={() => setShowNavInfo(!showNavInfo)}
                              onResetGrid={handleResetGrid}
                            />
                          )}

                          {showPixelCount && <PixelCount />}

                          {showAdminPanel && (
                            <AdminPanel
                              visible={showAdminPanel}
                              adminColor={adminColor}
                              adminSelectedSize={adminSelectedSize}
                              isAdminSelecting={isAdminSelecting}
                              onClose={() => setShowAdminPanel(false)}
                              onChangeColor={(c) => setAdminColor(c)}
                              onChangeSelectedSize={(s) =>
                                setAdminSelectedSize(s)
                              }
                              onToggleSelecting={(b) => setIsAdminSelecting(b)}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </m.div>
                  </AnimatePresence>
                )}
            </div>

            {/* Right Panel - Desktop Only */}
            {!screenSize.isMobile && (
              <AnimatePresence>
                {(showNavInfo || showPixelCount || showAdminPanel) && (
                  <m.aside
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`
                      ${getPanelWidth()} 
                      bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
                      border-l border-gray-200/50 dark:border-gray-700/50 
                      overflow-y-auto shadow-xl rounded-2xl ml-2 lg:ml-4
                    `}
                  >
                    <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                              Stats & Contrôles
                            </h2>
                            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                              Performances en temps réel
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={closeAllOverlays}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
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
                              onChangeSelectedSize={(s) =>
                                setAdminSelectedSize(s)
                              }
                              onToggleSelecting={(b) => setIsAdminSelecting(b)}
                            />
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </m.aside>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Pixel Informations Modal - Responsive */}
        <AnimatePresence>
          {showPixelInfos && (
            <m.div
              initial={{ opacity: 0, y: screenSize.isMobile ? "100%" : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: screenSize.isMobile ? "100%" : -20 }}
              transition={{ duration: 0.3 }}
              className={`
                ${
                  screenSize.isMobile
                    ? "fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[80vh] z-50"
                    : "mx-4 lg:mx-32 my-4 lg:my-8 rounded-2xl"
                } 
                p-4 lg:p-6 
                bg-white/90 dark:bg-gray-800/90 
                backdrop-blur-xl shadow-xl 
                border border-gray-200/50 dark:border-gray-700/50 
                overflow-y-auto
              `}
            >
              {screenSize.isMobile && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informations Pixel
                  </h3>
                  <button
                    onClick={() => setShowPixelInfos(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              )}
              <PixelInformations />
            </m.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
