import React, { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import PixelSelector from "../settings/PixelSelector";
import { useSession } from "next-auth/react";
import { useEventMode } from "@/context/EventMode";
import { openInPopup } from "@/lib/utils";

const ENV = process.env.NODE_ENV || "development";
const DOMAIN =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

interface ValidePixelProps {
  initialX: number;
  initialY: number;
  initialColor: string;
  onValidate: (x: number, y: number, color: string) => void;
  onCancel: () => void;
}

// Cooldown par défaut
const DEFAULT_COOLDOWN_SECONDS = 60;
const BOOSTED_COOLDOWN_SECONDS = 45;

const ValidePixel: React.FC<ValidePixelProps> = ({
  initialX,
  initialY,
  initialColor,
  onValidate,
  onCancel,
}) => {
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [color, setColor] = useState(initialColor);
  const [remainingTime, setRemainingTime] = useState(0);

  console.log(
    "[ValidePixel] (FR) Couleur initiale :",
    initialColor,
    "Couleur actuelle :",
    color,
  );

  const { data: session, status } = useSession();
  const { isActive, startTime, endTime } = useEventMode();

  // Vérifie si l'événement est actif et dans la plage horaire
  const isEventAccessible = () => {
    if (session?.user?.role === "ADMIN") return true; // Les admins contournent les restrictions
    if (!isActive) return false; // L'événement n'est pas actif
    const now = new Date();
    return startTime && endTime && now >= startTime && now <= endTime; // Vérifie la plage horaire
  };

  // Calcul du cooldown restant
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      setRemainingTime(0); // Désactive le cooldown pour les admins
      return;
    }

    if (!session?.user?.lastPixelPlaced) {
      setRemainingTime(0);
      return;
    }

    // Détermine le cooldown selon le boost
    const cooldownSeconds = session?.user?.boosted
      ? BOOSTED_COOLDOWN_SECONDS
      : DEFAULT_COOLDOWN_SECONDS;
    const lastPlaced = new Date(session.user.lastPixelPlaced).getTime();
    const now = Date.now();
    const diff = Math.max(0, cooldownSeconds * 1000 - (now - lastPlaced));

    setRemainingTime(Math.ceil(diff / 1000));

    // Mettre à jour le cooldown toutes les secondes
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleValidate = () => {
    console.log(
      "[ValidePixel] (FR) Validation du pixel avec la couleur :",
      color,
    );
    if (!session) {
      openInPopup(`${DOMAIN}/auth/discord-redirect`);
      return;
    }
    if (!session.user.linked) {
      console.warn("[ValidePixel] User not linked, redirecting to link page.");
      openInPopup(`${DOMAIN}/link`);
      return;
    }

    if (!isEventAccessible()) return; // Bloquer si l'événement n'est pas accessible
    if (session?.user?.role !== "ADMIN" && remainingTime > 0) return; // Bloquer si le cooldown est actif et que l'utilisateur n'est pas admin

    onValidate(x, y, color);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {/* Modal */}
        <m.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative max-w-lg w-full mx-4"
        >
          {/* Glass morphism background */}
          <div className="absolute inset-0 bg-glass-primary backdrop-blur-lg rounded-2xl border border-glass-200 shadow-glass-lg"></div>

          {/* Content */}
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  Placer un Pixel
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Choisissez votre position et couleur
                </p>
              </div>
              <button
                onClick={onCancel}
                className="p-2 rounded-xl bg-surface-hover hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors duration-fast"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cooldown warning */}
            {remainingTime > 0 && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse-soft"></div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Cooldown actif : {formatTime(remainingTime)}
                  </p>
                </div>
              </m.div>
            )}

            {/* Inputs */}
            <div className="space-y-5">
              {/* Position inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text-primary">
                    Position X
                  </label>
                  <input
                    type="number"
                    value={x}
                    onChange={(e) => setX(Number(e.target.value))}
                    disabled={!isEventAccessible()}
                    className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast font-mono text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text-primary">
                    Position Y
                  </label>
                  <input
                    type="number"
                    value={y}
                    onChange={(e) => setY(Number(e.target.value))}
                    disabled={!isEventAccessible()}
                    className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast font-mono text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Color selector */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-primary">
                  Couleur
                </label>
                <div className="bg-surface-primary border border-border-primary rounded-xl p-3">
                  <PixelSelector
                    onSelect={(newColor) => setColor(newColor)}
                    initial={color}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-6 p-4 bg-surface-secondary rounded-xl border border-border-secondary"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-border-primary shadow-md"
                  style={{ backgroundColor: color }}
                ></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    Position:{" "}
                    <span className="font-mono text-accent">
                      ({x}, {y})
                    </span>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Couleur:{" "}
                    <span className="font-mono">{color.toUpperCase()}</span>
                  </p>
                </div>
              </div>
            </m.div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-surface-secondary hover:bg-surface-tertiary text-text-secondary hover:text-text-primary rounded-xl font-medium transition-all duration-fast border border-border-primary hover:border-border-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={status === "loading" || !isEventAccessible()}
                className="flex-1 px-6 py-3 bg-accent hover:bg-accent-hover active:bg-accent-active text-white dark:text-gray-800 rounded-xl 
                font-semibold transition-all duration-fast shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed 
                active:scale-95"
              >
                {status === "loading" ? "Chargement..." : "Valider"}
              </button>
            </div>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
export default ValidePixel;
