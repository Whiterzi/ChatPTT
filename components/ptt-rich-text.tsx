import { useState } from "react";
import { PreviewMedia } from "@/components/preview-media";
import { parseArticleReference } from "@/lib/article-reference";
import { articleTextSections } from "@/lib/article-text";
import { imagePreviewUrl, imageSizes, splitImageLinks, cleanImageLink, type ImageMode, type ImageSize } from "@/lib/image-links";

type ImageOptions = { mode: ImageMode; defaultSize: ImageSize; quiet: boolean; floating: boolean; onOpenImage: (href: string) => void; onOpenArticle?: (reference: string) => void };

function ImageLink({ href, mode, defaultSize, quiet, floating, onOpenImage, onOpenArticle }: ImageOptions & { href: string }) {
  const src = imagePreviewUrl(href);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = !quiet && !floating && (visible ?? mode !== "links");
  const actualSize = size || defaultSize;
  return <span className="image-link">
    <a href={href} target="_blank" rel="noreferrer noopener">{href}</a>
    {onOpenArticle && parseArticleReference(href) && <button type="button" className="read-article-link" onClick={() => onOpenArticle(href)}>在這裡閱讀</button>}
    {src && !quiet && <span className="image-link-controls">
      {!floating && <button type="button" aria-expanded={shown} onClick={() => { setVisible(!shown); setFailed(false); }}>{shown ? "隱藏圖片" : "顯示圖片"}</button>}
      {shown && <select aria-label="這張圖片的大小" value={actualSize} onChange={e => setSize(e.target.value as ImageSize)}><option value="small">小</option><option value="medium">中</option><option value="large">大</option></select>}
      <button type="button" onClick={() => onOpenImage(href)}>在小視窗看</button>
    </span>}
    {src && shown && <span className={`image-preview image-${actualSize}`} style={{ maxWidth: imageSizes[actualSize] }}>
      {failed ? <span className="image-unavailable">無法預覽，可能是格式不受瀏覽器支援、連結失效或圖床限制外連。可點上方連結開啟。</span> : <PreviewMedia src={src} href={href} alt="文章附圖" lazy onError={() => setFailed(true)}/>}
    </span>}
  </span>;
}

export function RichText({ text, mutedMetadata=false, ...options }: ImageOptions & { text: string; mutedMetadata?:boolean }) {
  if(mutedMetadata)return <>{articleTextSections(text).map((part,i)=><span key={i} className={part.metadata?"article-source-note":undefined}><RichText text={part.text} {...options} onOpenArticle={part.metadata?undefined:options.onOpenArticle}/></span>)}</>;
  return <>{splitImageLinks(text).map((part, i) => {
    if (!/^https?:\/\//.test(part)) return part;
    const href = cleanImageLink(part);
    return <span key={i}><ImageLink key={`${options.mode}:${options.defaultSize}:${options.floating}`} href={href} {...options}/>{part.slice(href.length)}</span>;
  })}</>;
}
