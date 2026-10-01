"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, SquarePen, Search, ChevronDown, Plus, Send, BookOpen, Eye, HelpCircle, ExternalLink, MessageSquare, ChevronRight, Copy, Check, Hash, PanelLeft, LoaderCircle, RefreshCw } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Post = { id:string; title:string; author:string; date:string; score:string; pinned:boolean };
type Comment = { tag:string; user:string; text:string; time:string };
type Article = { title:string; author:string; date:string; body:string; comments:Comment[]; url:string; board:string };
type BoardResult = { board:string; posts:Post[]; previous:string|null; query:string; url:string };
type Message = { id:string; role:"user"|"assistant"; text?:string; board?:BoardResult; article?:Article; error?:boolean; retry?:()=>void };
type Session = { id:string; title:string; messages:Message[]; board:string };
const boards = [ {id:"C_Chat",name:"西洽",alias:"動畫與遊戲",desc:"動畫、漫畫與遊戲"}, {id:"Gossiping",name:"八卦",alias:"今日話題",desc:"看看大家正在聊什麼"}, {id:"Tech_Job",name:"科技工作",alias:"職涯研究",desc:"工作日常與職涯"}, {id:"NBA",name:"NBA",alias:"運動觀察",desc:"籃球大小事"}, {id:"Lifeismoney",name:"省錢",alias:"生活提案",desc:"好康與生活情報"}, {id:"joke",name:"就可",alias:"靈感收集",desc:"讓今天輕鬆一點"} ];
const uid = () => crypto.randomUUID();
function RichText({text}:{text:string}) { return <>{text.split(/(https?:\/\/[^\s<>]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a>:part)}</>; }

export default function Home(){ return <SidebarProvider><ChatApp/></SidebarProvider>; }
function ChatApp(){
 const [sessions,setSessions]=useState<Session[]>([]), [active,setActive]=useState<string|null>(null);
 const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[quiet,setQuiet]=useState(false),[help,setHelp]=useState(false),[ageGate,setAgeGate]=useState(false),[adult,setAdult]=useState(false);
 const pending=useRef<null|(()=>void)>(null), request=useRef(0), busyRef=useRef(false), scroll=useRef<HTMLDivElement>(null), textarea=useRef<HTMLTextAreaElement>(null);
 const {toggleSidebar,setOpenMobile}=useSidebar();
 const session=sessions.find(s=>s.id===active), messages=session?.messages??[], currentBoard=session?.board??"C_Chat";
 const [expanded,setExpanded]=useState<Record<string,boolean>>({}), [copied,setCopied]=useState<string|null>(null);
 const maskText=(text:string)=>quiet?boards.reduce((value,board)=>value.replace(new RegExp(board.id,"ig"),board.alias),text).replace(/PTT/g,"資料來源"):text;
 const label=(board:string)=>quiet?(boards.find(b=>b.id===board)?.alias??"主題研究"):board;
 useEffect(()=>{try{setAdult(localStorage.getItem("chatptt-adult")==="yes");setQuiet(localStorage.getItem("chatptt-quiet")==="yes");}catch{}},[]);
 useEffect(()=>{document.title=quiet?"Chat · 筆記與研究":"ChatPTT · 用對話逛 PTT";try{localStorage.setItem("chatptt-quiet",quiet?"yes":"no");}catch{}},[quiet]);
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!ageGate&&!help)setQuiet(q=>!q);};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener);},[ageGate,help]);
 useEffect(()=>{const el=scroll.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});},[messages.length,busy]);
 function ageCheck(action:()=>void){if(adult){action();return;}pending.current=action;setAgeGate(true);}
 function reset(){request.current++;busyRef.current=false;setBusy(false);setActive(null);setInput("");setOpenMobile(false);textarea.current?.focus();}
 function append(id:string,message:Message){setSessions(all=>all.map(s=>s.id===id?{...s,messages:[...s.messages,message]}:s));}
 async function load(kind:"board"|"article",board:string,options:{page?:string;query?:string;article?:string;prompt?:string;fresh?:boolean}={}){
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);setOpenMobile(false);setInput("");
  const token=++request.current;
  let sid=active;
  const prompt=options.prompt??`看看 ${label(board)} 的最新文章`;
  if(!sid||options.fresh){sid=uid();setActive(sid);const s:Session={id:sid,title:prompt,board,messages:[]};setSessions(all=>[s,...all].slice(0,20));}
  const id=sid;
  append(id,{id:uid(),role:"user",text:prompt});
  setSessions(all=>all.map(s=>s.id===id?{...s,board}:s));
  try{
   const params=new URLSearchParams({board,adult:"1"});
   if(options.page)params.set("page",options.page);if(options.query)params.set("q",options.query);if(options.article)params.set("article",options.article);
   const response=await fetch(`/api/ptt?${params}`,{signal:AbortSignal.timeout(18000)});
   const data=await response.json() as BoardResult | Article | {error:string};if(!response.ok)throw new Error("error" in data?data.error:"暫時無法讀取，請稍後重試。");
   if(token!==request.current)return;
   append(id,{id:uid(),role:"assistant",...(kind==="board"?{board:data as BoardResult}:{article:data as Article})});
  }catch(error){if(token===request.current)append(id,{id:uid(),role:"assistant",text:error instanceof Error&&error.name!=="TimeoutError"?error.message:"PTT 回應較慢，請稍後再試。",error:true,retry:()=>ageCheck(()=>load(kind,board,options))});}
  finally{if(token===request.current){setBusy(false);busyRef.current=false;}}
 }
 function openBoard(board:string,fresh=true){ageCheck(()=>load("board",board,{fresh}));}
 function runCommand(raw:string){
  const text=raw.trim();if(!text||busyRef.current)return;
  const url=text.match(/^https:\/\/www\.ptt\.cc\/bbs\/([\w-]+)\/(M\.[\d]+\.A\.[\w]+)\.html/);
  if(url){ageCheck(()=>load("article",url[1],{article:url[2],prompt:"幫我打開這篇文章"}));return;}
  if(/^(大家怎麼說|推文|看推文|留言)[？?]?$/.test(text)){const last=[...messages].reverse().find(m=>m.article);if(last){setExpanded(e=>({...e,[last.id]:true}));setInput("");requestAnimationFrame(()=>document.getElementById(`comments-${last.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}));return;}}
  if(/^(下一頁|上一頁|再多一點|更多)[！!]?/.test(text)){const last=[...messages].reverse().find(m=>m.board);if(last?.board?.previous){ageCheck(()=>load("board",last.board!.board,{page:last.board!.previous!,query:last.board!.query,prompt:"再看一些文章"}));return;}}
  const known=boards.find(b=>text.toLowerCase().includes(b.id.toLowerCase())||text.includes(b.name)||text.includes(b.alias));
  const search=text.match(/(?:搜尋一下|搜尋|找一下|找找|找)\s*[:：]?\s*(.+)/);
  if(search){let term=search[1].trim();if(known)term=term.replace(new RegExp(known.id,"ig"),"").replace(known.name,"").trim();if(term){ageCheck(()=>load("board",known?.id??currentBoard,{query:term,prompt:text}));return;}}
  const custom=text.match(/^(?:看一下|看看|打開|看|\/)?\s*([A-Za-z][A-Za-z0-9_-]{0,29})(?:\s*(?:板|版|最新文章))?$/);
  if(known||custom){ageCheck(()=>load("board",known?.id??custom![1],{prompt:text}));return;}
  ageCheck(()=>load("board",currentBoard,{query:text,prompt:`在 ${label(currentBoard)} 搜尋「${text}」`}));
 }
 function submit(e:FormEvent){e.preventDefault();runCommand(input);}
 async function copyArticle(m:Message){try{await navigator.clipboard.writeText(`${m.article!.title}\n\n${m.article!.body}\n\n${m.article!.url}`);setCopied(m.id);setTimeout(()=>setCopied(null),1800);}catch{setCopied(null);}}
 const latestBoard=[...messages].reverse().find(m=>m.board)?.board;
 return <>
 <Sidebar className="chat-sidebar">
  <SidebarHeader className="side-top"><button className="brand-icon" onClick={reset} aria-label="回到首頁"><MessageCircle size={25}/></button><button className="icon-btn" aria-label="收合側邊欄" onClick={toggleSidebar}><PanelLeft size={19}/></button></SidebarHeader>
  <SidebarContent className="side-content">
   <button className="nav-button" onClick={reset}><SquarePen size={19}/><span>新對話</span></button>
   <button className="nav-button" onClick={()=>{setInput("搜尋 ");textarea.current?.focus();setOpenMobile(false);}}><Search size={19}/><span>{quiet?"搜尋資料":"搜尋文章"}</span></button>
   <div className="side-label">{quiet?"研究主題":"常逛看板"}</div>
   {boards.map(b=><button key={b.id} className={`board-nav ${currentBoard===b.id&&session?"selected":""}`} disabled={busy} onClick={()=>openBoard(b.id)}><Hash size={16}/><span>{quiet?b.alias:b.id}</span>{!quiet&&<small>{b.name}</small>}</button>)}
   <div className="side-label history-label">本次對話</div>
   {sessions.length?sessions.map((s,i)=><button key={s.id} className={`history-button ${s.id===active?"selected":""}`} onClick={()=>{request.current++;busyRef.current=false;setBusy(false);setActive(s.id);setOpenMobile(false);}}><MessageSquare size={15}/><span>{quiet?`${boards.find(b=>b.id===s.board)?.alias??"主題研究"} ${sessions.length-i}`:s.title}</span></button>):<div className="history-empty">想看的話題，會留在這裡。</div>}
  </SidebarContent>
  <SidebarFooter className="side-footer"><div className="profile-avatar">W</div><div><strong>我的閱讀空間</strong><span>{quiet?"個人工作區":"不用登入 PTT，也能逛"}</span></div><button className="icon-btn" onClick={()=>setHelp(true)} aria-label="使用說明"><HelpCircle size={18}/></button></SidebarFooter>
 </Sidebar>
 <main className={`chat-main ${quiet?"quiet":""}`}>
  <header className="topbar"><div className="topbar-left"><button className="icon-btn" onClick={toggleSidebar} aria-label="切換側邊欄"><PanelLeft size={21}/></button><button className="wordmark" onClick={()=>setHelp(true)}>{quiet?"Chat":"ChatPTT"}<ChevronDown size={17}/></button>{session&&<span className="board-context">{label(currentBoard)}</span>}</div><div className="mode-control"><Eye size={16}/><label htmlFor="quiet-mode">低調模式</label><Switch id="quiet-mode" checked={quiet} onCheckedChange={setQuiet}/></div></header>
  <div className={`conversation-scroll ${!session?"is-welcome":""}`} ref={scroll}>
   {!session?<section className="welcome"><div className="welcome-symbol"><MessageCircle size={30} strokeWidth={1.6}/><span className="symbol-dot"/></div><p className="welcome-kicker">{quiet?"YOUR EVERYDAY COMPANION":"A DIFFERENT WAY TO PTT"}</p><h1>今天，想看點什麼？</h1><p className="welcome-description">從一個話題開始，慢慢往下聊。</p><div className="suggestions">{[boards[0],boards[1],boards[2],boards[4]].map((b,i)=><button key={b.id} onClick={()=>openBoard(b.id)}><span className={`suggestion-icon tone-${i}`}>{i===0?<MessageSquare size={18}/>:i===1?<BookOpen size={18}/>:i===2?<Search size={18}/>:<Plus size={18}/>}</span><strong>{quiet?b.alias:`聊聊${b.name}`}</strong><span>{b.desc}</span></button>)}</div></section>:<div className="conversation">
   {messages.map(m=>m.role==="user"?<div className="user-message" key={m.id}><div>{maskText(m.text??"")}</div></div>:<article key={m.id} className="assistant-message"><div className="assistant-heading"><span className="assistant-avatar"><MessageCircle size={19}/></span><strong>{quiet?"Chat":"ChatPTT"}</strong>{m.board&&<span className="source-label">{quiet?"參考資料":`讀取自 ${m.board.board}`}</span>}{m.article&&<span className="source-label">{quiet?"文章內容":"PTT 原文"}</span>}</div>
    {m.text&&<div className={m.error?"error-message":"response-text"}><p>{m.text}</p>{m.retry&&<button className="text-action" onClick={m.retry} disabled={busy}><RefreshCw size={15}/>重新讀取</button>}</div>}
    {m.board&&<div className="board-response"><p className="response-intro">{m.board.query?<>找到與「<strong>{m.board.query}</strong>」相關的文章。</>:<>這是 <strong>{label(m.board.board)}</strong> 最近的討論，想先看哪一篇？</>}</p>{m.board.posts.length?<div className="article-list">{m.board.posts.map((post,i)=><button className="article-row" key={post.id} disabled={busy} onClick={()=>ageCheck(()=>load("article",m.board!.board,{article:post.id,prompt:post.title}))}><span className="row-number">{String(i+1).padStart(2,"0")}</span><span className="row-content"><span className="article-title">{post.title}</span><span className="article-meta">{!quiet&&<>{post.author}<span>·</span></>}{post.date}{post.pinned&&<span>置底</span>}</span></span>{!quiet&&<span className={`post-score ${post.score==="爆"||Number(post.score)>=50?"hot":""}`}>{post.score||"–"}</span>}<ChevronRight size={16} className="row-chevron"/></button>)}</div>:<div className="empty-result">沒有找到文章。換個關鍵字，或輸入其他看板試試。</div>}<div className="response-actions">{m.board.previous&&<button className="pill-action" disabled={busy} onClick={()=>ageCheck(()=>load("board",m.board!.board,{page:m.board!.previous!,query:m.board!.query,prompt:"再看一些文章"}))}><Plus size={15}/>再看一些</button>}{!quiet&&<a href={m.board.url} target="_blank" rel="noreferrer" className="text-action"><ExternalLink size={14}/>原始看板</a>}</div></div>}
    {m.article&&<div className="article-response"><h2>{m.article.title}</h2>{!quiet&&<p className="article-byline">{m.article.author} <span>·</span> {m.article.date}</p>}<div className="article-body"><RichText text={m.article.body}/></div><div className="article-tools"><button className={`pill-action ${expanded[m.id]?"active":""}`} onClick={()=>setExpanded(e=>({...e,[m.id]:!e[m.id]}))}><MessageSquare size={16}/>{expanded[m.id]?"收起討論":"大家怎麼說？"}<span>{m.article.comments.length}</span></button><button className="icon-btn" aria-label="複製文章" onClick={()=>copyArticle(m)}>{copied===m.id?<Check size={17}/>:<Copy size={17}/>}</button>{!quiet&&<a className="icon-btn" href={m.article.url} target="_blank" rel="noreferrer" aria-label="在 PTT 開啟原文"><ExternalLink size={17}/></a>}</div>{expanded[m.id]&&<section className="comments" id={`comments-${m.id}`}><p className="comments-note">推文依 PTT 網頁更新，可能有延遲。</p><div className="comments-heading"><h3>大家的回應</h3><span>{m.article.comments.length} 則</span></div>{m.article.comments.length?m.article.comments.map((c,i)=><div className="comment" key={i}><span className={`comment-tag ${c.tag==="推"?"up":c.tag==="噓"?"down":""}`}>{quiet?"·":c.tag}</span><div><span className="comment-user">{c.user}</span><p><RichText text={c.text}/></p></div><time>{c.time}</time></div>):<p className="empty-result">目前 PTT 網頁尚未提供推文，稍後重新開啟可查看更新。</p>}</section>}</div>}
   </article>)}
   {busy&&<div className="loading-response" role="status"><div><LoaderCircle size={18} className="spinner"/><span>正在讀取{quiet?"資料":" PTT"}…</span></div><Skeleton className="h-3 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>}
   </div>}
  </div>
  <div className={`composer-area ${!session?"welcome-composer":""}`}>{session&&!busy&&<div className="followup-chips"><button onClick={()=>openBoard(currentBoard,false)}><RefreshCw size={13}/>看看最新</button>{latestBoard?.previous&&<button onClick={()=>runCommand("再多一點")}><Plus size={13}/>再多一點</button>}<button onClick={()=>{setInput("搜尋 ");textarea.current?.focus();}}><Search size={13}/>找個話題</button></div>}<form className="composer" onSubmit={submit}><textarea ref={textarea} aria-label="輸入瀏覽指令" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();runCommand(input);}}} placeholder={quiet?"傳送訊息…":"輸入看板、搜尋關鍵字，或貼上 PTT 文章網址…"} rows={1} maxLength={400}/><div className="composer-bottom"><button type="button" className="composer-source" onClick={()=>setHelp(true)}><BookOpen size={16}/>{quiet?"資料來源":"PTT 公開文章"}</button><span className="composer-key">Enter 送出</span><button className="send-button" type="submit" disabled={!input.trim()||busy} aria-label="送出">{busy?<LoaderCircle size={17} className="spinner"/>:<Send size={17}/>}</button></div></form><p className="composer-note">{quiet?"內容僅供參考，請核對原始資料。":"真實 PTT 內容，非 AI 生成。ChatPTT 與 OpenAI、PTT 無隸屬關係。"}</p></div>
 </main>
 <Dialog open={ageGate} onOpenChange={value=>{setAgeGate(value);if(!value)pending.current=null;}}><DialogContent><DialogTitle>開始閱讀前</DialogTitle><DialogDescription className="dialog-copy">PTT 要求讀者確認年齡，部分看板可能包含成人內容。確認後，本瀏覽器會記住你的選擇。</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={()=>{setAgeGate(false);pending.current=null;}}>先返回</Button><Button onClick={()=>{setAdult(true);try{localStorage.setItem("chatptt-adult","yes");}catch{}setAgeGate(false);const action=pending.current;pending.current=null;action?.();}}>我已滿 18 歲，開始閱讀</Button></div></DialogContent></Dialog>
 <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle>把逛看板，變成一段對話。</DialogTitle><DialogDescription className="dialog-copy">ChatPTT 會讀取 PTT 公開網頁，保留文章和推文原文。這裡的聊天輸入是瀏覽指令，沒有串接 AI，也不會替你發文或推文。</DialogDescription><dl className="help-examples"><dt>看一下 C_Chat</dt><dd>打開看板的最新文章</dd><dt>搜尋 鋼彈</dt><dd>在目前看板搜尋文章標題</dd><dt>再多一點</dt><dd>繼續看前一頁的文章</dd><dt>大家怎麼說？</dt><dd>展開剛剛那篇文章的推文</dd><dt>貼上 PTT 文章網址</dt><dd>直接在對話裡閱讀</dd></dl><p className="help-footnote">低調模式會隱藏看板代號與推噓數；按 Esc 快速切換。對話只保留於目前分頁。若 PTT 暫時無法連線，請稍後重試。</p></DialogContent></Dialog>
 </>;
}
