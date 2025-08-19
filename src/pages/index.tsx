"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import type { PixelCanvasHandle } from "@/components/pixel/PixelCanvas"; // ajuste si nécessaire

const Header = dynamic(() => import("@/components/Header"), { ssr: false });

const PixelCanvas = dynamic(() => import("@/components/pixel/PixelCanvas"), {
  ssr: false,
});
const OverlayImage = dynamic(() => import("@/components/pixel/OverlayImage"), {
  ssr: false,
});

const PixelInformations = dynamic(
  () => import("@/components/infos/PixelInfo"),
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

// j'ai placé AdminPanel sous components/ui (ajuste si tu l'as ailleurs)
const AdminPanel = dynamic(() => import("@/components/settings/AdminPanel"), {
  ssr: false,
});

const PixelCount = dynamic(() => import("@/components/infos/PixelCount"), {
  ssr: false,
});

const Banned = dynamic(() => import("@/components/banned"), {
  ssr: false,
});

const LeftSidebar = dynamic(() => import("@/components/LeftSidebar"), {
  ssr: false,
});

const Footer = dynamic(() => import("@/components/Footer"), {
  ssr: false,
});

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
}

const HomePage: React.FC = () => {
  const { data: session } = useSession();
  const [showOverlayControls, setShowOverlayControls] =
    useState<boolean>(false);
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
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [showPixelCount, setShowPixelCount] = useState<boolean>(false); // Fermé par défaut

  const canvasApiRef = useRef<PixelCanvasHandle | null>(null);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSelectedSize, setAdminSelectedSize] = useState(5);
  const [adminColor, setAdminColor] = useState("#FF0000");
  const [isAdminSelecting, setIsAdminSelecting] = useState(false);

  if (session?.user?.banned) {
    return <Banned reason="Violation des règles" duration="Indéfinie" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
      <Header />

      {/* Arrière-plan décoratif moderne */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Subtle animated gradient orbs */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-400/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-500/5 dark:bg-green-400/3 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <main className="relative z-10 flex flex-col min-h-screen">
        {/* Overlay pour mobile quand sidebar ouverte */}
        {(showOverlayControls ||
          showPixelInfos ||
          showNavInfo ||
          showPixelCount ||
          showAdminPanel) && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => {
              setShowOverlayControls(false);
              setShowPixelInfos(false);
              setShowNavInfo(false);
              setShowPixelCount(false);
              setShowAdminPanel(false);
            }}
          />
        )}

        {/* Barre de menu à gauche - Design moderne avec responsivité */}
        <div className="flex flex-col items-start justify-center md:flex-row">
          <div className="fixed left-0 translate-y-1/2 w-16 md:w-20  z-50 shadow-2xl">
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
            />
          </div>

          {/* Container principal avec sidebar dynamiques et responsivité */}
          <div className="flex flex-1 pl-16 md:pl-20 transition-all duration-300 ease-in-out">
            {/* Sidebar Gauche - Settings avec design moderne et responsivité */}
            {showOverlayControls && (
              <aside
                className="fixed top-16 left-16 md:left-20 bottom-0 w-80 md:w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
              border-r border-gray-200/60 dark:border-gray-700/60 overflow-y-auto shadow-2xl transition-all duration-500
              ease-out transform animate-slide-in-left z-40 custom-scrollbar mt-8 mb-24 ml-8 rounded-lg"
              >
                <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-10 p-4 md:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Outils & Paramètres
                      </h2>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Personnalisez votre expérience
                      </p>
                    </div>
                    {/* Bouton fermer sur mobile */}
                    <button
                      onClick={() => {
                        setShowOverlayControls(false);
                      }}
                      className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus-ring"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                  {showOverlayControls && (
                    <div className="group">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Contrôles Overlay
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gérez vos superpositions d'images
                          </p>
                        </div>
                        <button
                          onClick={() => setShowOverlayControls(false)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
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
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Zone centrale - Canvas moderne et immersif */}
            <section className="flex-1 flex items-center justify-center relative">
              {/* Container du canvas avec effet glassmorphism */}
              <div
                className="relative w-full h-full flex items-center justify-center p-8"
                ref={canvasContainerRef}
              >
                {/* Wrapper du canvas avec ombre et glassmorphism */}
                <div className="relative group animate-canvas-appear">
                  {/* Glow effect around canvas */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-glow"></div>

                  {/* Canvas container */}
                  <div className="relative bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border border-white/60 dark:border-gray-700/60 shadow-2xl smooth-hover">
                    <PixelCanvas
                      ref={canvasApiRef}
                      pixelWidth={100}
                      pixelHeight={100}
                      onStateChange={setCanvasNavState}
                      showAdminPanelProp={showAdminPanel}
                      adminSelectedSizeProp={adminSelectedSize}
                      adminColorProp={adminColor}
                      isAdminSelectingProp={isAdminSelecting}
                    />
                  </div>
                </div>

                <OverlayImage
                  targetRef={canvasContainerRef as React.RefObject<HTMLElement>}
                  src={src}
                  show={show}
                  opacity={opacity}
                  transform={transform}
                  zIndex={20}
                />
              </div>
            </section>
          </div>

          {/* Sidebar Droite - Stats/Informations avec design moderne et responsivité */}
          {(showPixelInfos ||
            showNavInfo ||
            showPixelCount ||
            showAdminPanel) && (
            <aside
              className="fixed top-16 right-0 bottom-0 w-80 md:w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
              border-l border-gray-200/60 dark:border-gray-700/60 overflow-y-auto overflow-x-hidden shadow-2xl transition-all duration-500
              ease-out transform animate-slide-in-right z-40 custom-scrollbar mt-8 mb-24 mr-8 rounded-lg"
            >
              <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-10 p-4 md:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                      Stats & Contrôles
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Performances en temps réel
                    </p>
                  </div>
                  {/* Bouton fermer sur mobile */}
                  <button
                    onClick={() => {
                      setShowPixelInfos(false);
                      setShowNavInfo(false);
                      setShowPixelCount(false);
                      setShowAdminPanel(false);
                    }}
                    className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                {showPixelInfos && (
                  <div className="group">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Informations Pixel
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Détails sur le pixel sélectionné
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/60 dark:border-green-700/60 shadow-lg">
                      <PixelInformations />
                    </div>
                  </div>
                )}

                {showNavInfo && (
                  <div className="group">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Navigation
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Contrôles de navigation et zoom
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/60 dark:border-blue-700/60 shadow-lg">
                      <NavigationOverlay
                        isMobile={canvasNavState.isMobile}
                        isNavigationMode={canvasNavState.isNavigationMode}
                        showAdminPanel={canvasNavState.showAdminPanel}
                        isAdminSelecting={canvasNavState.isAdminSelecting}
                        adminSelectionStart={canvasNavState.adminSelectionStart}
                        isVisible={() => setShowNavInfo(!showNavInfo)}
                      />
                    </div>
                  </div>
                )}

                {showPixelCount && (
                  <div className="group">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Statistiques
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Compteurs et métriques en temps réel
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/60 dark:border-purple-700/60 shadow-lg">
                      <PixelCount />
                    </div>
                  </div>
                )}

                {showAdminPanel && (
                  <div className="group">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          Panneau Admin
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Outils d'administration avancés
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-700/60 shadow-lg">
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
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
