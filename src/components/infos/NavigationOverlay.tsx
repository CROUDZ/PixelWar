// components/infos/NavigationOverlay.tsx
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

interface NavigationOverlayProps {
  isMobile?: boolean;
  isNavigationMode?: boolean;
  showAdminPanel?: boolean;
  isAdminSelecting?: boolean;
  className?: string;
  isVisible?: (visible: boolean) => void; // Callback pour la visibilité
  onResetGrid?: () => void; // Callback pour le reset de la grille
}

/**
 * Composant simple qui affiche l'indicateur de navigation ou le hint admin.
 */
export default function NavigationOverlay({
  isMobile = false,
  isNavigationMode = false,
  showAdminPanel = false,
  isAdminSelecting = false,
  className = "",
  onResetGrid,
}: NavigationOverlayProps) {
  // Version mobile simplifiée
  if (isMobile) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Navigation size={16} className="text-accent" />
            <span className="text-sm font-medium text-text-primary">Mode Mobile</span>
          </div>
          <div className="space-y-1 text-xs text-text-secondary">
            <div>• Appui simple pour placer un pixel</div>
            <div>• Maintenir et glisser pour naviguer</div>
          </div>
        </div>
      </div>
    );
  }

  // Mode administrateur
  if (showAdminPanel) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-red-500" />
            <span className="text-sm font-medium text-text-primary">Mode Admin</span>
          </div>
          <div className="space-y-2">
            <div className={`p-2 rounded border text-xs ${
              isAdminSelecting
                ? "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600"
                : "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600"
            }`}>
              {isAdminSelecting ? "Sélection en cours..." : "Cliquez pour placer"}
            </div>
            <div className="text-xs text-text-secondary">
              Shift + Glisser pour naviguer
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode normal de navigation/dessin
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode actif */}
      <div className={`rounded-lg p-3 border ${
        isNavigationMode
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {isNavigationMode ? (
            <Move size={16} className="text-green-600 dark:text-green-400" />
          ) : (
            <Paintbrush size={16} className="text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-sm font-medium text-text-primary">
            {isNavigationMode ? "Navigation" : "Dessin"}
          </span>
        </div>

        <div className="space-y-1 text-xs text-text-secondary">
          {isNavigationMode ? (
            <>
              <div>• Glissez pour déplacer</div>
              <div>• Molette pour zoomer</div>
              <div>• Shift/Ctrl pour dessiner</div>
            </>
          ) : (
            <>
              <div>• Clic pour placer pixel</div>
              <div>• Molette pour zoomer</div>
              <div>• Shift/Ctrl pour naviguer</div>
            </>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
        <div className="flex items-center gap-2 mb-2">
          <MousePointer size={14} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Contrôles</span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Clic gauche:</span>
            <span className="text-text-primary font-medium">
              {isNavigationMode ? "Déplacer" : "Placer pixel"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Molette:</span>
            <span className="text-text-primary font-medium">Zoom</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Shift/Ctrl:</span>
            <span className="text-text-primary font-medium">Changer mode</span>
          </div>
        </div>
      </div>

      {/* Bouton reset */}
      {onResetGrid && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={14} className="text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-text-primary">Reset</span>
          </div>

          <button
            onClick={onResetGrid}
            className="w-full py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded transition-colors"
          >
            Réinitialiser la vue
          </button>
        </div>
      )}
    </div>
  );
}
