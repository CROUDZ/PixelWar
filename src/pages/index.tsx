import React from "react";
import PixelCanvasWithOverlay from "../components/pixel/PixelCanvasWithOverlay";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const Header = dynamic(() => import("../components/Header"), {
  ssr: false,
});
const PixelInformations = dynamic(
  () => import("../components/pixel/PixelInfo"),
  {
    ssr: false,
  },
);
const PixelSelector = dynamic(
  () => import("@/components/pixel/PixelSelector"),
  {
    ssr: false,
  },
);

const Banned = dynamic(() => import("@/components/banned"), {
  ssr: false,
});

const HomePage: React.FC = () => {
  const [selectedColor, setSelectedColor] = React.useState<string>("#000000");
  const { data: session } = useSession();

  if (session?.user?.banned) {
    return <Banned reason="Violation des règles" duration="Indéfinie" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <Header />

      {/* Arrière-plan décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </div>

      <main className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="grid-responsive max-w-7xl mx-auto">
          {/* Sidebar Gauche - Sélecteur de couleurs */}
          <aside className="sidebar-panel order-2 md:order-1">
            <div className="glass-panel rounded-2xl p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                    Palette
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choisissez votre couleur
                  </p>
                </div>
              </div>

              <PixelSelector onSelect={setSelectedColor} />

              {/* Couleur sélectionnée */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
                    style={{ backgroundColor: selectedColor }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Couleur active
                    </p>
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {selectedColor}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Zone centrale - Canvas */}
          <section className="canvas-container order-1 md:order-2">
            <div className="w-full h-full flex flex-col items-center justify-center">
              {/* Titre de la zone de dessin */}
              <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient mb-3">
                  PixelWar Canvas
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Créez votre art pixel par pixel dans cette toile collaborative
                  en temps réel
                </p>
              </div>

              {/* Canvas wrapper avec design amélioré */}
              <div className="canvas-wrapper w-full max-w-2xl">
                <div className="relative p-4">
                  {/* Indicateur de connexion */}
                  <div className="absolute top-2 right-2 z-20">
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-full text-xs font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Connecté
                    </div>
                  </div>

                  <PixelCanvasWithOverlay
                    pixelWidth={100}
                    pixelHeight={100}
                    selectedColor={selectedColor}
                  />
                </div>
              </div>

              {/* Stats rapides */}
              <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-md">
                <div className="text-center p-3 glass-panel rounded-xl">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    100x100
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Pixels
                  </div>
                </div>
                <div className="text-center p-3 glass-panel rounded-xl">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ∞
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Joueurs
                  </div>
                </div>
                <div className="text-center p-3 glass-panel rounded-xl">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    24/7
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    En ligne
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar Droite - Informations */}
          <aside className="sidebar-panel order-3">
            <div className="glass-panel rounded-2xl p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                    Infos
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Activité en temps réel
                  </p>
                </div>
              </div>

              <PixelInformations />

              {/* Conseils d'utilisation */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Conseils
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Cliquez pour placer un pixel</li>
                  <li>• Molette pour zoomer</li>
                  <li>• Glisser pour naviguer</li>
                  <li>• Double-clic pour centrer</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="relative z-10 mt-16 py-8 text-center text-gray-600 dark:text-gray-400">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent mb-6"></div>
          <p className="text-sm">
            Créé avec ❤️ pour la communauté •
            <span className="ml-2 text-gradient font-semibold">
              PixelWar 2025
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
