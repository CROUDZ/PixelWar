import React from "react";
import { m } from "framer-motion";
import { ShieldX } from "lucide-react";

const Banned: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"></div>

      <m.div
        initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 25,
          duration: 1
        }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Dark glass morphism background */}
        <div className="absolute inset-0 bg-glass-primary/80 backdrop-blur-2xl rounded-3xl border border-red-500/20 shadow-2xl"></div>

        {/* Chain decorations */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <m.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-1 bg-gradient-to-r from-transparent to-red-500/60 rounded"></div>
            <div className="w-3 h-3 bg-red-500/60 rounded-full"></div>
            <div className="w-8 h-1 bg-gradient-to-l from-transparent to-red-500/60 rounded"></div>
          </m.div>
        </div>

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Dramatic icon with warning effects */}
          <m.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: 0.3
            }}
            className="relative mb-8"
          >
            {/* Pulsing warning rings */}
            <m.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-32 h-32 mx-auto border-2 border-red-500/30 rounded-full"
            ></m.div>
            <m.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute inset-0 w-28 h-28 mx-auto border border-orange-500/30 rounded-full"
            ></m.div>

            {/* Main icon */}
            <m.div
              animate={{
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative w-24 h-24 mx-auto bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-2xl"
            >
              <ShieldX size={40} className="text-white drop-shadow-lg" />

              {/* Inner glow */}
              <div className="absolute inset-2 bg-red-400/20 rounded-xl blur-sm"></div>
            </m.div>

            {/* Dramatic glow effect */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-red-500/30 rounded-2xl blur-2xl -z-10"></div>
          </m.div>

          {/* Warning badge */}
          <m.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full mb-6"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
              Accès Interdit
            </span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </m.div>

          {/* Main title with dramatic effect */}
          <m.h1
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
            className="text-4xl font-black text-text-primary mb-4 tracking-tight"
          >
            BANNISSEMENT
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="text-text-secondary mb-8 leading-relaxed text-lg"
          >
            Votre compte a été définitivement suspendu de PixelWar.
          </m.p>

          {/* Serious warning section */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-red-400"
                >
                  <path
                    d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-base font-bold text-red-300">
                Violation des Règles
              </span>
            </div>
            <p className="text-sm text-red-200/80 leading-relaxed">
              Cette action a été prise pour protéger l'intégrité de notre communauté
              et assurer une expérience positive pour tous les utilisateurs.
            </p>
          </m.div>

          {/* Final separator */}
          <m.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent mb-8"
          />

          {/* Final message */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs text-text-muted mb-4">
              Cette décision est définitive et ne peut être contestée.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-red-400/60">
              <div className="w-8 h-px bg-red-400/60"></div>
              <span>PixelWar Administration</span>
              <div className="w-8 h-px bg-red-400/60"></div>
            </div>
          </m.div>
        </div>
      </m.div>
    </div>
  );
};

export default Banned;