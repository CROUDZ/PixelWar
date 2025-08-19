// OverlayImage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface OverlayImageProps {
  targetRef: React.RefObject<HTMLElement> | null; // l'élément au dessus duquel on se positionne (container du canvas)
  src: string;
  show: boolean;
  opacity: number;
  transform: OverlayTransform;
  zIndex?: number;
  pointerEvents?: "none" | "auto";
  className?: string;
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
}: OverlayImageProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetRef?.current) return;

    const update = () => {
      const r = targetRef.current?.getBoundingClientRect() ?? null;
      setRect(r);
    };

    update();

    // ResizeObserver pour suivre les changements de taille du container
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

  // si pas de target ou pas d'affichage, rien
  if (!show || !src || !rect) return null;
  if (typeof document === "undefined") return null;

  // position absolue dans le viewport calculée à partir du rect du target
  const left = rect.left + window.scrollX + transform.x;
  const top = rect.top + window.scrollY + transform.y;
  const style: React.CSSProperties = {
    position: "absolute",
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(transform.width),
    height: Math.round(transform.height),
    transform: `rotate(${transform.rotation}deg)`,
    transformOrigin: "center",
    zIndex,
    pointerEvents,
    imageRendering: "pixelated",
  };

  const node = (
    <div style={style} className={className}>
      {/* utilisation d'une balise <img> pour éviter les contraintes de next/image dans le portal */}
      <Image
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
        }}
        onError={() => {
          /* tu peux ajouter un handler si tu veux */
        }}
      />
    </div>
  );

  return createPortal(node, document.body);
}
