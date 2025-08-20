// pages/HomePage.tsx (amélioration responsive)

"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import type { PixelCanvasHandle } from "@/components/pixel/PixelCanvas"; // ajuste si nécessaire
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import Footer from "@/components/Footer";
import NotificationContainer from "@/components/NotificationContainer";
import PixelCanvas from "@/components/pixel/PixelCanvas";

const OverlayImage = dynamic(() => import("@/components/pixel/OverlayImage"), { ssr: false });
const PixelInformations = dynamic(() => import("@/components/PixelInfo"), { ssr: false });
const OverlayControlsImage = dynamic(() => import("@/components/settings/OverlayControlsImage"), { ssr: false });
const NavigationOverlay = dynamic(() => import("@/components/infos/NavigationOverlay"), { ssr: false });
const AdminPanel = dynamic(() => import("@/components/settings/AdminPanel"), { ssr: false });
const PixelCount = dynamic(() => import("@/components/infos/PixelCount"), { ssr: false });
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
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasApiRef = useRef<PixelCanvasHandle | null>(null);

  const [src, setSrc] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.5);
  const [transform, setTransform] = useState<OverlayTransform>({ x: 0, y: 0, width: 300, height: 300, rotation: 0 });
  const [showPixelCount, setShowPixelCount] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSelectedSize, setAdminSelectedSize] = useState(5);
  const [adminColor, setAdminColor] = useState("#FF0000");
  const [isAdminSelecting, setIsAdminSelecting] = useState(false);

  useEffect(() => {
    const updateMobile = () => {
      const isMobile = window.innerWidth < 768;
      setCanvasNavState((s) => ({ ...s, isMobile }));
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (session?.user?.banned) {
    return <Banned reason="Violation des règles" duration="Indéfinie" />;
  }

  console.log("[HomePage] Rendered with session:", session);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
      <Header />

      <main className="relative z-10 flex flex-col" style={{ minHeight: 'calc(100vh - 96px)' }}>
        {/* Overlay sombre pour mobile quand un panneau est ouvert */}
        {(showOverlayControls || showPixelInfos || showNavInfo || showPixelCount || showAdminPanel) && (
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

        <div className="flex w-full">
          {/* Left sidebar: mobile -> bottom floating bar, md+ -> vertical fixed */}
          <div className="md:fixed md:left-4 md:top-1/3 z-50 pointer-events-auto">
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

          {/* Main area */}
          <div className="flex-1 flex justify-center items-center w-full px-4 md:px-12 py-6">
            {/* Side panel (left) - slide-in on md+ */}
            {showOverlayControls && (
              <aside className="hidden md:block fixed top-16 left-28 bottom-8 w-72 lg:w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 overflow-y-auto shadow-2xl transition-transform duration-300 z-40 rounded-lg">
                <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 p-4 md:p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">Outils & Paramètres</h2>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Personnalisez votre expérience</p>
                    </div>
                    <button onClick={() => setShowOverlayControls(false)} className="md:hidden p-2 rounded-lg">✕</button>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <OverlayControlsImage
                    src={src}
                    show={show}
                    opacity={opacity}
                    transform={transform}
                    onToggleShow={setShow}
                    onChangeSrc={(s) => setSrc(s)}
                    onChangeOpacity={setOpacity}
                    onChangeTransform={(patch) => setTransform((t) => ({ ...t, ...patch }))}
                    onRemove={() => { setSrc(""); setShow(false); }}
                    onClose={() => setShowOverlayControls(false)}
                  />
                </div>
              </aside>
            )}

            {/* Canvas wrapper: responsive and centered. Use aspectRatio to avoid deformation */}
            <section className="flex flex-1 items-center justify-center w-full">
              <div
                ref={canvasContainerRef}
                className="relative flex items-center justify-center"
                style={{ width: 'min(94vw, 980px)', maxWidth: '980px', aspectRatio: '1 / 1' }}
              >

                <div className="relative group w-full h-full">
                  <div className="absolute inset-0 rounded-3xl blur-xl opacity-30" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12), rgba(236,72,153,0.12))' }} />

                  <div className="relative bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-3 border shadow-2xl w-full h-full flex items-center justify-center">
                    {/* PixelCanvas should scale to the container. Laisser le composant gérer le rendu pixel-perfect mais lui fournir la taille du container si besoin. */}
                    <div className="w-full h-full flex items-center justify-center">
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
                </div>

                <OverlayImage targetRef={canvasContainerRef as React.RefObject<HTMLElement>} src={src} show={show} opacity={opacity} transform={transform} zIndex={20} />
              </div>
            </section>

            {/* Right side drawer (md+) */}
            {(showNavInfo || showPixelCount || showAdminPanel) && (
              <aside className="hidden md:block fixed top-16 right-28 bottom-8 w-72 lg:w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-l border-gray-200/60 dark:border-gray-700/60 overflow-y-auto shadow-2xl transition-transform duration-300 z-40 rounded-lg">
                <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 p-4 md:p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">Stats & Contrôles</h2>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Performances en temps réel</p>
                    </div>
                    <button onClick={() => { setShowPixelInfos(false); setShowNavInfo(false); setShowPixelCount(false); setShowAdminPanel(false); }} className="md:hidden p-2 rounded-lg">✕</button>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {showNavInfo && (
                    <div className="mb-6">
                      <NavigationOverlay
                        isMobile={canvasNavState.isMobile}
                        isNavigationMode={canvasNavState.isNavigationMode}
                        showAdminPanel={canvasNavState.showAdminPanel}
                        isAdminSelecting={canvasNavState.isAdminSelecting}
                        adminSelectionStart={canvasNavState.adminSelectionStart}
                        isVisible={() => setShowNavInfo(!showNavInfo)}
                      />
                    </div>
                  )}

                  {showPixelCount && (
                    <div className="mb-6">
                      <PixelCount />
                    </div>
                  )}

                  {showAdminPanel && (
                    <div className="mb-6">
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
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>

      {/* Pixel infos full width card (desktop -> centered, mobile -> full-width modal style) */}
      {showPixelInfos && (
        <div className="mx-4 md:mx-32 my-8 p-6 bg-background-secondary shadow-lg rounded-lg border border-gray-200/60 dark:border-gray-700/60">
          <PixelInformations />
        </div>
      )}

      <Footer />

      {/* Global notifications */}
      <NotificationContainer />
    </div>
  );
};

export default HomePage;
