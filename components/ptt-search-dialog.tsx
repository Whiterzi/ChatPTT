import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SearchFilters } from "@/lib/search";

export type SearchDraft = SearchFilters & { board: string; query: string };
export function PttSearchDialog({ open, onOpenChange, initial, onSearch, busy }: { open: boolean; onOpenChange: (open: boolean) => void; initial: SearchDraft; onSearch: (draft: SearchDraft) => void; busy: boolean }) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => { if (open) setDraft(initial); }, [open, initial]);
  function submit(event: FormEvent) { event.preventDefault(); onSearch({ board: draft.board.trim(), query: draft.query.trim(), author: draft.author?.trim(), minScore: draft.minScore }); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="search-dialog"><DialogTitle>搜尋文章</DialogTitle><DialogDescription>標題、作者與推文分數可以一起使用，搜尋這個看板的文章。</DialogDescription>
    <form className="search-form" onSubmit={submit}>
      <label>看板<input required pattern="[A-Za-z][A-Za-z0-9_-]{0,29}" maxLength={30} value={draft.board} onChange={e => setDraft(d => ({ ...d, board: e.target.value }))} placeholder="C_Chat" autoComplete="off"/></label>
      <label>標題關鍵字<input maxLength={150} value={draft.query} onChange={e => setDraft(d => ({ ...d, query: e.target.value }))} placeholder="例如：鋼彈，可留空"/></label>
      <div className="search-fields-row"><label>作者帳號<input pattern="[A-Za-z][A-Za-z0-9_]{0,29}" maxLength={30} value={draft.author || ""} onChange={e => setDraft(d => ({ ...d, author: e.target.value }))} placeholder="完整帳號，可留空" autoComplete="off"/></label>
      <label>最低推文分數<input type="number" min={-100} max={100} step={1} value={draft.minScore ?? ""} onChange={e => setDraft(d => ({ ...d, minScore: e.target.value }))} placeholder="不限"/></label></div>
      <p className="search-hint">分數採 PTT 的「推減噓」，不是留言總則數。填 100 可找爆文；留空表示不限。結果依時間由新到舊排列。</p>
      <div className="search-presets"><span>快速選擇</span>{[10, 50, 100].map(n => <button key={n} type="button" aria-pressed={draft.minScore === String(n)} onClick={() => setDraft(d => ({ ...d, minScore: String(n) }))}>{n === 100 ? "爆文" : `${n} 推以上`}</button>)}</div>
      <div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setDraft(d => ({ ...d, query: "", author: "", minScore: "" }))}>清除條件</Button><Button type="submit" disabled={busy}>搜尋</Button></div>
    </form>
  </DialogContent></Dialog>;
}
