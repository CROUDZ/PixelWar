// components/ImageFallback.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo } from "react";

type Responsive = {
  srcSet?: string;
  sizes?: string;
};

type PictureSources = {
  avif?: string;
  webp?: string;
};

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | File | null;
  responsive?: Responsive;
  pictureSources?: PictureSources;
  priority?: boolean; // si true => précharger / fetchPriority high
};

export default function ImageFallback({
  src,
  responsive,
  pictureSources,
  priority = false,
  style,
  alt = "", // valeur par défaut : chaîne vide (image décorative si non renseignée)
  ...rest
}: Props) {
  const isFile = typeof File !== "undefined" && src instanceof File;
  const objectUrl = useMemo(
    () => (isFile && src ? URL.createObjectURL(src) : null),
    [isFile, src],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const imgSrc = isFile ? (objectUrl ?? "") : ((src as string) ?? "");

  // conseils : toujours fournir width/height ou aspect-ratio via style pour éviter CLS
  const mergedStyle = {
    display: "block",
    width: "100%",
    height: "auto",
    ...style,
  } as React.CSSProperties;

  return (
    <picture>
      {pictureSources?.avif && (
        <source
          type="image/avif"
          srcSet={pictureSources.avif}
          sizes={responsive?.sizes}
        />
      )}
      {pictureSources?.webp && (
        <source
          type="image/webp"
          srcSet={pictureSources.webp}
          sizes={responsive?.sizes}
        />
      )}

      <img
        {...rest}
        src={imgSrc}
        alt={alt}
        srcSet={responsive?.srcSet}
        sizes={responsive?.sizes}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        style={mergedStyle}
      />
    </picture>
  );
}
