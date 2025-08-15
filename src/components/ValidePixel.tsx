import React, { useState } from "react";
import PixelSelector from "./PixelSelector";
import { useSession } from "next-auth/react";
import { openInPopup } from "@/lib/utils";
import { useCooldown } from "@/hooks/useCooldown";

interface ValidePixelProps {
  initialX: number;
  initialY: number;
  initialColor: string;
  onValidate: (x: number, y: number, color: string) => void;
  onCancel: () => void;
}

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
  const { data: session, status } = useSession();
  const { cooldown, isLoading, validatePixel } = useCooldown();

  const handleValidate = async () => {
    if (!session) {
      openInPopup("http://localhost:3000/auth/discord-redirect")
      return;
    }
    if (cooldown > 0) return;

    try {
      await validatePixel(x, y, color);
      onValidate(x, y, color);
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      // Optionnel : afficher une notification d'erreur à l'utilisateur
    }
  };

  console.log("cooldown:", cooldown);
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
            <PixelSelector onSelect={setColor} valide={true}/>
        </label>
      </div>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleValidate}
          className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ${cooldown > 0 || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={cooldown > 0 || status === "loading" || isLoading}
        >
          {session ? (
            isLoading ? "Validation..." : 
            cooldown > 0 ? `Attendez ${cooldown}s` : "Valider"
          ) : "Valider"}
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
