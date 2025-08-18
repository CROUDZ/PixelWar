import React, { useEffect, useState } from "react";

const ClosePage: React.FC = () => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.close();
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-6">
      {/* Arrière-plan décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="relative z-10 text-center">
        <div className="glass-panel rounded-3xl p-12 max-w-md mx-auto">
          {/* Icône de succès */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connexion réussie !
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Votre compte a été lié avec succès.
            <br />
            Bienvenue dans PixelWar !
          </p>

          {/* Countdown */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 relative">
              <span className="text-2xl font-bold text-white">{countdown}</span>
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping"></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fermeture automatique dans {countdown} seconde
              {countdown !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Bouton manuel */}
          <button
            onClick={() => {
              window.close();
              setTimeout(() => (window.location.href = "/"), 500);
            }}
            className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Fermer maintenant
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClosePage;
