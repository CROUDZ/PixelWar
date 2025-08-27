// components/pixel/OverlayImage.tsx  (remplacer entièrement par ceci)
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ImageFallback from "../Image";

export interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface OverlayImageProps {
  targetRef: React.RefObject<HTMLElement> | null;
  src: string;
  show: boolean;
  opacity: number;
  transform: OverlayTransform;
  zIndex?: number;
  pointerEvents?: "none" | "auto";
  className?: string;
  canvasZoom?: number; // CSS px per grid pixel
  canvasPan?: { x: number; y: number }; // CSS px
  pixelSize?: number; // logical pixel size multiplier (default 1)
}

export default function OverlayImage({
  targetRef,
  src,
  show,
  opacity,
  transform,
  zIndex = 100,
  pointerEvents = "none",
  className,
  canvasZoom = 1,
  canvasPan = { x: 0, y: 0 },
  pixelSize = 1,
}: OverlayImageProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetRef?.current) return;
    const update = () => {
      const r = targetRef.current?.getBoundingClientRect() ?? null;
      setRect(r);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(targetRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [targetRef]);

  if (!show || !src || !rect) return null;
  if (typeof document === "undefined") return null;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // === Calculs principaux ===
  // pixelCssSize = nombre de CSS px pour 1 pixel de la grille
  const pixelCssSize = (canvasZoom || 1) * (pixelSize || 1);

  // position/size en CSS pixels (avant snapping)
  const rawCanvasX = transform.x * pixelCssSize + (canvasPan?.x || 0);
  const rawCanvasY = transform.y * pixelCssSize + (canvasPan?.y || 0);
  const rawWidth = transform.width * pixelCssSize;
  const rawHeight = transform.height * pixelCssSize;

  // Snap en UNITÉS DE GRILLE (garantit alignement sur la grille)
  const gridX = Math.round(rawCanvasX / pixelCssSize);
  const gridY = Math.round(rawCanvasY / pixelCssSize);
  const gridW = Math.max(1, Math.round(rawWidth / pixelCssSize));
  const gridH = Math.max(1, Math.round(rawHeight / pixelCssSize));

  // reconstruire valeurs CSS alignées sur la grille
  const snappedCanvasX = gridX * pixelCssSize;
  const snappedCanvasY = gridY * pixelCssSize;
  const snappedWidth = gridW * pixelCssSize;
  const snappedHeight = gridH * pixelCssSize;

  // Snap final en device pixels (comme le canvas) pour éviter les gaps subpixel
  const finalX = Math.round(snappedCanvasX * dpr) / dpr;
  const finalY = Math.round(snappedCanvasY * dpr) / dpr;
  const finalW = Math.round(snappedWidth * dpr) / dpr;
  const finalH = Math.round(snappedHeight * dpr) / dpr;

  // Debug (active si nécessaire)
  // console.log("[OverlayImage] snap", { pixelCssSize, gridX, gridY, gridW, gridH, finalX, finalY, finalW, finalH, dpr });

  // Portal: utiliser le conteneur du canvas (même repère) si disponible
  const portalTarget = targetRef?.current ?? document.body;
  const isBody = portalTarget === document.body;

  const wrapperClasses = [
    "absolute",
    "pointer-events-none",
    "overflow-visible",
    `z-${zIndex}`,
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const innerClasses = [
    "absolute",
    "top-0",
    "left-0",
    "box-border",
    "backface-hidden",
    "will-change-transform",
    pointerEvents === "auto" ? "pointer-events-auto" : "pointer-events-none",
  ].join(" ");

  const imageClasses = [
    "w-full",
    "h-full",
    "object-cover",
    "select-none",
    "pointer-events-none",
    "block",
    "image-rendering-pixelated",
  ].join(" ");

  // On place le wrapper à la position du container (rect.left/top) si portal sur body,
  // sinon on laisse 0,0 et le transform inner fait le positionnement relatif.
  const node = (
    <div
      className={wrapperClasses}
      style={{
        left: isBody ? rect.left : 0,
        top: isBody ? rect.top : 0,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
    >
      <div
        className={innerClasses}
        style={{
          // translate relatif au container
          transform: `translate3d(${finalX}px, ${finalY}px, 0) rotate(${transform.rotation}deg)`,
          transformOrigin: "top left",
          width: `${finalW}px`,
          height: `${finalH}px`,
        }}
      >
        <ImageFallback
          src={src}
          alt="Overlay"
          draggable={false}
          className={imageClasses}
          style={{
            opacity: opacity,
            width: "100%",
            height: "100%",
          }}
          onError={() => {
            /* noop */
          }}
        />
      </div>
    </div>
  );

  return createPortal(node, portalTarget);
}
