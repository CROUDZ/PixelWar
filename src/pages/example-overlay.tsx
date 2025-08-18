import React, { useState } from "react";
import PixelCanvasWithOverlay from "@/components/pixel/PixelCanvasWithOverlay";

/**
 * Exemple d'utilisation du composant PixelCanvasWithOverlay
 * Ce composant montre comment intégrer l'overlay dans votre application
 */
export default function ExamplePixelWarPage() {
  // États pour gérer l'overlay
  const [overlayImage, setOverlayImage] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [selectedColor, setSelectedColor] = useState("#FF0000");

  // Quelques images d'exemple pour les tests
  const exampleImages = [
    {
      name: "Logo exemple",
      url: "https://via.placeholder.com/100x100/FF0000/FFFFFF?text=LOGO",
    },
    {
      name: "Pattern exemple",
      url: "https://via.placeholder.com/100x100/00FF00/000000?text=PATTERN",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            PixelWar - Avec Overlay
          </h1>

          {/* Sélecteur de couleur */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Couleur:
            </label>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-8 h-8 rounded border"
            />
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas avec overlay */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Canvas de dessin
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Utilisez le bouton paramètres pour ajouter un overlay de
                  référence
                </p>
              </div>

              <div className="relative">
                <PixelCanvasWithOverlay
                  pixelWidth={100}
                  pixelHeight={100}
                  selectedColor={selectedColor}
                  overlaySrc={overlayImage}
                  overlayOpacity={overlayOpacity}
                  showOverlay={overlayVisible}
                  onOverlayChange={setOverlayImage}
                  onOpacityChange={setOverlayOpacity}
                  onShowOverlayChange={setOverlayVisible}
                />
              </div>
            </div>
          </div>

          {/* Panneau de contrôles et informations */}
          <div className="space-y-6">
            {/* Informations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Overlay actif:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {overlayVisible ? "Oui" : "Non"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Opacité:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Image:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {overlayImage ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            </div>

            {/* Images d'exemple */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Images d'exemple
              </h3>
              <div className="space-y-2">
                {exampleImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setOverlayImage(image.url);
                      setOverlayVisible(true);
                    }}
                    className="w-full text-left p-2 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {image.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {image.url}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Instructions
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Cliquez sur ⚙️ pour ouvrir les paramètres</li>
                <li>• Uploadez une image ou utilisez une URL</li>
                <li>• Ajustez l'opacité avec le slider</li>
                <li>• Utilisez 👁️ pour activer/désactiver</li>
                <li>• L'overlay n'interfère pas avec le dessin</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
