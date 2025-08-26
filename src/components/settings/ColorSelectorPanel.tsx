import React from "react";
import { X } from "lucide-react";
import PixelSelector from "./PixelSelector";

interface ColorSelectorPanelProps {
  visible: boolean;
  selectedColor: string;
  onClose: () => void;
  onColorChange: (color: string) => void;
}

const ColorSelectorPanel: React.FC<ColorSelectorPanelProps> = ({
  visible,
  selectedColor,
  onClose,
  onColorChange,
}) => {
  if (!visible) return null;

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl p-4 border shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Palette de couleur
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Couleur sélectionnée:
        </div>
        <div
          className="w-full h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: selectedColor }}
        />

        <PixelSelector onSelect={onColorChange} initial={selectedColor} />
      </div>
    </div>
  );
};

export default ColorSelectorPanel;
