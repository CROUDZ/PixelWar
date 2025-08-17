import React, { useState, useEffect } from "react";
import PixelSelector from "./PixelSelector";
import { useSession } from "next-auth/react";
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

  // Calcul du cooldown restant
  useEffect(() => {
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
    }

    if (remainingTime > 0) return; // on bloque si cooldown actif

    onValidate(x, y, color);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-md w-72">
      <h3 className="text-lg font-semibold mb-4">Validate Pixel</h3>
      <div className="mb-3">
        <label className="block text-sm font-medium">
          X Coordinate:
          <input
            type="number"
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="ml-2 border border-gray-300 rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">
          Y Coordinate:
          <input
            type="number"
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="ml-2 border border-gray-300 rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">
          Color:
          <PixelSelector onSelect={setColor} valide={true} />
        </label>
      </div>
      {session?.user?.linked && remainingTime > 0 && (
        <p className="text-sm text-red-500 mb-2">
          Vous devez attendre {remainingTime} seconde
          {remainingTime > 1 ? "s" : ""} avant de placer un pixel.
        </p>
      )}
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleValidate}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          disabled={status === "loading" || (session?.user?.linked && remainingTime > 0)}
        >
          Valider
        </button>
        <button
          onClick={onCancel}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ValidePixel;
