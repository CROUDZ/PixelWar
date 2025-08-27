import React, { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";

const nesPalette = [
  "#000000",
  "#FFFFFE",
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
  "#FFFFFE",
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
      console.log("[PixelSelector] (FR) Couleur sélectionnée :", color);
      setSelected(color);
      onSelect(color); // Toujours notifier la sélection, indépendamment du mode valide
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
    <div className="w-full bg-glass-primary backdrop-blur-lg rounded-2xl border border-glass-200 shadow-glass-lg p-4">
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Palette de couleurs NES"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="bg-surface-secondary p-3 rounded-xl border border-border-secondary grid grid-cols-4 gap-2 justify-items-center"
      >
        {nesPalette.map((color, i) => {
          const isSelected = selected === color;
          const isFocused = focusIndex === i;
          const textColor = contrastTextColor(color);

          return (
            <m.button
              key={color}
              onClick={() => handleSelect(color)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              aria-label={`Sélectionner ${color}`}
              aria-pressed={isSelected}
              style={{
                background: color,
                borderColor: isSelected ? textColor : "rgba(0,0,0,0.15)",
              }}
              className={`w-10 h-10 rounded-lg shadow-sm border-1 focus:outline-none transition-all duration-fast flex items-center justify-center hover:shadow-md ${
                isFocused ? "ring-2 ring-offset-2 ring-accent" : ""
              }`}
              onFocus={() => setFocusIndex(i)}
            >
              <span className="sr-only">{color}</span>
              {/* petit indicateur de sélection */}
              <AnimatePresence>
                {isSelected && (
                  <m.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="flex items-center justify-center"
                    style={{ color: textColor }}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        blackCursor.includes(color)
                          ? "bg-black/90"
                          : "bg-white/90"
                      } shadow-sm`}
                    />
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>
          );
        })}
      </div>
      <div className="border-t border-border-primary my-3"></div>
      <div className="text-xs text-text-muted text-center">
        Raccourcis clavier : flèches pour naviguer • Entrée pour sélectionner
      </div>
    </div>
  );
}
