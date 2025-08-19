import React, { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Palette,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Shield,
  Zap,
} from "lucide-react";
import PixelSelector from "../settings/PixelSelector";
import { useSession } from "next-auth/react";
import { useEventMode } from "@/context/EventMode";
import { openInPopup } from "@/lib/utils";

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
    if (!session) {
      openInPopup("http://localhost:3000/auth/discord-redirect");
      return;
    }
    if (!session.user.linked) {
      openInPopup("http://localhost:3000/link");
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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Modal */}
        <m.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl 
                     border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Placer un Pixel
                  </h3>
                  <p className="text-purple-100 text-sm">
                    Confirmez votre création
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mt-3">
              {session?.user?.role === "ADMIN" ? (
                <div className="flex items-center gap-1 text-yellow-200 bg-yellow-500/20 px-2 py-1 rounded-full text-xs">
                  <Shield size={12} />
                  <span>Mode Admin</span>
                </div>
              ) : session?.user?.boosted ? (
                <div className="flex items-center gap-1 text-blue-200 bg-blue-500/20 px-2 py-1 rounded-full text-xs">
                  <Zap size={12} />
                  <span>Compte Boosté</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-purple-200 bg-purple-500/20 px-2 py-1 rounded-full text-xs">
                  <span>Compte Standard</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alert si événement inactif */}
            {!isEventAccessible() && session?.user?.role !== "ADMIN" && (
              <m.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 
                           rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle
                  size={20}
                  className="text-red-600 dark:text-red-400 mt-0.5"
                />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    Événement Inactif
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    L'événement est actuellement fermé. Vous ne pouvez pas
                    modifier la toile pour le moment.
                  </p>
                </div>
              </m.div>
            )}

            {/* Cooldown warning */}
            {session?.user?.linked &&
              session?.user?.role !== "ADMIN" &&
              remainingTime > 0 && (
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 
                           rounded-xl p-4 flex items-start gap-3"
                >
                  <Clock
                    size={20}
                    className="text-orange-600 dark:text-orange-400 mt-0.5"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-1">
                      Cooldown Actif
                    </h4>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                      Vous devez attendre avant de placer un nouveau pixel.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                        {formatTime(remainingTime)}
                      </div>
                      <div className="flex-1 bg-orange-200 dark:bg-orange-800/50 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(0, 100 - (remainingTime / (session?.user?.boosted ? BOOSTED_COOLDOWN_SECONDS : DEFAULT_COOLDOWN_SECONDS)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

            {/* Coordonnées */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 
                              rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin
                    size={16}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Position X
                  </label>
                </div>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value))}
                  disabled={!isEventAccessible()}
                  className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-blue-200 dark:border-blue-700 
                             rounded-lg text-center font-mono text-lg font-bold text-blue-700 dark:text-blue-300
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div
                className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 
                              rounded-xl p-4 border border-green-200/50 dark:border-green-700/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin
                    size={16}
                    className="text-green-600 dark:text-green-400"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Position Y
                  </label>
                </div>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value))}
                  disabled={!isEventAccessible()}
                  className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-green-200 dark:border-green-700 
                             rounded-lg text-center font-mono text-lg font-bold text-green-700 dark:text-green-300
                             focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Sélecteur de couleur */}
            <div
              className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 
                            rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <Palette
                  size={16}
                  className="text-purple-600 dark:text-purple-400"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Couleur
                </label>
              </div>
              <PixelSelector onSelect={setColor} valide={true} />
            </div>

            {/* Aperçu du pixel */}
            <div
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-900/30 
                            rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50"
            >
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Aperçu
              </h4>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-inner"
                  style={{ backgroundColor: color }}
                ></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Position:{" "}
                    <span className="font-mono font-bold">
                      ({x}, {y})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Couleur:{" "}
                    <span className="font-mono font-bold">
                      {color.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/50 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                         rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={status === "loading"}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
            >
              <CheckCircle size={18} />
              <span>Placer le Pixel</span>
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
};

export default ValidePixel;
