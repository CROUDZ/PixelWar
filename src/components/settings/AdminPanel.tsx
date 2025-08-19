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
    <div className={`space-y-6 ${className}`}>
      {/* Header avec warning admin */}
      <div
        className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 
                      rounded-xl p-4 border border-red-200/50 dark:border-red-700/50"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Mode Administrateur
            </h4>
            <p className="text-xs text-red-600 dark:text-red-400">
              Outils avancés de modification
            </p>
          </div>
        </div>

        <div className="bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h5 className="text-sm font-medium text-red-800 dark:text-red-300">
                Attention
              </h5>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Vous êtes en mode administrateur. Vos actions peuvent affecter
                massivement le canvas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sélection de couleur */}
      <div
        className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 
                      rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Palette size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Couleur Admin
            </h4>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Sélectionnez la couleur de remplissage
            </p>
          </div>
        </div>

        {/* Aperçu de la couleur sélectionnée */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200/50 dark:border-purple-700/50">
          <div
            className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-inner"
            style={{ backgroundColor: adminColor }}
          ></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Couleur actuelle
            </div>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {adminColor.toUpperCase()}
            </div>
          </div>
          <input
            type="text"
            value={adminColor}
            onChange={(e) => onChangeColor(e.target.value)}
            className="w-20 px-2 py-1 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="#FF0000"
          />
        </div>

        {/* Sélecteur de couleur */}
        <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3 border border-purple-200/30 dark:border-purple-700/30">
          <PixelSelector onSelect={handleColorChange} initial={adminColor} />
        </div>
      </div>

      {/* Taille de bloc */}
      <div
        className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 
                      rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Grid3x3 size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Taille de Bloc
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Définissez la zone d'impact
            </p>
          </div>
        </div>

        {/* Taille actuelle */}
        <div className="flex items-center justify-between mb-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Taille actuelle
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {adminSelectedSize}×{adminSelectedSize} pixels
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {adminSelectedSize}
          </div>
        </div>

        {/* Presets rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {presetSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`px-2 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center min-w-0 ${
                adminSelectedSize === size
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "bg-white/60 dark:bg-gray-800/60 border border-blue-200/50 dark:border-blue-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/40"
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
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
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
            className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-blue-200 dark:border-blue-700 
                       rounded-lg text-center font-mono text-lg font-bold text-blue-700 dark:text-blue-300
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Entre 1 et 500 pixels
          </div>
        </div>
      </div>

      {/* Mode de sélection */}
      <div
        className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 
                      rounded-xl p-4 border border-green-200/50 dark:border-green-700/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Target size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Mode de Sélection
            </h4>
            <p className="text-xs text-green-600 dark:text-green-400">
              Choisissez votre méthode de placement
            </p>
          </div>
        </div>

        {/* Status du mode */}
        <div
          className={`p-3 rounded-lg border mb-4 ${
            isAdminSelecting
              ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50"
              : "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700/50"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isAdminSelecting
                  ? "bg-orange-500 animate-pulse"
                  : "bg-green-500"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {isAdminSelecting
                ? "Sélection manuelle active"
                : "Mode bloc fixe"}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
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
          className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            isAdminSelecting
              ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
          }`}
        >
          {isAdminSelecting ? (
            <>
              <Square size={18} />
              <span>Mode Sélection Activé</span>
            </>
          ) : (
            <>
              <MousePointer size={18} />
              <span>Activer la Sélection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
