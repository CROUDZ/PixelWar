// OverlayImage.tsx
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
  debug?: boolean;
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
  debug = false,
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

  // Calculs (on garde des floats pour éviter perte subpixel)
  const canvasX = (transform.x * pixelSize + canvasPan.x) * canvasZoom;
  const canvasY = (transform.y * pixelSize + canvasPan.y) * canvasZoom;
  const scaledWidth = transform.width * pixelSize * canvasZoom;
  const scaledHeight = transform.height * pixelSize * canvasZoom;

  // debug utile quand problème persiste
  if (debug) {
    // eslint-disable-next-line no-console
    console.log("[OverlayImage] debug", {
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
      canvasX,
      canvasY,
      scaledWidth,
      scaledHeight,
      pixelSize,
      canvasZoom,
      devicePixelRatio:
        typeof window !== "undefined" ? window.devicePixelRatio : 1,
    });
  }

  // Portal target: on privilégie le conteneur du canvas pour avoir le même repère
  const portalTarget = targetRef?.current ?? document.body;

  // wrapper absolu qui recouvre exactement le conteneur (left/top = 0)
  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    pointerEvents: "none", // wrapper inactif ; on laisse pointerEvents sur l'image si besoin
    overflow: "visible",
    zIndex,
  };

  // element positionné à l'intérieur du wrapper avec transform (préserve les floats / sous-pixels)
  const innerStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    // translation par transform pour éviter arrondis liés à left/top
    transform: `translate3d(${canvasX}px, ${canvasY}px, 0) rotate(${transform.rotation}deg)`,
    transformOrigin: "top left",
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    pointerEvents,
    willChange: "transform, width, height, opacity",
    backfaceVisibility: "hidden",
    imageRendering: "pixelated",
    // évite bordures non voulues :
    boxSizing: "border-box",
  };

  const node = (
    <div style={wrapperStyle} className={className}>
      <div style={innerStyle}>
        <ImageFallback
          src={src}
          alt="Overlay"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: opacity,
            userSelect: "none",
            pointerEvents: "none",
            imageRendering: "pixelated",
            display: "block",
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
