import React, { useState } from "react";
import PixelCanvasWithOverlay from "@/components/pixel/PixelCanvasWithOverlay";
import { useOverlay } from "@/hooks/useOverlay";

/**
 * Exemple d'utilisation avec le hook useOverlay
 * Version simplifiée et plus propre
 */
export default function ExampleWithHook() {
  const [selectedColor, setSelectedColor] = useState("#FF0000");

  // Utilisation du hook pour gérer l'overlay
  const overlay = useOverlay({
    initialOpacity: 0.5,
    initialShow: false,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec contrôles */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            PixelWar avec Overlay - Exemple Hook
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Couleur:
              </label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  overlay.loadOverlay(
                    "https://via.placeholder.com/100x100/FF0000/FFFFFF?text=LOGO",
                  )
                }
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Charger logo exemple
              </button>

              <button
                onClick={overlay.toggleOverlay}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                disabled={!overlay.overlaySrc}
              >
                {overlay.showOverlay ? "Masquer" : "Afficher"}
              </button>

              <button
                onClick={overlay.resetTransform}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                disabled={!overlay.overlaySrc}
              >
                Reset position
              </button>

              <button
                onClick={overlay.resetOverlay}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <PixelCanvasWithOverlay
            pixelWidth={100}
            pixelHeight={100}
            selectedColor={selectedColor}
            overlaySrc={overlay.overlaySrc}
            overlayOpacity={overlay.overlayOpacity}
            showOverlay={overlay.showOverlay}
            overlayTransform={overlay.overlayTransform}
            onOverlayChange={overlay.setOverlaySrc}
            onOpacityChange={overlay.setOverlayOpacity}
            onShowOverlayChange={overlay.setShowOverlay}
            onTransformChange={overlay.setOverlayTransform}
          />
        </div>

        {/* Debug info */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            État de l'overlay:
          </h3>
          <pre className="text-sm text-gray-600">
            {JSON.stringify(
              {
                src: overlay.overlaySrc,
                opacity: overlay.overlayOpacity,
                visible: overlay.showOverlay,
                transform: overlay.overlayTransform,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
