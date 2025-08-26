// components/pixel/NavigationOverlay.tsx
"use client";
import React from "react";
import {
  Navigation,
  MousePointer,
  Shield,
  Move,
  Paintbrush,
  RotateCcw,
} from "lucide-react";

type Point = { x: number; y: number } | null;

interface NavigationOverlayProps {
  isMobile?: boolean;
  isNavigationMode?: boolean;
  showAdminPanel?: boolean;
  isAdminSelecting?: boolean;
  adminSelectionStart?: Point;
  className?: string;
  isVisible?: (visible: boolean) => void; // Callback pour la visibilité
  onResetGrid?: () => void; // Callback pour le reset de la grille
}

/**
 * Composant stateless qui affiche l'indicateur de navigation ou le hint admin.
 * Peut être rendu n'importe où dans l'arbre (sidebar, header...), il est contrôlé par props.
 */
export default function NavigationOverlay({
  isMobile = false,
  isNavigationMode = false,
  showAdminPanel = false,
  isAdminSelecting = false,
  adminSelectionStart = null,
  className = "",
  onResetGrid,
}: NavigationOverlayProps) {
  // Si mobile, on peut rendre une version compacte
  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div
          className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 
                        rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Navigation size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Mode Mobile
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Interface tactile optimisée
              </p>
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Appui simple pour placer un pixel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Maintenir et glisser pour naviguer</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si panneau admin est ouvert, montrer le hint admin
  if (showAdminPanel) {
    return (
      <div className={`space-y-4 ${className}`}>
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
                Outils avancés activés
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className={`p-3 rounded-lg ${
                isAdminSelecting
                  ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50"
                  : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isAdminSelecting
                      ? "bg-orange-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {isAdminSelecting ? "Sélection en cours" : "Mode placement"}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {isAdminSelecting
                  ? adminSelectionStart
                    ? "Cliquez pour terminer la zone de sélection"
                    : "Cliquez pour commencer la sélection"
                  : "Cliquez pour placer un bloc de pixels"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Raccourcis
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Ctrl+Z pour annuler
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Navigation
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Shift+Glisser
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sinon, hint normal de navigation / dessin
  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`rounded-xl p-4 border ${
          isNavigationMode
            ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200/50 dark:border-green-700/50"
            : "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200/50 dark:border-purple-700/50"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isNavigationMode
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-purple-500 to-pink-600"
            }`}
          >
            {isNavigationMode ? (
              <Move size={16} className="text-white" />
            ) : (
              <Paintbrush size={16} className="text-white" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {isNavigationMode ? "Mode Navigation" : "Mode Dessin"}
            </h4>
            <p
              className={`text-xs ${
                isNavigationMode
                  ? "text-green-600 dark:text-green-400"
                  : "text-purple-600 dark:text-purple-400"
              }`}
            >
              {isNavigationMode
                ? "Déplacement activé"
                : "Création de pixel art"}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          {isNavigationMode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Glissez pour naviguer sur le canvas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Molette pour zoomer/dézoomer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Relâchez Shift/Ctrl pour dessiner</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Cliquez pour placer un pixel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Molette pour zoomer/dézoomer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Shift/Ctrl + Glisser pour naviguer</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Indicateur de statut en temps réel */}
      <div
        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-900/30 
                      rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MousePointer
              size={14}
              className="text-gray-600 dark:text-gray-400"
            />
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contrôles
            </h5>
          </div>
          <div
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              isNavigationMode
                ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
            }`}
          >
            {isNavigationMode ? "Navigation" : "Dessin"}
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Clic gauche
            </span>
            <span className="text-gray-800 dark:text-gray-200">
              {isNavigationMode ? "Déplacer" : "Placer pixel"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Molette</span>
            <span className="text-gray-800 dark:text-gray-200">Zoom</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Shift/Ctrl</span>
            <span className="text-gray-800 dark:text-gray-200">
              Basculer mode
            </span>
          </div>
        </div>
      </div>

      {/* Bouton de reset de la grille */}
      {onResetGrid && (
        <div
          className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 
                        rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <RotateCcw size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Réinitialisation
              </h4>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Remettre à zéro la vue
              </p>
            </div>
          </div>

          <button
            onClick={onResetGrid}
            className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 
                       hover:from-orange-600 hover:to-amber-700 text-white text-sm font-medium 
                       rounded-lg transition-all duration-200 transform hover:scale-105 
                       active:scale-95 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <RotateCcw size={14} />
              <span>Réinitialiser la vue</span>
            </div>
          </button>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
            Remet le zoom et la position à l'état initial
          </p>
        </div>
      )}
    </div>
  );
}
