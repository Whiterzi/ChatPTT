import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, GripHorizontal, X } from "lucide-react";
import type { ArticleImage, ImageSize } from "@/lib/image-links";
import { PreviewMedia } from "@/components/preview-media";

type ResizeCorner = "nw" | "ne" | "sw" | "se";
type ResizeStart = { x: number; y: number; left: number; top: number; width: number; height: number; corner: ResizeCorner };

function ViewerImage({ image, number }: { image: ArticleImage; number: number }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return <div className="floating-image-stage" aria-busy={status === "loading"}>
    {status === "loading" && <span className="floating-image-status" role="status">載入圖片中…</span>}
    {status === "error" ? <p className="floating-image-status" role="status">無法顯示，可能是瀏覽器不支援或圖床限制。<br/>可切換下一張，或開啟原圖。</p> : <PreviewMedia src={image.src} alt={`第 ${number} 張圖片`} onLoad={() => setStatus("ready")} onError={() => setStatus("error")}/>}
  </div>;
}

export function FloatingImageViewer({ title, images, index, size, onIndexChange, onSizeChange, onClose }: {
  title: string; images: ArticleImage[]; index: number; size: ImageSize;
  onIndexChange: (index: number) => void; onSizeChange: (size: ImageSize) => void; onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resize = useRef<ResizeStart | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const image = images[index];
  function move(left: number, top: number) {
    const rect = panel.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ left: Math.max(12, Math.min(left, window.innerWidth - rect.width - 12)), top: Math.max(12, Math.min(top, window.innerHeight - rect.height - 12)) });
  }
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => { setDimensions(null); }, [size]);
  useLayoutEffect(() => {
    const keepInView = () => { const rect = panel.current?.getBoundingClientRect(); if (rect) move(rect.left, rect.top); };
    keepInView();
    window.addEventListener("resize", keepInView);
    const observer = new ResizeObserver(keepInView);
    if (panel.current) observer.observe(panel.current);
    return () => { window.removeEventListener("resize", keepInView); observer.disconnect(); };
  }, []);
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = panel.current!.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current) move(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y);
  }
  function resizeFrom(start: ResizeStart, dx: number, dy: number) {
    const minWidth = Math.min(260, window.innerWidth - 24), minHeight = Math.min(240, window.innerHeight - 24);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    let left = start.left, top = start.top, right = left + start.width, bottom = top + start.height;
    if (start.corner.endsWith("w")) left = clamp(left + dx, 12, right - minWidth);
    else right = clamp(right + dx, left + minWidth, window.innerWidth - 12);
    if (start.corner.startsWith("n")) top = clamp(top + dy, 12, bottom - minHeight);
    else bottom = clamp(bottom + dy, top + minHeight, window.innerHeight - 12);
    setPosition({ left, top });
    setDimensions({ width: right - left, height: bottom - top });
  }
  function startResize(event: PointerEvent<HTMLElement>, corner: ResizeCorner) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const rect = panel.current!.getBoundingClientRect();
    resize.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, corner };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveResize(event: PointerEvent<HTMLElement>) {
    if (resize.current) resizeFrom(resize.current, event.clientX - resize.current.x, event.clientY - resize.current.y);
  }
  function stopResize() { resize.current = null; }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.target instanceof HTMLSelectElement) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); event.stopPropagation();
      onIndexChange(Math.max(0, Math.min(images.length - 1, index + (event.key === "ArrowLeft" ? -1 : 1))));
    }
  }
  if (!image) return null;
  return createPortal(<section ref={panel} className={`floating-image-viewer floating-image-${size}${dimensions ? " floating-image-custom" : ""}`} style={{ ...(position ? { left: position.left, top: position.top, right: "auto", bottom: "auto" } : {}), ...dimensions }} role="dialog" aria-modal="false" aria-label="圖片小視窗" tabIndex={-1} onKeyDown={keyboard}>
    <header className="floating-image-header">
      <button className="floating-image-drag" aria-label="移動圖片視窗" aria-description="拖曳或使用方向鍵微調位置" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const rect = panel.current!.getBoundingClientRect();
        move(rect.left + (event.key === "ArrowLeft" ? -20 : event.key === "ArrowRight" ? 20 : 0), rect.top + (event.key === "ArrowUp" ? -20 : event.key === "ArrowDown" ? 20 : 0));
      }}><GripHorizontal size={15}/><span>圖片</span></button>
      <div className="floating-image-sizes" role="group" aria-label="圖片視窗大小">{([['small', '小'], ['medium', '中'], ['large', '大']] as const).map(([value, label]) => <button key={value} aria-label={`${label}型圖片視窗`} aria-pressed={!dimensions && size === value} onClick={() => { setDimensions(null); onSizeChange(value); }}>{label}</button>)}</div>
      <button className="icon-btn" aria-label="關閉圖片小視窗" onClick={onClose}><X size={17}/></button>
    </header>
    <p className="floating-image-title" title={title}>{title}</p>
    <ViewerImage key={image.src} image={image} number={index + 1}/>
    <div className="floating-image-source"><span>{image.source}</span><a href={image.href} target="_blank" rel="noreferrer noopener">開啟原圖<ExternalLink size={12}/></a></div>
    <footer className="floating-image-navigation">
      <button aria-label="上一張圖片" disabled={index === 0} onClick={() => onIndexChange(index - 1)}><ChevronLeft size={17}/><span>上一張</span></button>
      <span aria-live="polite" aria-atomic="true">{index + 1} / {images.length}</span>
      <button aria-label="下一張圖片" disabled={index === images.length - 1} onClick={() => onIndexChange(index + 1)}><span>下一張</span><ChevronRight size={17}/></button>
    </footer>
    {(["nw", "ne", "sw"] as const).map(corner => <span key={corner} className={`floating-image-resize resize-${corner}`} aria-hidden="true" onPointerDown={event => startResize(event, corner)} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize}/>)}
    <button className="floating-image-resize resize-se" aria-label="調整圖片視窗大小" aria-description="拖曳角落調整寬高，或使用方向鍵調整" onPointerDown={event => startResize(event, "se")} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const rect = panel.current!.getBoundingClientRect();
      resizeFrom({ x: 0, y: 0, left: rect.left, top: rect.top, width: rect.width, height: rect.height, corner: "se" }, event.key === "ArrowLeft" ? -20 : event.key === "ArrowRight" ? 20 : 0, event.key === "ArrowUp" ? -20 : event.key === "ArrowDown" ? 20 : 0);
    }}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 10 10 3M7 10l3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg></button>
  </section>, document.body);
}
