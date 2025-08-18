"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import PixelCanvas from "./PixelCanvas";
import { Eye, EyeOff, Settings, Upload, X, Move, RotateCcw, Maximize2 } from "lucide-react";

interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface PixelCanvasWithOverlayProps {
  // Props pour le canvas principal
  pixelWidth?: number;
  pixelHeight?: number;
  selectedColor?: string;
  
  // Props pour l'overlay
  overlaySrc?: string;
  overlayOpacity?: number;
  showOverlay?: boolean;
  overlayTransform?: OverlayTransform;
  onOverlayChange?: (overlaySrc: string) => void;
  onOpacityChange?: (opacity: number) => void;
  onShowOverlayChange?: (show: boolean) => void;
  onTransformChange?: (transform: OverlayTransform) => void;
}

export default function PixelCanvasWithOverlay({
  pixelWidth = 100,
  pixelHeight = 100,
  selectedColor = "#000000",
  overlaySrc,
  overlayOpacity = 0.5,
  showOverlay = false,
  overlayTransform,
  onOverlayChange,
  onOpacityChange,
  onShowOverlayChange,
  onTransformChange,
}: PixelCanvasWithOverlayProps) {
  // États locaux pour la gestion de l'overlay
  const [localShowOverlay, setLocalShowOverlay] = useState(showOverlay);
  const [localOverlaySrc, setLocalOverlaySrc] = useState(overlaySrc || "");
  const [localOpacity, setLocalOpacity] = useState(overlayOpacity);
  const [showControls, setShowControls] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // États pour la transformation de l'overlay
  const [transform, setTransform] = useState<OverlayTransform>(
    overlayTransform || {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      rotation: 0,
    }
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Mettre à jour les états locaux quand les props changent
  useEffect(() => {
    setLocalShowOverlay(showOverlay);
  }, [showOverlay]);

  useEffect(() => {
    setLocalOverlaySrc(overlaySrc || "");
  }, [overlaySrc]);

  useEffect(() => {
    setLocalOpacity(overlayOpacity);
  }, [overlayOpacity]);

  useEffect(() => {
    if (overlayTransform) {
      setTransform(overlayTransform);
    }
  }, [overlayTransform]);

  // Fonctions de transformation
  const updateTransform = useCallback((newTransform: Partial<OverlayTransform>) => {
    const updatedTransform = { ...transform, ...newTransform };
    setTransform(updatedTransform);
    onTransformChange?.(updatedTransform);
  }, [transform, onTransformChange]);

  // Fonctions de gestion
  const handleToggleOverlay = () => {
    const newValue = !localShowOverlay;
    setLocalShowOverlay(newValue);
    onShowOverlayChange?.(newValue);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setLocalOpacity(newOpacity);
    onOpacityChange?.(newOpacity);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLocalOverlaySrc(result);
        setImageError(false);
        setIsImageLoaded(false);
        onOverlayChange?.(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsImageLoaded(false);
  };

  const handleRemoveOverlay = () => {
    setLocalOverlaySrc("");
    setLocalShowOverlay(false);
    setIsImageLoaded(false);
    setImageError(false);
    // Réinitialiser la transformation
    const defaultTransform = {
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      rotation: 0,
    };
    setTransform(defaultTransform);
    onOverlayChange?.("");
    onShowOverlayChange?.(false);
    onTransformChange?.(defaultTransform);
  };

  const handleUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLocalOverlaySrc(url);
    setImageError(false);
    setIsImageLoaded(false);
    onOverlayChange?.(url);
  };

  // Centrer l'overlay sur le canvas
  const centerOverlay = () => {
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const rect = container.getBoundingClientRect();
      updateTransform({
        x: (rect.width - transform.width) / 2,
        y: (rect.height - transform.height) / 2,
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas principal */}
      <div ref={canvasContainerRef} className="relative w-full h-full">
        <PixelCanvas
          pixelWidth={pixelWidth}
          pixelHeight={pixelHeight}
          selectedColor={selectedColor}
        />
        
        {/* Overlay d'image transformable */}
        {localOverlaySrc && localShowOverlay && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${transform.x}px`,
              top: `${transform.y}px`,
              width: `${transform.width}px`,
              height: `${transform.height}px`,
              transform: `rotate(${transform.rotation}deg)`,
              transformOrigin: 'center',
              zIndex: 20,
            }}
          >
            {/* Image overlay */}
            <div className="relative w-full h-full">
              <Image
                src={localOverlaySrc}
                alt="Overlay de référence"
                fill
                className="object-contain pointer-events-none select-none"
                style={{
                  opacity: localOpacity,
                  imageRendering: "pixelated",
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                unoptimized={true}
                draggable={false}
              />
              
              {imageError && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-red-100 border-2 border-red-300 rounded text-center pointer-events-none"
                  style={{ opacity: localOpacity }}
                >
                  <span className="text-red-600 text-xs">Erreur de chargement</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contrôles d'overlay */}
      <div className="absolute top-4 right-4 z-30">
        <div className="flex flex-col gap-2">
          {/* Bouton principal toggle */}
          {localOverlaySrc && (
            <button
              onClick={handleToggleOverlay}
              className={`p-2 rounded-lg shadow-lg transition-all duration-200 ${
                localShowOverlay
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              }`}
              title={localShowOverlay ? "Masquer l'overlay" : "Afficher l'overlay"}
            >
              {localShowOverlay ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          )}

          {/* Bouton paramètres */}
          <button
            onClick={() => setShowControls(!showControls)}
            className="p-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg shadow-lg transition-all duration-200"
            title="Paramètres d'overlay"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Panneau de contrôles */}
        {showControls && (
          <div className="absolute top-0 right-16 bg-white rounded-lg shadow-xl border p-4 min-w-[280px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Overlay de référence</h3>
              <button
                onClick={() => setShowControls(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Upload d'image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Charger une image
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} />
                Parcourir...
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* URL d'image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ou URL d'image
              </label>
              <input
                type="url"
                value={localOverlaySrc}
                onChange={handleUrlInput}
                placeholder="https://exemple.com/image.png"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Contrôle d'opacité */}
            {localOverlaySrc && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacité: {Math.round(localOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localOpacity}
                  onChange={handleOpacityChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}

            {/* Contrôles de transformation */}
            {localOverlaySrc && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Position et Taille</h4>
                
                {/* Position */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(transform.x)}
                      onChange={(e) => updateTransform({ x: parseInt(e.target.value) || 0 })}
                      className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(transform.y)}
                      onChange={(e) => updateTransform({ y: parseInt(e.target.value) || 0 })}
                      className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Taille */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Largeur</label>
                    <input
                      type="number"
                      value={Math.round(transform.width)}
                      onChange={(e) => updateTransform({ width: Math.max(50, parseInt(e.target.value) || 50) })}
                      min="50"
                      className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hauteur</label>
                    <input
                      type="number"
                      value={Math.round(transform.height)}
                      onChange={(e) => updateTransform({ height: Math.max(50, parseInt(e.target.value) || 50) })}
                      min="50"
                      className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Rotation */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    Rotation: {Math.round(transform.rotation)}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="15"
                    value={transform.rotation}
                    onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Boutons de réinitialisation */}
                <div className="flex gap-2">
                  <button
                    onClick={centerOverlay}
                    className="flex-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  >
                    <Move size={12} className="inline mr-1" />
                    Centrer
                  </button>
                  <button
                    onClick={() => updateTransform({ width: 300, height: 300 })}
                    className="flex-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  >
                    <Maximize2 size={12} className="inline mr-1" />
                    Reset taille
                  </button>
                  <button
                    onClick={() => updateTransform({ rotation: 0 })}
                    className="flex-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  >
                    <RotateCcw size={12} className="inline mr-1" />
                    0°
                  </button>
                </div>
              </div>
            )}

            {/* Statut de l'image */}
            {localOverlaySrc && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      imageError
                        ? "bg-red-500"
                        : isImageLoaded
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <span>
                    {imageError
                      ? "Erreur de chargement"
                      : isImageLoaded
                      ? "Image chargée"
                      : "Chargement..."}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            {localOverlaySrc && (
              <div className="flex gap-2">
                <button
                  onClick={handleToggleOverlay}
                  className={`flex-1 p-2 rounded-md text-sm font-medium transition-colors ${
                    localShowOverlay
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  {localShowOverlay ? "Masquer" : "Afficher"}
                </button>
                <button
                  onClick={handleRemoveOverlay}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Styles CSS pour le slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
