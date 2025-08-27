"use client";
import React, { useRef, useState, useEffect, useMemo } from "react";
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
import { v4 as uuidv4 } from "uuid"; // Add this import for generating unique keys

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

  const previewKey = useMemo(() => {
    if (!localSrc) return "placeholder";
    // slice pour éviter une clé trop longue, et uuid pour différencier les différentes images identiques collées
    return `preview-${String(localSrc).slice(0, 40)}-${uuidv4()}`;
  }, [localSrc]);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm dark:text-gray-800 text-white">
            <svg
              width="16"
              height="16"
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
            <h3 className="text-sm font-bold text-text-primary">
              Superposition
            </h3>
            <p className="text-xs text-text-secondary">
              Contrôles d'image & position
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {localSrc && (
            <button
              onClick={() => onToggleShow(!show)}
              aria-pressed={show}
              title={
                show ? "Masquer la superposition" : "Afficher la superposition"
              }
              className={`p-1.5 rounded-lg transition-all duration-fast ${
                show
                  ? "bg-accent text-text-primary shadow-sm hover:bg-accent-hover active:bg-accent-active"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
              className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all duration-fast"
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
            className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all duration-fast"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className="mt-4 space-y-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex gap-3 items-start">
          <div className="w-20 h-20 rounded-lg bg-surface-secondary border border-border-secondary flex items-center justify-center overflow-hidden shadow-sm">
            <AnimatePresence>
              {localSrc ? (
                <m.img
                  key={previewKey}
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

          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-text-primary block">
              URL (ou coller une data URL)
            </label>
            <input
              type="url"
              value={localSrc}
              onChange={(e) => {
                setLocalSrc(e.target.value);
              }}
              onBlur={(e) => onChangeSrc(e.target.value)}
              placeholder="https://..."
              className="w-full px-2 py-1.5 bg-surface-primary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast text-sm"
              aria-label="URL de l'image de superposition"
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">Opacité</span>
                <span className="text-xs font-bold text-accent">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={opacity}
                  onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-accent"
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
                  className="w-16 px-1.5 py-1 bg-surface-primary border border-border-primary rounded text-text-primary text-center font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast text-xs"
                  aria-label="Pourcentage d'opacité"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-secondary rounded-lg p-3 border border-border-secondary space-y-3">
          <h4 className="text-sm font-bold text-text-primary">Transformation</h4>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Position X</label>
              <input
                type="number"
                value={Math.round(transform.x)}
                onChange={(e) =>
                  onChangeTransform({
                    x: sanitizeNumber(e.target.value, transform.x),
                  })
                }
                className="w-full px-2 py-1.5 bg-surface-primary border border-border-primary rounded text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast text-sm"
                aria-label="Position X"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Position Y</label>
              <input
                type="number"
                value={Math.round(transform.y)}
                onChange={(e) =>
                  onChangeTransform({
                    y: sanitizeNumber(e.target.value, transform.y),
                  })
                }
                className="w-full px-2 py-1.5 bg-surface-primary border border-border-primary rounded text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast text-sm"
                aria-label="Position Y"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Taille</label>
              <input
                type="number"
                value={Math.round(transform.width)}
                onChange={(e) =>
                  onChangeTransform({
                    width: Math.max(
                      10,
                      sanitizeNumber(e.target.value, transform.width),
                    ),
                    height: Math.max(
                      10,
                      sanitizeNumber(e.target.value, transform.height),
                    ),
                  })
                }
                className="w-full px-2 py-1.5 bg-surface-primary border border-border-primary rounded text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-fast text-sm"
                aria-label="Taille"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">
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
                className="w-full accent-accent"
                aria-label="Rotation de l'image"
              />
            </div>
          </div>

          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChangeTransform({ x: 0, y: 0 })}
              className="flex-1 px-2 py-1.5 bg-surface-primary hover:bg-surface-hover border border-border-primary hover:border-accent rounded text-text-secondary hover:text-text-primary transition-all duration-fast flex items-center justify-center gap-1"
              title="Centrer"
            >
              <Move size={14} />
              <span className="text-xs font-medium">Centrer</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTransform({ width: 300, height: 300 })}
              className="flex-1 px-2 py-1.5 bg-surface-primary hover:bg-surface-hover border border-border-primary hover:border-accent rounded text-text-secondary hover:text-text-primary transition-all duration-fast flex items-center justify-center gap-1"
              title="Reset taille"
            >
              <Maximize2 size={14} />
              <span className="text-xs font-medium">Reset</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTransform({ rotation: 0 })}
              className="flex-1 px-2 py-1.5 bg-surface-primary hover:bg-surface-hover border border-border-primary hover:border-accent rounded text-text-secondary hover:text-text-primary transition-all duration-fast flex items-center justify-center gap-1"
              title="Reset rotation"
            >
              <RotateCcw size={14} />
              <span className="text-xs font-medium">0°</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => onToggleShow(!show)}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all duration-fast ${
              show
                ? "bg-accent text-gray-800 shadow-sm hover:bg-accent-hover active:bg-accent-active"
                : "bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
            aria-pressed={show}
          >
            {show ? "Masquer" : "Afficher"}
          </button>

          <div className="relative">
            {!confirmRemove ? (
              <button
                onClick={() => setConfirmRemove(true)}
                className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-fast"
                title="Supprimer la superposition"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <m.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex gap-1.5"
              >
                <button
                  onClick={() => {
                    onRemove();
                    setConfirmRemove(false);
                  }}
                  className="px-2 py-1.5 rounded bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium flex items-center gap-1"
                >
                  <Check size={14} />
                  <span className="text-xs">Oui</span>
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="px-2 py-1.5 rounded bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary font-medium text-xs"
                >
                  Annuler
                </button>
              </m.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
