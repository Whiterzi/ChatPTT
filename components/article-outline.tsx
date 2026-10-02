import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, List, X } from "lucide-react";

type OutlinePost = { id: string; title: string; author: string; date: string; score: string; preview?: string };

export function ArticleOutline({ board, posts, activeId, quiet, busy, onSelect, onReturn }: {
  board: string; posts: OutlinePost[]; activeId?: string; quiet: boolean; busy: boolean;
  onSelect: (id: string) => void; onReturn: () => void;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null), [mobileOpen, setMobileOpen] = useState(false);
  const [placement, setPlacement] = useState({ top: 0, width: 460 });
  const root = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLElement>(null), preview = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>()), lastTrigger = useRef<HTMLButtonElement | null>(null), skipFocus = useRef(false);
  const panelId = useId(), previewPanelId = useId();
  const previewIndex = posts.findIndex(post => post.id === previewId), post = posts[previewIndex];
  const open = !!post || mobileOpen;
  function close(restoreFocus = false) {
    setPreviewId(null); setMobileOpen(false);
    if (restoreFocus) { skipFocus.current = true; lastTrigger.current?.focus({ preventScroll: true }); skipFocus.current = false; }
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); close(true); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  useEffect(() => {
    if (!mobileOpen) return;
    const selected = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (selected && list.current) list.current.scrollTop = Math.max(0, selected.offsetTop - list.current.offsetTop - list.current.clientHeight / 2);
  }, [mobileOpen]);
  useLayoutEffect(() => {
    if (!previewId) return;
    const place = () => {
      const rail = root.current?.getBoundingClientRect(), marker = markers.current.get(previewId)?.getBoundingClientRect(), card = preview.current?.getBoundingClientRect();
      if (!rail || !marker || !card) return;
      const width = Math.min(460, window.innerWidth - rail.right - 16);
      const top = Math.max(12 - rail.top, Math.min(marker.top + marker.height / 2 - rail.top - card.height / 2, window.innerHeight - rail.top - card.height - 12));
      setPlacement(current => current.top === top && current.width === width ? current : { top, width });
    };
    place();
    const observer = new ResizeObserver(place);
    if (preview.current) observer.observe(preview.current);
    if (root.current?.parentElement) observer.observe(root.current.parentElement);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); };
  }, [previewId]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const reset = () => close();
    media.addEventListener("change", reset);
    return () => media.removeEventListener("change", reset);
  }, []);
  function show(postId: string, button: HTMLButtonElement) { lastTrigger.current = button; setPreviewId(postId); }
  function select(postId: string) { close(); onSelect(postId); }
  return <aside ref={root} className={`article-outline ${open ? "is-open" : ""}`} aria-label="本頁文章導覽" data-article-outline={open ? "open" : "closed"} onPointerLeave={() => setPreviewId(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <nav className="article-outline-rail" aria-label="本頁文章目錄" onScroll={() => setPreviewId(null)}>
      {posts.map((item, index) => {
        const distance = previewIndex < 0 ? Infinity : Math.abs(index - previewIndex);
        const width = distance === 0 ? 28 : distance === 1 ? 21 : distance === 2 ? 15 : distance === 3 ? 10 : item.id === activeId ? 12 : 6;
        return <button key={`${item.id}:${index}`} ref={node => { if (node) markers.current.set(item.id, node); else markers.current.delete(item.id); }} className={`article-outline-marker ${item.id === previewId ? "is-previewed" : ""}`} aria-label={`第 ${index + 1} 篇：${item.title}`} aria-current={item.id === activeId ? "page" : undefined} aria-expanded={item.id === previewId} aria-controls={item.id === previewId ? previewPanelId : undefined} disabled={busy} onPointerEnter={event => { if (event.pointerType === "mouse") show(item.id, event.currentTarget); }} onFocus={event => { if (!skipFocus.current) show(item.id, event.currentTarget); }} onClick={() => select(item.id)}><span aria-hidden="true" style={{ width }}/></button>;
      })}
    </nav>
    {post && <div ref={preview} className="article-outline-preview" id={previewPanelId} style={placement}>
      <div className="outline-preview-card">
        <button className="outline-preview-open" disabled={busy} onClick={() => select(post.id)} aria-label={`開啟文章：${post.title}`}>
          <span className="outline-preview-heading"><strong>{post.title}</strong><ArrowUpRight size={17}/></span>
          <p>{post.preview || (quiet ? post.date : `${post.author} · ${post.date} · 推文分數 ${post.score || "0"}`)}</p>
        </button>
        <footer><button onClick={() => { close(); onReturn(); }}><ArrowLeft size={13}/>回到文章列表</button><span>{board} · {previewIndex + 1} / {posts.length}</span></footer>
      </div>
    </div>}
    <button ref={trigger} className="article-outline-trigger" aria-label="本頁文章目錄" aria-expanded={mobileOpen} aria-controls={panelId} onClick={() => { lastTrigger.current = trigger.current; setMobileOpen(!mobileOpen); }}><List size={16}/><span>本頁文章</span></button>
    {mobileOpen && <div className="article-outline-panel" id={panelId}>
      <header><div><strong>本頁文章</strong><span>{board} · {posts.length} 篇</span></div><button className="icon-btn" aria-label="收起文章目錄" onClick={() => close(true)}><X size={16}/></button></header>
      <button className="article-outline-return" onClick={() => { close(); onReturn(); }}><ArrowLeft size={14}/>回到文章列表</button>
      <nav ref={list} aria-label="這一頁的文章"><ol>{posts.map((item, index) => <li key={`${item.id}:${index}`}><button disabled={busy} aria-current={item.id === activeId ? "page" : undefined} onClick={() => select(item.id)}>
        <span className="outline-number">{String(index + 1).padStart(2, "0")}</span><span className="outline-post"><span>{item.title}</span><small>{quiet ? item.date : `${item.author} · ${item.date}`}</small></span>
        {!quiet && <span className="outline-score">{item.score || "–"}</span>}
      </button></li>)}</ol></nav>
    </div>}
  </aside>;
}
