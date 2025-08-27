import React from "react";
import { m } from "framer-motion";

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
        className={`${sizeClasses[size]} border-4 border-border-primary rounded-full`}
      ></div>
      {/* Anneau rotatif */}
      <div
        className={`${sizeClasses[size]} border-4 border-transparent border-t-accent rounded-full animate-spin absolute top-0 left-0`}
      ></div>
    </div>
  );

  const LoadingDots = () => (
    <div className="flex space-x-1">
      <div
        className="w-2 h-2 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-accent rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="relative">
          <div
            className={`${sizeClasses.sm} border-2 border-border-primary rounded-full`}
          ></div>
          <div
            className={`${sizeClasses.sm} border-2 border-transparent border-t-accent rounded-full animate-spin absolute top-0 left-0`}
          ></div>
        </div>
        <span className="text-sm text-text-secondary">
          {message}
        </span>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-surface-primary rounded-xl p-6 flex flex-col items-center gap-4 max-w-sm mx-4 border border-border-primary shadow-lg">
          <LoadingSpinner />
          <div className="text-center">
            <p className="text-base font-semibold text-text-primary mb-2">
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        {/* Logo ou icône */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
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
          <h1 className="text-2xl font-bold text-accent">PixelWar</h1>
        </div>

        {/* Spinner principal */}
        <div className="mb-6 flex justify-center">
          <LoadingSpinner />
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-xl font-semibold text-text-primary mb-2">
            {message}
          </p>
          <p className="text-text-secondary">
            Préparation de votre expérience pixel...
          </p>
        </div>

        {/* Dots animés */}
        <LoadingDots />

        {/* Barre de progression */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
            <m.div
              className="h-full bg-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
