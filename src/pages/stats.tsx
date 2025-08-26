import React from "react";
import dynamic from "next/dynamic";

const Header = dynamic(() => import("../components/layout/Header"), {
  ssr: false,
});

const PixelInfo = dynamic(() => import("../components/layout/PixelInfo"), {
  ssr: false,
});

const StatsPage: React.FC = () => {
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
      </div>

      <main className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* En-tête de la page */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient mb-3">
              Statistiques PixelWar
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Découvrez l'activité en temps réel, les tendances et le classement
              des artistes les plus actifs
            </p>
          </div>

          {/* Contenu principal */}
          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <PixelInfo />
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Analyse Temporelle
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visualisez l'activité par tranches de temps et identifiez les
                pics d'activité
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14-7H5m14 14H5"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Classement
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Découvrez les artistes les plus actifs et leur contribution au
                canvas
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Recherche
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Trouvez rapidement des utilisateurs spécifiques dans le
                classement
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 py-8 text-center text-gray-600 dark:text-gray-400">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent mb-6"></div>
          <p className="text-sm">
            Données mises à jour en temps réel •
            <span className="ml-2 text-gradient font-semibold">
              PixelWar Analytics
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StatsPage;
