import React from "react";

interface LoadingProps {
  message?: string;
  variant?: "page" | "inline" | "overlay";
  size?: "sm" | "md" | "lg";
}

const Loading: React.FC<LoadingProps> = ({
  message = "Chargement...",
  variant = "page",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const LoadingSpinner = () => (
    <div className="relative">
      {/* Anneau externe */}
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 rounded-full`}
      ></div>
      {/* Anneau rotatif */}
      <div
        className={`${sizeClasses[size]} border-4 border-transparent border-t-cyan-500 rounded-full animate-spin absolute top-0 left-0`}
      ></div>
      {/* Points lumineux */}
      <div
        className={`${sizeClasses[size]} absolute top-0 left-0 flex items-center justify-center`}
      >
        <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  const LoadingDots = () => (
    <div className="flex space-x-1">
      <div
        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="relative">
          <div
            className={`${sizeClasses.sm} border-2 border-gray-200 dark:border-gray-700 rounded-full`}
          ></div>
          <div
            className={`${sizeClasses.sm} border-2 border-transparent border-t-cyan-500 rounded-full animate-spin absolute top-0 left-0`}
          ></div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </span>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm mx-4">
          <LoadingSpinner />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {message}
            </p>
            <LoadingDots />
          </div>
        </div>
      </div>
    );
  }

  // variant === "page" (par défaut)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-6">
      {/* Arrière-plan décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Logo ou icône */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-glow">
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
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">PixelWar</h1>
        </div>

        {/* Spinner principal */}
        <div className="mb-6 flex justify-center">
          <LoadingSpinner />
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {message}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Préparation de votre expérience pixel...
          </p>
        </div>

        {/* Dots animés */}
        <LoadingDots />

        {/* Barre de progression stylisée */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
              style={{
                width: "100%",
                animation: "loading-bar 2s ease-in-out infinite",
              }}
            ></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
