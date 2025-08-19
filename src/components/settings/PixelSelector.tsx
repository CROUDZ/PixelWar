import React, { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";

const nesPalette = [
  "#000000",
  "#FFFFFF",
  "#7C7C7C",
  "#FCFC00",
  "#A80020",
  "#FC7460",
  "#503000",
  "#FFB000",
  "#007800",
  "#00E060",
  "#0000BC",
  "#0094FC",
  "#4428BC",
  "#940084",
  "#00D0D0",
  "#BCBCBC",
];

const blackCursor = [
  "#FFFFFF",
  "#7C7C7C",
  "#BCBCBC",
  "#FCFC00",
  "#FFB000",
  "#00D0D0",
  "#00E060",
  "#FC7460",
];

interface PixelSelectorProps {
  onSelect: (color: string) => void;
  valide?: boolean; // si true on montre un bouton de validation
  initial?: string | null; // couleur initiale
}

// utilitaires
const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (clean.length === 6) {
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }
  // fallback
  return { r: 0, g: 0, b: 0 };
};

const getLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b]
    .map((v) => v / 255)
    .map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
  // coefficients for luminance
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

const contrastTextColor = (hex: string) =>
  getLuminance(hex) > 0.6 ? "#111827" : "#ffffff";

export default function PixelSelector({
  onSelect,
  valide = false,
  initial = null,
}: PixelSelectorProps) {
  const [selected, setSelected] = useState<string | null>(initial);
  const [focusIndex, setFocusIndex] = useState<number>(
    selected ? nesPalette.indexOf(selected) : 0,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selected) setFocusIndex(Math.max(0, nesPalette.indexOf(selected)));
  }, [selected]);

  // Synchronize with initial prop changes - only update if it's different from current
  useEffect(() => {
    if (initial !== null && initial !== selected) {
      setSelected(initial);
    }
  }, [initial, selected]);

  const handleSelect = (color: string) => {
    // Only update and notify if the color actually changed
    if (color !== selected) {
      setSelected(color);
      if (!valide) onSelect(color); // si pas de validation explicite, on notifie tout de suite
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const cols = 4; // logique simple: 4 colonnes par défaut — responsive gère l'affichage
    let next = focusIndex;
    if (e.key === "ArrowRight") next = (focusIndex + 1) % nesPalette.length;
    if (e.key === "ArrowLeft")
      next = (focusIndex - 1 + nesPalette.length) % nesPalette.length;
    if (e.key === "ArrowDown") next = (focusIndex + cols) % nesPalette.length;
    if (e.key === "ArrowUp")
      next = (focusIndex - cols + nesPalette.length) % nesPalette.length;
    if (e.key === "Enter") {
      e.preventDefault(); // empêche le comportement par défaut
      handleSelect(nesPalette[focusIndex]); // sélectionne la couleur focalisée
    }
    if (next !== focusIndex) {
      setFocusIndex(next);
      e.preventDefault();
    }
  };

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md glass-panel  rounded-lg shadow-md p-4">
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Palette de couleurs NES"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="bg-surface p-3 rounded-lg shadow-inner grid grid-cols-4 gap-3 justify-items-center"
      >
        {nesPalette.map((color, i) => {
          const isSelected = selected === color;
          const isFocused = focusIndex === i;
          const textColor = contrastTextColor(color);

          return (
            <m.button
              key={color}
              onClick={() => handleSelect(color)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, delay: i * 0.01 }}
              aria-label={`Sélectionner ${color}`}
              aria-pressed={isSelected}
              style={{
                background: color,
                borderColor: isSelected ? textColor : "rgba(0,0,0,0.12)",
              }}
              className={`w-9 h-9 md:w-10 md:h-10 rounded shadow-sm border-2 focus:outline-none transition-transform flex items-center justify-center ${
                isFocused ? "ring-2 ring-offset-1 ring-blue-400" : ""
              }`}
              onFocus={() => setFocusIndex(i)}
            >
              <span className="sr-only">{color}</span>
              {/* petit indicateur de sélection */}
              <AnimatePresence>
                {isSelected && (
                  <m.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center justify-center"
                    style={{ color: textColor }}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${blackCursor.includes(color) ? "bg-black/90 " : "bg-gray-300"}`}
                    />
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>
          );
        })}
      </div>
      <div className="border-t border-gray-400 border-lg my-4"></div>
      <div className="mt-3 text-xs text-muted-foreground">
        Raccourcis clavier : flèches pour naviguer • Entrée pour sélectionner
      </div>
    </div>
  );
}
