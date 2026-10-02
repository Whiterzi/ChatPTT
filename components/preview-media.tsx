import { imageReferrerPolicy, previewMediaKind } from "@/lib/image-links";

/** Inline previews and the floating gallery use the same browser media support. */
export function PreviewMedia({ src, alt, href, lazy, onLoad, onError }: {
  src: string; alt: string; href?: string; lazy?: boolean; onLoad?: () => void; onError: () => void;
}) {
  if (previewMediaKind(src) === "video") return <video src={src} aria-label={alt} controls loop muted playsInline preload="metadata" onLoadedMetadata={onLoad} onError={onError}/>;
  const image = <img src={src} alt={alt} loading={lazy ? "lazy" : "eager"} decoding="async" referrerPolicy={imageReferrerPolicy(src)} onLoad={onLoad} onError={onError}/>;
  return href ? <a href={href} target="_blank" rel="noreferrer noopener" aria-label="開啟原始圖片">{image}</a> : image;
}
