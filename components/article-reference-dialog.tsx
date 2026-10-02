import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseArticleReference, type ArticleReference } from "@/lib/article-reference";

export function ArticleReferenceDialog({ open, initial, board, busy, onOpenChange, onRead, onReadSeparately }: {
  open: boolean; initial: string; board: string; busy: boolean;
  onOpenChange: (open: boolean) => void; onRead: (reference: ArticleReference) => void;
  onReadSeparately: (reference: ArticleReference) => void;
}) {
  const [value, setValue] = useState(initial), [selectedBoard, setSelectedBoard] = useState(board), [copied, setCopied] = useState("");
  useEffect(() => { if (open) { setValue(initial); setSelectedBoard(board); setCopied(""); } }, [open, initial, board]);
  const reference = parseArticleReference(value, selectedBoard);
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setCopied(text); } catch { setCopied(""); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="article-reference-dialog"><DialogTitle>開啟文章／轉換代碼</DialogTitle><DialogDescription>貼上 PTT 一般文章、精華區網址或 # 開頭的 AID，即可閱讀。一般文章可與 AID 互相轉換。</DialogDescription>
    <form className="search-form" onSubmit={event => { event.preventDefault(); if (reference && !busy) { onOpenChange(false); onRead(reference); } }}>
      <label>文章網址或代碼<input autoFocus value={value} onChange={event => { setValue(event.target.value); setCopied(""); }} placeholder="貼上 PTT 網址或 #文章代碼" maxLength={600}/></label>
      {(!reference || !reference.explicitBoard) && !/^https?:\/\//i.test(value.trim()) && <label>看板<input value={selectedBoard} onChange={event => setSelectedBoard(event.target.value.trim())} placeholder="例如 C_Chat" maxLength={30}/><span className="search-hint">AID 不包含看板名稱，請確認要開啟的看板。</span></label>}
      {reference ? <div className="article-reference-result"><span>{reference.board}{reference.archivePath?" · 精華區":""}</span><label>文章網址<span><input aria-label="轉換後的文章網址" value={reference.url} readOnly/><button type="button" aria-label="複製文章網址" onClick={() => copy(reference.url)}>{copied === reference.url ? <Check size={15}/> : <Copy size={15}/>}</button></span></label>{reference.aid && <label>文章代碼<span><input aria-label="轉換後的文章代碼" value={`${reference.aid} (${reference.board})`} readOnly/><button type="button" aria-label="複製文章代碼" onClick={() => copy(`${reference.aid} (${reference.board})`)}>{copied === `${reference.aid} (${reference.board})` ? <Check size={15}/> : <Copy size={15}/>}</button></span></label>}{reference.archivePath&&<p className="search-hint">精華區的收藏路徑無法用一般 AID 表示，請使用完整網址開啟或分享。</p>}<span className="sr-only" role="status">{copied ? "已複製" : ""}</span></div> : value.trim() && <p className="search-hint" role="status">請確認文章網址或 8 碼 AID，以及正確的英文看板名稱。支援 PTT 一般文章與精華區文章網址。</p>}
      <div className="dialog-actions"><Button type="button" variant="outline" disabled={!reference || busy} onClick={() => { if (reference) { onOpenChange(false); onReadSeparately(reference); } }}>獨立開啟</Button><Button type="submit" disabled={!reference || busy}>在這裡閱讀</Button></div>
    </form>
  </DialogContent></Dialog>;
}
