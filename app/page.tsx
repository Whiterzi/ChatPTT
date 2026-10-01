"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, SquarePen, Search, ChevronDown, Plus, BookOpen, HelpCircle, ExternalLink, MessageSquare, ChevronRight, Copy, Check, PanelLeft, LoaderCircle, RefreshCw, Home as HomeIcon, PanelsTopLeft, History, AtSign, MoreHorizontal, ArrowUp, Folder, X } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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

export default function Home(){ return <SidebarProvider style={{"--sidebar-width":"18rem"} as React.CSSProperties}><ChatApp/></SidebarProvider>; }
function ChatApp(){
 const [sessions,setSessions]=useState<Session[]>([]), [active,setActive]=useState<string|null>(null);
 const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[quiet,setQuiet]=useState(false),[help,setHelp]=useState(false),[ageGate,setAgeGate]=useState(false),[adult,setAdult]=useState(false),[boardPicker,setBoardPicker]=useState(false),[suggestions,setSuggestions]=useState(["C_Chat","Tech_Job","Lifeismoney"]);
 const pending=useRef<null|(()=>void)>(null), request=useRef(0), busyRef=useRef(false), scroll=useRef<HTMLDivElement>(null), textarea=useRef<HTMLTextAreaElement>(null);
 const {toggleSidebar,setOpenMobile,setOpen}=useSidebar();
 const session=sessions.find(s=>s.id===active), messages=session?.messages??[], currentBoard=session?.board??"C_Chat";
 const [expanded,setExpanded]=useState<Record<string,boolean>>({}), [copied,setCopied]=useState<string|null>(null);
 const maskText=(text:string)=>quiet?boards.reduce((value,board)=>value.replace(new RegExp(board.id,"ig"),board.alias),text).replace(/PTT/g,"資料來源"):text;
 const label=(board:string)=>quiet?(boards.find(b=>b.id===board)?.alias??"主題研究"):board;
 useEffect(()=>{try{setAdult(localStorage.getItem("chatptt-adult")==="yes");setQuiet(localStorage.getItem("chatptt-quiet")==="yes");}catch{}},[]);
 useEffect(()=>{document.title=quiet?"Chat · 筆記與研究":"ChatPTT · 用對話逛 PTT";try{localStorage.setItem("chatptt-quiet",quiet?"yes":"no");}catch{}},[quiet]);
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!e.defaultPrevented&&!document.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')&&!ageGate&&!help&&!boardPicker)setQuiet(q=>!q);};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener);},[ageGate,help,boardPicker]);
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
 function openBoard(board:string,fresh=true){setBoardPicker(false);ageCheck(()=>load("board",board,{fresh}));}
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
 function focusSearch(){setInput("搜尋 ");setOpenMobile(false);requestAnimationFrame(()=>textarea.current?.focus());}
 const composer=<form className={`composer ${input.includes("\n")?"multiline":""}`} onSubmit={submit}>
  <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="composer-add icon-btn" aria-label="新增內容"><Plus size={23} strokeWidth={1.6}/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="composer-menu" onCloseAutoFocus={event=>event.preventDefault()}><DropdownMenuItem onSelect={()=>setBoardPicker(true)}><PanelsTopLeft/>瀏覽看板</DropdownMenuItem><DropdownMenuItem onSelect={focusSearch}><Search/>搜尋文章</DropdownMenuItem><DropdownMenuItem onSelect={()=>{setInput("");requestAnimationFrame(()=>textarea.current?.focus());}}><ExternalLink/>貼上文章網址</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>setHelp(true)}><HelpCircle/>使用說明</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  <textarea ref={textarea} aria-label="輸入瀏覽指令" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();runCommand(input);}}} placeholder={quiet?"問問 Chat":"問問 ChatPTT"} rows={input.includes("\n")?3:1} maxLength={400}/>
  <div className="composer-controls"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="source-picker" aria-label="選擇看板">{quiet?"標準":currentBoard}<ChevronDown size={13}/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end" className="composer-menu">{boards.map(b=><DropdownMenuItem key={b.id} onSelect={()=>openBoard(b.id)} disabled={busy}><span>{quiet?b.alias:b.id}</span><span className="menu-meta">{quiet?"":b.name}</span>{currentBoard===b.id&&<Check size={15}/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><button type="button" className="icon-btn composer-help" onClick={()=>setHelp(true)} aria-label="瀏覽指令說明"><HelpCircle size={19} strokeWidth={1.5}/></button><button className="send-button" type="submit" disabled={!input.trim()||busy} aria-label="送出">{busy?<LoaderCircle size={19} className="spinner"/>:<ArrowUp size={22} strokeWidth={2}/>}</button></div>
 </form>;
 return <>
 <nav className="app-rail" aria-label="應用程式導覽"><div className="rail-top"><button className="rail-button is-active" onClick={reset} aria-label="首頁" title="首頁"><HomeIcon size={19}/></button><button className="rail-button" onClick={()=>setBoardPicker(true)} aria-label="瀏覽看板" title="看板"><PanelsTopLeft size={19}/></button><button className="rail-button" onClick={()=>{setOpen(true);setOpenMobile(true);document.getElementById("recent-conversations")?.scrollIntoView({block:"nearest"});}} aria-label="最近對話" title="最近對話"><History size={19}/></button><button className="rail-button" onClick={focusSearch} aria-label="搜尋文章" title="搜尋"><AtSign size={19}/></button><button className="rail-button" onClick={()=>setHelp(true)} aria-label="更多選項" title="更多"><MoreHorizontal size={19}/></button></div><button className="rail-profile" onClick={()=>setHelp(true)} aria-label="我的閱讀空間">W</button></nav>
 <Sidebar className="chat-sidebar">
  <SidebarHeader className="side-top"><button className="sidebar-wordmark" onClick={reset}>{quiet?"Chat":"ChatPTT"}</button><div className="sidebar-tools"><button className="icon-btn" aria-label="搜尋" onClick={focusSearch}><Search size={18}/></button><button className="icon-btn" aria-label="收合側邊欄" onClick={toggleSidebar}><PanelLeft size={18}/></button></div></SidebarHeader>
  <SidebarContent className="side-content">
   <button className="nav-button" onClick={reset}><SquarePen size={17}/><span>新對話</span></button>
   <div className="side-section-heading"><span>{quiet?"專案":"看板"}</span><button className="icon-btn" onClick={()=>setBoardPicker(true)} aria-label="選擇其他看板"><Plus size={16}/></button></div>
   {boards.map(b=><button key={b.id} className={`board-nav ${currentBoard===b.id&&session?"selected":""}`} disabled={busy} onClick={()=>openBoard(b.id)}><Folder size={16}/><span>{quiet?b.alias:b.id}</span>{!quiet&&<small>{b.name}</small>}</button>)}
   <div className="side-section-heading history-label" id="recent-conversations"><span>最近項目</span><button className="icon-btn" onClick={reset} aria-label="開始新對話"><SquarePen size={16}/></button></div>
   {sessions.length?sessions.map((s,i)=><button key={s.id} className={`history-button ${s.id===active?"selected":""}`} onClick={()=>{request.current++;busyRef.current=false;setBusy(false);setActive(s.id);setOpenMobile(false);}}><span>{quiet?`${boards.find(b=>b.id===s.board)?.alias??"主題研究"} ${sessions.length-i}`:s.title}</span></button>):<div className="history-empty">尚無對話</div>}
  </SidebarContent>
 </Sidebar>
 <main className={`chat-main ${quiet?"quiet":""}`}>
  <header className="topbar"><div className="topbar-left"><button className="icon-btn" onClick={toggleSidebar} aria-label="切換側邊欄"><PanelLeft size={20}/></button><span className="mobile-wordmark">{quiet?"Chat":"ChatPTT"}</span></div><Tabs value={quiet?"work":"chat"} onValueChange={value=>setQuiet(value==="work")} className="mode-tabs"><TabsList aria-label="瀏覽模式"><TabsTrigger value="chat">對話</TabsTrigger><TabsTrigger value="work" title="低調模式：隱藏看板代號與推噓數">工作</TabsTrigger></TabsList></Tabs><button className="icon-btn new-chat-top" onClick={reset} aria-label="新對話" title="新對話"><MessageCircle size={19} strokeWidth={1.5}/></button></header>
  <div className={`conversation-scroll ${!session?"is-welcome":""}`} ref={scroll}>
   {!session?<section className="welcome"><h1>準備好了，隨時等你。</h1>{composer}<div className="suggestions">{suggestions.map((id,i)=>{const b=boards.find(b=>b.id===id)!;return <div className="suggestion-row" key={id}><button onClick={()=>openBoard(b.id)}><span className={`suggestion-icon tone-${i}`}>{i===0?<MessageSquare size={16}/>:i===1?<Folder size={16}/>:<BookOpen size={16}/>}</span><span>{quiet?`看看${b.alias}的最新討論。`:`${i===0?"看看":"找找"}${b.name}板最近有什麼新話題。`}</span></button><button className="dismiss-suggestion icon-btn" aria-label={`關閉${b.name}建議`} onClick={()=>setSuggestions(items=>items.filter(item=>item!==id))}><X size={14}/></button></div>;})}</div></section>:<div className="conversation">
   {messages.map(m=>m.role==="user"?<div className="user-message" key={m.id}><div>{maskText(m.text??"")}</div></div>:<article key={m.id} className="assistant-message"><div className="assistant-heading"><span className="assistant-avatar"><MessageCircle size={19}/></span><strong>{quiet?"Chat":"ChatPTT"}</strong>{m.board&&<span className="source-label">{quiet?"參考資料":`讀取自 ${m.board.board}`}</span>}{m.article&&<span className="source-label">{quiet?"文章內容":"PTT 原文"}</span>}</div>
    {m.text&&<div className={m.error?"error-message":"response-text"}><p>{m.text}</p>{m.retry&&<button className="text-action" onClick={m.retry} disabled={busy}><RefreshCw size={15}/>重新讀取</button>}</div>}
    {m.board&&<div className="board-response"><p className="response-intro">{m.board.query?<>找到與「<strong>{m.board.query}</strong>」相關的文章。</>:<>這是 <strong>{label(m.board.board)}</strong> 最近的討論，想先看哪一篇？</>}</p>{m.board.posts.length?<div className="article-list">{m.board.posts.map((post,i)=><button className="article-row" key={post.id} disabled={busy} onClick={()=>ageCheck(()=>load("article",m.board!.board,{article:post.id,prompt:post.title}))}><span className="row-number">{String(i+1).padStart(2,"0")}</span><span className="row-content"><span className="article-title">{post.title}</span><span className="article-meta">{!quiet&&<>{post.author}<span>·</span></>}{post.date}{post.pinned&&<span>置底</span>}</span></span>{!quiet&&<span className={`post-score ${post.score==="爆"||Number(post.score)>=50?"hot":""}`}>{post.score||"–"}</span>}<ChevronRight size={16} className="row-chevron"/></button>)}</div>:<div className="empty-result">沒有找到文章。換個關鍵字，或輸入其他看板試試。</div>}<div className="response-actions">{m.board.previous&&<button className="pill-action" disabled={busy} onClick={()=>ageCheck(()=>load("board",m.board!.board,{page:m.board!.previous!,query:m.board!.query,prompt:"再看一些文章"}))}><Plus size={15}/>再看一些</button>}{!quiet&&<a href={m.board.url} target="_blank" rel="noreferrer" className="text-action"><ExternalLink size={14}/>原始看板</a>}</div></div>}
    {m.article&&<div className="article-response"><h2>{m.article.title}</h2>{!quiet&&<p className="article-byline">{m.article.author} <span>·</span> {m.article.date}</p>}<div className="article-body"><RichText text={m.article.body}/></div><div className="article-tools"><button className={`pill-action ${expanded[m.id]?"active":""}`} onClick={()=>setExpanded(e=>({...e,[m.id]:!e[m.id]}))}><MessageSquare size={16}/>{expanded[m.id]?"收起討論":"大家怎麼說？"}<span>{m.article.comments.length}</span></button><button className="icon-btn" aria-label="複製文章" onClick={()=>copyArticle(m)}>{copied===m.id?<Check size={17}/>:<Copy size={17}/>}</button>{!quiet&&<a className="icon-btn" href={m.article.url} target="_blank" rel="noreferrer" aria-label="在 PTT 開啟原文"><ExternalLink size={17}/></a>}</div>{expanded[m.id]&&<section className="comments" id={`comments-${m.id}`}><p className="comments-note">推文依 PTT 網頁更新，可能有延遲。</p><div className="comments-heading"><h3>大家的回應</h3><span>{m.article.comments.length} 則</span></div>{m.article.comments.length?m.article.comments.map((c,i)=><div className="comment" key={i}><span className={`comment-tag ${c.tag==="推"?"up":c.tag==="噓"?"down":""}`}>{quiet?"·":c.tag}</span><div><span className="comment-user">{c.user}</span><p><RichText text={c.text}/></p></div><time>{c.time}</time></div>):<p className="empty-result">目前 PTT 網頁尚未提供推文，稍後重新開啟可查看更新。</p>}</section>}</div>}
   </article>)}
   {busy&&<div className="loading-response" role="status"><div><LoaderCircle size={18} className="spinner"/><span>正在讀取{quiet?"資料":" PTT"}…</span></div><Skeleton className="h-3 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>}
   </div>}
  </div>
  {session&&<div className="composer-area">{!busy&&<div className="followup-chips"><button onClick={()=>openBoard(currentBoard,false)}><RefreshCw size={14}/>看看最新</button>{latestBoard?.previous&&<button onClick={()=>runCommand("再多一點")}><Plus size={14}/>再多一點</button>}<button onClick={focusSearch}><Search size={14}/>找個話題</button></div>}{composer}<p className="composer-note">{quiet?"內容僅供參考，請核對原始資料。":"ChatPTT 可能無法即時取得更新，請核對 PTT 原文。"}</p></div>}

 </main>
 <Dialog open={boardPicker} onOpenChange={setBoardPicker}><DialogContent className="board-dialog"><DialogTitle>{quiet?"選擇研究主題":"選擇看板"}</DialogTitle><DialogDescription>選擇一個話題，或在輸入框填入其他英文看板名稱。</DialogDescription><div className="board-picker-grid">{boards.map(b=><button key={b.id} onClick={()=>openBoard(b.id)} disabled={busy}><Folder size={20}/><span><strong>{quiet?b.alias:b.id}</strong><small>{b.desc}</small></span></button>)}</div></DialogContent></Dialog>
 <Dialog open={ageGate} onOpenChange={value=>{setAgeGate(value);if(!value)pending.current=null;}}><DialogContent><DialogTitle>開始閱讀前</DialogTitle><DialogDescription className="dialog-copy">PTT 要求讀者確認年齡，部分看板可能包含成人內容。確認後，本瀏覽器會記住你的選擇。</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={()=>{setAgeGate(false);pending.current=null;}}>先返回</Button><Button onClick={()=>{setAdult(true);try{localStorage.setItem("chatptt-adult","yes");}catch{}setAgeGate(false);const action=pending.current;pending.current=null;action?.();}}>我已滿 18 歲，開始閱讀</Button></div></DialogContent></Dialog>
 <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle>把逛看板，變成一段對話。</DialogTitle><DialogDescription className="dialog-copy">ChatPTT 會讀取 PTT 公開網頁，保留文章和推文原文。這裡的聊天輸入是瀏覽指令，沒有串接 AI，也不會替你發文或推文。</DialogDescription><dl className="help-examples"><dt>看一下 C_Chat</dt><dd>打開看板的最新文章</dd><dt>搜尋 鋼彈</dt><dd>在目前看板搜尋文章標題</dd><dt>再多一點</dt><dd>繼續看前一頁的文章</dd><dt>大家怎麼說？</dt><dd>展開剛剛那篇文章的推文</dd><dt>貼上 PTT 文章網址</dt><dd>直接在對話裡閱讀</dd></dl><p className="help-footnote">上方「工作」會切換低調模式，隱藏看板代號與推噓數；按 Esc 也能切換。對話只保留於目前分頁。若 PTT 暫時無法連線，請稍後重試。</p></DialogContent></Dialog>
 </>;
}
