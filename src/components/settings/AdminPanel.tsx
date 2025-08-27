// components/ui/AdminPanel.tsx
"use client";
import React from "react";
import {
  Shield,
  Palette,
  Grid3x3,
  MousePointer,
  Square,
  Target,
} from "lucide-react";
import PixelSelector from "../settings/PixelSelector";

type Point = { x: number; y: number } | null;

export type AdminPanelProps = {
  // état contrôlé
  visible?: boolean;
  adminColor: string;
  adminSelectedSize: number;
  isAdminSelecting: boolean;
  adminSelectionStart?: Point;

  // callbacks
  onClose?: () => void;
  onChangeColor: (color: string) => void;
  onChangeSelectedSize: (size: number) => void;
  onToggleSelecting: (next: boolean) => void;

  className?: string;
};

export default function AdminPanel({
  visible = true,
  adminColor,
  adminSelectedSize,
  isAdminSelecting,
  adminSelectionStart = null,
  onChangeColor,
  onChangeSelectedSize,
  onToggleSelecting,
  className = "",
}: AdminPanelProps) {
  if (!visible) return null;

  const presetSizes = [1, 3, 5, 10, 15, 20, 25, 50];

  // Avoid unnecessary calls to onChangeColor
  const handleColorChange = (color: string) => {
    if (color !== adminColor) {
      onChangeColor(color);
    }
  };

  // Avoid unnecessary calls to onChangeSelectedSize
  const handleSizeChange = (size: number) => {
    if (size !== adminSelectedSize) {
      onChangeSelectedSize(size);
    }
  };

  return (
    <div className={`space-y-4 max-w-sm mx-auto ${className}`}>
      {/* Header avec warning admin */}
      <div className="bg-glass-primary backdrop-blur-lg rounded-xl p-3 border border-glass-200 shadow-glass-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <Shield size={14} className="dark:text-gray-800 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">
              Mode Administrateur
            </h4>
            <p className="text-xs text-text-secondary">
              Outils avancés de modification
            </p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-2">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center mt-0.5 shadow-sm">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-red-700 dark:text-red-300">
                Attention
              </h5>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Vous êtes en mode administrateur. Vos actions peuvent affecter
                massivement le canvas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sélection de couleur */}
      <div className="bg-glass-primary backdrop-blur-lg rounded-xl p-3 border border-glass-200 shadow-glass-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <Palette size={14} className="dark:text-gray-800 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">
              Couleur Admin
            </h4>
            <p className="text-xs text-text-secondary">
              Sélectionnez la couleur de remplissage
            </p>
          </div>
        </div>

        {/* Aperçu de la couleur sélectionnée */}
        <div className="flex items-center gap-2 mb-2 p-2 bg-surface-secondary rounded-lg border border-border-secondary">
          <div
            className="w-8 h-8 rounded-lg border-2 border-border-primary shadow-inner"
            style={{ backgroundColor: adminColor }}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-text-primary">
              Couleur actuelle
            </div>
            <div className="text-xs font-mono text-text-muted">
              {adminColor.toUpperCase()}
            </div>
          </div>
          <input
            type="text"
            value={adminColor}
            onChange={(e) => onChangeColor(e.target.value)}
            className="w-16 px-1.5 py-1 text-xs font-mono bg-surface-primary border border-border-primary rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all duration-fast"
            placeholder="#FF0000"
          />
        </div>

        {/* Sélecteur de couleur */}
        <div className="bg-surface-tertiary rounded-lg p-2 border border-border-secondary">
          <PixelSelector onSelect={handleColorChange} initial={adminColor} />
        </div>
      </div>

      {/* Taille de bloc */}
      <div className="bg-glass-primary backdrop-blur-lg rounded-xl p-3 border border-glass-200 shadow-glass-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <Grid3x3 size={14} className="dark:text-gray-800 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">
              Taille de Bloc
            </h4>
            <p className="text-xs text-text-secondary">
              Définissez la zone d'impact
            </p>
          </div>
        </div>

        {/* Taille actuelle */}
        <div className="flex items-center justify-between mb-2 p-2 bg-surface-secondary rounded-lg border border-border-secondary">
          <div>
            <div className="text-xs font-semibold text-text-primary">
              Taille actuelle
            </div>
            <div className="text-xs text-accent">
              {adminSelectedSize}×{adminSelectedSize} pixels
            </div>
          </div>
          <div className="text-xl font-bold text-accent">
            {adminSelectedSize}
          </div>
        </div>

        {/* Presets rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
          {presetSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`px-1.5 py-1.5 text-xs font-semibold rounded transition-all duration-fast flex items-center justify-center min-w-0 ${
                adminSelectedSize === size
                  ? "bg-accent dark:text-gray-800 text-white shadow-sm hover:bg-accent-hover active:bg-accent-active"
                  : "bg-surface-secondary border border-border-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:border-accent"
              }`}
            >
              <span className="truncate">
                {size}×{size}
              </span>
            </button>
          ))}
        </div>

        {/* Input personnalisé */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Taille personnalisée
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={adminSelectedSize}
            onChange={(e) =>
              onChangeSelectedSize(
                Math.max(1, Math.min(500, parseInt(e.target.value || "1", 10))),
              )
            }
            className="w-full px-2 py-1.5 bg-surface-primary border border-border-primary rounded text-center font-mono text-base font-bold text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all duration-fast"
          />
          <div className="text-xs text-text-muted mt-1 text-center">
            Entre 1 et 500 pixels
          </div>
        </div>
      </div>

      {/* Mode de sélection */}
      <div className="bg-glass-primary backdrop-blur-lg rounded-xl p-3 border border-glass-200 shadow-glass-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <Target size={14} className="dark:text-gray-800 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">
              Mode de Sélection
            </h4>
            <p className="text-xs text-text-secondary">
              Choisissez votre méthode de placement
            </p>
          </div>
        </div>

        {/* Status du mode */}
        <div
          className={`p-2 rounded border mb-2 ${
            isAdminSelecting
              ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                isAdminSelecting
                  ? "bg-orange-500 animate-pulse-soft"
                  : "bg-green-500"
              }`}
            ></div>
            <span className="text-xs font-semibold text-text-primary">
              {isAdminSelecting
                ? "Sélection manuelle active"
                : "Mode bloc fixe"}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            {isAdminSelecting
              ? adminSelectionStart
                ? "Cliquez pour définir le coin opposé de la sélection"
                : "Cliquez pour définir le premier coin de la sélection"
              : `Cliquez sur le canvas pour placer un bloc de ${adminSelectedSize}×${adminSelectedSize}`}
          </p>
        </div>

        {/* Bouton de basculement */}
        <button
          onClick={() => onToggleSelecting(!isAdminSelecting)}
          className={`w-full px-3 py-2 rounded-lg font-semibold transition-all duration-fast flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${
            isAdminSelecting
              ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white"
              : "bg-green-500 hover:bg-green-600 active:bg-green-700 text-white"
          } hover:scale-105 active:scale-95`}
        >
          {isAdminSelecting ? (
            <>
              <Square size={16} />
              <span className="text-sm">Mode Sélection Activé</span>
            </>
          ) : (
            <>
              <MousePointer size={16} />
              <span className="text-sm">Activer la Sélection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
