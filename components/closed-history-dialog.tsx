import { FileText, MessageSquare, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ClosedSession } from '@/lib/chat-types';

export function ClosedHistoryDialog({open,onOpenChange,items,onRestore,quiet,full}:{open:boolean;onOpenChange:(value:boolean)=>void;items:ClosedSession[];onRestore:(id:string)=>void;quiet:boolean;full:boolean}) {
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="closed-history-dialog">
  <DialogTitle>最近關閉</DialogTitle>
  <DialogDescription>保留最近 20 個已關閉對話，點選即可重新開啟。{full&&'目前已開啟 20 個對話，請先關閉一個。'}</DialogDescription>
  {items.length?<ul className="closed-history-list">{items.map(item=><li key={item.session.id}><button onClick={()=>onRestore(item.session.id)} disabled={full}>
   {item.session.articleKey?<FileText size={17}/>:<MessageSquare size={17}/>}
   <span className="closed-history-copy"><strong>{quiet?'閱讀項目':item.session.title}</strong><small>{!quiet&&`${item.session.board} · `}<time dateTime={new Date(item.closedAt).toISOString()}>{new Date(item.closedAt).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}</time></small></span>
   <Undo2 size={16} aria-label="重新開啟"/>
  </button></li>)}</ul>:<p className="closed-history-empty">尚無關閉紀錄。關閉對話後，會出現在這裡。</p>}
 </DialogContent></Dialog>;
}
