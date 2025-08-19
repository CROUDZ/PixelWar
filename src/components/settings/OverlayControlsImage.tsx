// components/OverlayControls.tsx
"use client";
import React, { useRef, useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Upload,
  X,
  Move,
  RotateCcw,
  Maximize2,
  Trash2,
  Check,
} from "lucide-react";
import type { OverlayTransform } from "../pixel/OverlayImage";

interface Props {
  src: string;
  show: boolean;
  opacity: number;
  transform: OverlayTransform;
  onToggleShow: (next: boolean) => void;
  onChangeSrc: (src: string) => void;
  onChangeOpacity: (opacity: number) => void;
  onChangeTransform: (t: Partial<OverlayTransform>) => void;
  onRemove: () => void;
  onClose?: () => void;
}

export default function OverlayControls({
  src,
  show,
  opacity,
  transform,
  onToggleShow,
  onChangeSrc,
  onChangeOpacity,
  onChangeTransform,
  onRemove,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [localSrc, setLocalSrc] = useState<string>(src || "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setLocalSrc(src || "");
  }, [src]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const s = ev.target?.result as string;
      setLocalSrc(s);
      onChangeSrc(s);
    };
    r.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const s = ev.target?.result as string;
      setLocalSrc(s);
      onChangeSrc(s);
    };
    r.readAsDataURL(f);
  };

  const sanitizeNumber = (v: string, fallback = 0) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? fallback : n;
  };

  return (
    <AnimatePresence initial={false}>
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 rounded-md bg-white/10">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <rect
                width="20"
                height="20"
                x="2"
                y="2"
                rx="3"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Superposition</h3>
            <p className="text-xs text-white/70">
              Contrôles d'image & position
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {localSrc && (
            <button
              onClick={() => onToggleShow(!show)}
              aria-pressed={show}
              title={
                show ? "Masquer la superposition" : "Afficher la superposition"
              }
              className={`p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                show
                  ? "bg-blue-500 text-white"
                  : "bg-white/6 text-white/90 hover:bg-white/10"
              }`}
            >
              {show ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => fileRef.current?.click()}
              title="Charger image"
              aria-label="Charger une image"
              className="p-2 rounded-md bg-white/6 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Upload size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <button
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer panneau"
            className="p-2 rounded-md bg-white/6 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* contenu */}
      <div
        className="mt-3 space-y-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* aperçu + URL */}
        <div className="flex gap-3 items-start">
          <div className="w-20 h-20 rounded-md bg-white/8 flex items-center justify-center overflow-hidden">
            <AnimatePresence>
              {localSrc ? (
                <m.img
                  key="preview"
                  src={localSrc}
                  alt="Aperçu superposition"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="object-cover w-full h-full"
                />
              ) : (
                <m.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-text-secondary px-2 text-center"
                >
                  Glisser-déposer ou charger
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1">
            <label className="text-xs block mb-1">
              URL (ou coller une data URL)
            </label>
            <input
              type="url"
              value={localSrc}
              onChange={(e) => {
                setLocalSrc(e.target.value);
                // ne pas spammer la prop ; on la met après un petit délai (simple debounce local)
              }}
              onBlur={(e) => onChangeSrc(e.target.value)}
              placeholder="https://..."
              className="w-full p-2 rounded-md bg-white/5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label="URL de l'image de superposition"
            />
            <div className="mt-2 text-xs text-white/60 flex items-center gap-2">
              <span>Opacité</span>
              <span className="ml-auto font-medium">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="flex-1"
                aria-label="Opacité de la superposition"
              />
              <input
                type="number"
                value={Math.round(opacity * 100)}
                onChange={(e) => {
                  const pct = sanitizeNumber(
                    e.target.value,
                    Math.round(opacity * 100),
                  );
                  const clamped = Math.max(0, Math.min(100, pct));
                  onChangeOpacity(clamped / 100);
                }}
                className="w-16 p-1 rounded-md bg-white/5 text-sm text-center"
                aria-label="Pourcentage d'opacité"
              />
            </div>
          </div>
        </div>

        {/* transform controls */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">X</label>
            <input
              type="number"
              value={Math.round(transform.x)}
              onChange={(e) =>
                onChangeTransform({
                  x: sanitizeNumber(e.target.value, transform.x),
                })
              }
              className="w-full p-2 rounded-md bg-white/5 text-sm"
              aria-label="Position X"
            />
          </div>
          <div>
            <label className="text-xs">Y</label>
            <input
              type="number"
              value={Math.round(transform.y)}
              onChange={(e) =>
                onChangeTransform({
                  y: sanitizeNumber(e.target.value, transform.y),
                })
              }
              className="w-full p-2 rounded-md bg-white/5 text-sm "
              aria-label="Position Y"
            />
          </div>

          <div>
            <label className="text-xs">W</label>
            <input
              type="number"
              value={Math.round(transform.width)}
              onChange={(e) =>
                onChangeTransform({
                  width: Math.max(
                    10,
                    sanitizeNumber(e.target.value, transform.width),
                  ),
                })
              }
              className="w-full p-2 rounded-md bg-white/5 text-sm"
              aria-label="Largeur"
            />
          </div>
          <div>
            <label className="text-xs">H</label>
            <input
              type="number"
              value={Math.round(transform.height)}
              onChange={(e) =>
                onChangeTransform({
                  height: Math.max(
                    10,
                    sanitizeNumber(e.target.value, transform.height),
                  ),
                })
              }
              className="w-full p-2 rounded-md bg-white/5 text-sm"
              aria-label="Hauteur"
            />
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1">
            Rotation: {Math.round(transform.rotation)}°
          </label>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={transform.rotation}
            onChange={(e) =>
              onChangeTransform({
                rotation: sanitizeNumber(e.target.value, transform.rotation),
              })
            }
            className="w-full"
            aria-label="Rotation de l'image"
          />
        </div>

        {/* quick actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChangeTransform({ x: 0, y: 0 })}
            className="flex-1 p-2 rounded-md bg-white/6 hover:bg-white/9 text-sm flex items-center justify-center gap-2"
            title="Centrer"
          >
            <Move size={14} /> Centrer
          </button>
          <button
            type="button"
            onClick={() => onChangeTransform({ width: 300, height: 300 })}
            className="flex-1 p-2 rounded-md bg-white/6 hover:bg-white/9 text-sm flex items-center justify-center gap-2"
            title="Reset taille"
          >
            <Maximize2 size={14} /> Reset taille
          </button>
          <button
            type="button"
            onClick={() => onChangeTransform({ rotation: 0 })}
            className="flex-1 p-2 rounded-md bg-white/6 hover:bg-white/9 text-sm flex items-center justify-center gap-2"
            title="Reset rotation"
          >
            <RotateCcw size={14} /> 0°
          </button>
        </div>

        {/* actions finales */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onToggleShow(!show)}
            className={`flex-1 p-2 rounded-md text-sm ${
              show ? "bg-blue-500 text-white" : "bg-white/6 hover:bg-white/10"
            }`}
            aria-pressed={show}
          >
            {show ? "Masquer" : "Afficher"}
          </button>

          <div className="relative">
            {!confirmRemove ? (
              <button
                onClick={() => setConfirmRemove(true)}
                className="p-2 rounded-md bg-red-600 text-white text-sm"
                title="Supprimer la superposition"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <m.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="flex gap-1"
              >
                <button
                  onClick={() => {
                    onRemove();
                    setConfirmRemove(false);
                  }}
                  className="p-2 rounded-md bg-red-600 text-white text-sm flex items-center gap-2"
                >
                  <Check size={14} /> Oui
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="p-2 rounded-md bg-white/6 text-sm"
                >
                  Annuler
                </button>
              </m.div>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
