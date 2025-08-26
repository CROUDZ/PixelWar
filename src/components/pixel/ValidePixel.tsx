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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        {/* Modal */}
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Placer un Pixel</h3>
            <button
              onClick={onCancel}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cooldown warning */}
          {remainingTime > 0 && (
            <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900 rounded-lg text-sm text-orange-700 dark:text-orange-300">
              Cooldown actif : {formatTime(remainingTime)}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Position X
                </label>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value))}
                  disabled={!isEventAccessible()}
                  className="w-full border-gray-500 px-3 py-2 border rounded-lg text-center font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Position Y
                </label>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value))}
                  disabled={!isEventAccessible()}
                  className="w-full px-3 py-2 border-gray-500  border focus:outline-none rounded-lg text-center font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <PixelSelector
                onSelect={(newColor) => setColor(newColor)}
                initial={color}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg border"
              style={{ backgroundColor: color }}
            ></div>
            <div>
              <p className="text-sm">
                Position: ({x}, {y})
              </p>
              <p className="text-sm">Couleur: {color.toUpperCase()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={status === "loading"}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Valider
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
export default ValidePixel;
