import React, { useEffect, useState } from "react";
import { m } from "framer-motion";
import { CheckCircle, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex items-center justify-center p-6">
      {/* Arrière-plan décoratif avec des formes géométriques */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-3xl"
        />
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-3xl"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-12 max-w-md mx-auto shadow-2xl">
          {/* Icône de succès avec animation */}
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </m.div>

          {/* Titre avec animation */}
          <m.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Connexion réussie !
          </m.h1>

          {/* Message avec animation */}
          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-lg"
          >
            Votre compte a été lié avec succès.
            <br />
            <span className="font-medium text-gray-900 dark:text-white">Bienvenue dans PixelWar !</span>
          </m.p>

          {/* Countdown avec animation */}
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="mb-6"
          >
            <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <m.span
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-bold text-white relative z-10"
              >
                {countdown}
              </m.span>
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping"></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fermeture automatique dans {countdown} seconde{countdown !== 1 ? "s" : ""}
            </p>
          </m.div>

          {/* Bouton manuel avec animation */}
          <m.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              window.close();
              setTimeout(() => (window.location.href = "/"), 500);
            }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl px-8 py-3 transition-all duration-300 inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Fermer maintenant
          </m.button>
        </div>

        {/* Message d'aide */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto"
        >
          Cette fenêtre se fermera automatiquement. Vous pouvez également la fermer manuellement.
        </m.p>
      </m.div>
    </div>
  );
};

export default ClosePage;
