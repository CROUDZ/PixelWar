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
  canvasZoom?: number;
  canvasPan?: { x: number; y: number };
  pixelSize?: number;
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

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  // Calculs (on garde des floats pour éviter perte subpixel)
  const canvasX = transform.x * pixelSize * canvasZoom + canvasPan.x;
  const canvasY = transform.y * pixelSize * canvasZoom + canvasPan.y;
  const scaledWidth = transform.width * pixelSize * canvasZoom;
  const scaledHeight = transform.height * pixelSize * canvasZoom;

  const snappedX = Math.round(canvasX * dpr) / dpr;
  const snappedY = Math.round(canvasY * dpr) / dpr;
  const snappedWidth = Math.round(scaledWidth * dpr) / dpr;
  const snappedHeight = Math.round(scaledHeight * dpr) / dpr;

  // Portal target: on privilégie le conteneur du canvas pour avoir le même repère
  const portalTarget = targetRef?.current ?? document.body;

  const isBody = portalTarget === document.body;

  // Classes Tailwind pour le wrapper avec amélioration visuelle
  const wrapperClasses = [
    "absolute",
    "pointer-events-none",
    "overflow-visible",
    `z-${zIndex}`,
    // Amélioration visuelle pour le mode clair
    "backdrop-blur-sm",
    "bg-surface-primary/20",
    "border",
    "border-border-primary/30",
    "rounded-lg",
    "shadow-glass",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  // Classes Tailwind pour l'élément intérieur avec effets visuels
  const innerClasses = [
    "absolute",
    "top-0",
    "left-0",
    "box-border",
    "backface-hidden",
    "will-change-transform",
    "will-change-width",
    "will-change-height",
    "will-change-opacity",
    // Amélioration de l'apparence
    "bg-surface-primary/10",
    "backdrop-blur-xs",
    "border",
    "border-border-primary/20",
    "rounded-md",
    "shadow-sm",
    "transition-all",
    "duration-200",
    "ease-out",
    pointerEvents === "auto"
      ? "pointer-events-auto"
      : "pointer-events-none",
  ].join(" ");

  // Classes Tailwind pour l'image avec effets améliorés
  const imageClasses = [
    "w-full",
    "h-full",
    "object-contain",
    "select-none",
    "pointer-events-none",
    "block",
    "image-rendering-pixelated",
    // Amélioration de l'image
    "drop-shadow-sm",
    "filter",
    "brightness-105",
    "contrast-110",
  ].join(" ");

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
          transform: `translate3d(${snappedX}px, ${snappedY}px, 0) rotate(${transform.rotation}deg)`,
          transformOrigin: "top left",
          width: `${snappedWidth}px`,
          height: `${snappedHeight}px`,
        }}
      >
        <ImageFallback
          src={src}
          alt="Overlay"
          draggable={false}
          className={imageClasses}
          style={{
            opacity: opacity,
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
