"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ClipboardEvent } from "react";
import { MessageCircle, SquarePen, Search, ChevronDown, Plus, BookOpen, HelpCircle, ExternalLink, MessageSquare, ChevronRight, Copy, Check, PanelLeft, LoaderCircle, RefreshCw, PanelsTopLeft, History, AtSign, MoreHorizontal, ArrowUp, Folder, X, Bell, Files, Image as ImageIcon, ArrowLeft, List, Hash, Link as LinkIcon, FileText, SquareArrowOutUpRight, Trash2, Undo2 } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ptt-rich-text";
import { PttSearchDialog, type SearchDraft } from "@/components/ptt-search-dialog";
import { parseSearchCommand, searchDescription, type SearchFilters } from "@/lib/search";
import { articleImages, imagePreviewUrl, type ImageMode } from "@/lib/image-links";
import { ImagePreferenceFields, ImageSettingsDialog, useImagePreferences } from "@/components/image-preferences";
import { FloatingImageViewer } from "@/components/floating-image-viewer";
import { ArticleOutline } from "@/components/article-outline";
import { articleMatches, readingContext } from "@/lib/reading-navigation";
import { ArticleReferenceDialog } from "@/components/article-reference-dialog";
import { parseArticleReference, type ArticleReference } from "@/lib/article-reference";
import { SITE } from "@/lib/site.mjs";

import type { Post, Article, BoardResult, Message, Session, LoadOptions, ReadingFocus, SessionView, Workspace } from "@/lib/chat-types";
import { useWorkspaceStorage } from "@/hooks/use-workspace-storage";
import { closeWorkspaceSession, WORKSPACE_KEY } from "@/lib/workspace-storage";
import { parseChatCommand, commandHints, type ChatCommand } from "@/lib/chat-commands";

const boards = [ {id:"C_Chat",name:"西洽",alias:"動畫與遊戲",desc:"動畫、漫畫與遊戲"}, {id:"Gossiping",name:"八卦",alias:"今日話題",desc:"看看大家正在聊什麼"}, {id:"Tech_Job",name:"科技工作",alias:"職涯研究",desc:"工作日常與職涯"}, {id:"NBA",name:"NBA",alias:"運動觀察",desc:"籃球大小事"}, {id:"Lifeismoney",name:"省錢",alias:"生活提案",desc:"好康與生活情報"}, {id:"joke",name:"就可",alias:"靈感收集",desc:"讓今天輕鬆一點"} ];
const uid = () => crypto.randomUUID();


export default function Home(){ return <SidebarProvider style={{"--sidebar-width":"18rem"} as React.CSSProperties}><ChatApp/></SidebarProvider>; }
function ChatApp(){
 const [sessions,setSessions]=useState<Session[]>([]), [active,setActive]=useState<string|null>(null);
 const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[quiet,setQuiet]=useState(false),[help,setHelp]=useState(false),[ageGate,setAgeGate]=useState(false),[adult,setAdult]=useState(false),[boardPicker,setBoardPicker]=useState(false),[suggestions,setSuggestions]=useState(["C_Chat","Tech_Job","Lifeismoney"]);
 const [searchOpen,setSearchOpen]=useState(false),[searchSeed,setSearchSeed]=useState<SearchDraft>({board:"C_Chat",query:""});
 const {preferences:imageSettings,change:changeImages,saved:imagesSaved}=useImagePreferences();
 const [imageSettingsOpen,setImageSettingsOpen]=useState(false),[gallery,setGallery]=useState<{sessionId:string|null;articleId:string;index:number}|null>(null);
 const [referenceOpen,setReferenceOpen]=useState(false),[referenceSeed,setReferenceSeed]=useState("");
 const galleryTrigger=useRef<HTMLElement|null>(null);
 const [readingFocus,setReadingFocus]=useState<ReadingFocus|null>(null);
 const imageMode:ImageMode=imageSettings.display==="inline"?imageSettings.size:"links";
 const pending=useRef<null|(()=>void)>(null), request=useRef(0), busyRef=useRef(false), scroll=useRef<HTMLDivElement>(null), textarea=useRef<HTMLTextAreaElement>(null);
 const {toggleSidebar,setOpenMobile,setOpen,open:sidebarOpen}=useSidebar();
 const [clearOpen,setClearOpen]=useState(false),[notice,setNotice]=useState("");
 const [closed,setClosed]=useState<{session:Session;index:number;view?:SessionView}|null>(null);
 const views=useRef<Record<string,SessionView>>({}),restorePosition=useRef<{sessionId:string;view:SessionView}|null>(null);
 const commandRunning=useRef(false),requestAbort=useRef<AbortController|null>(null);
 const session=sessions.find(s=>s.id===active), messages=session?.messages??[], currentBoard=session?.board??"C_Chat";
 const focus=readingFocus?.sessionId===active?readingFocus:null;
 const {reading:readingMessage,list:outlineMessage}=readingContext(messages,focus?.messageId,focus?.listId);
 const outlineBoard=outlineMessage?.board;
 const outlinePosts=useMemo(()=>outlineBoard?.posts.map(post=>{
  const article=messages.find(m=>m.article?.board===outlineBoard.board&&articleMatches(m.article.url,outlineBoard.board,post.id))?.article;
  return {...post,preview:article?.body.replace(/https?:\/\/\S+/g,"").replace(/\s+/g," ").trim().slice(0,240)};
 })??[],[outlineBoard,session?.messages]);
 const outlinePostId=readingMessage?.article?outlineBoard?.posts.find(p=>articleMatches(readingMessage.article!.url,outlineBoard.board,p.id))?.id:undefined;
 const [expanded,setExpanded]=useState<Record<string,boolean>>({}), [copied,setCopied]=useState<string|null>(null);
 const workspaceState=useMemo(()=>({version:1 as const,sessions,active,input,readingFocus,expanded,sidebarOpen}),[sessions,active,input,readingFocus,expanded,sidebarOpen]);
 const storage=useWorkspaceStorage(workspaceState,captureViews,restoreWorkspace);
 function captureViews(draft?:string){
  const el=scroll.current;
  if(active&&restorePosition.current?.sessionId===active)views.current[active]={...restorePosition.current.view,draft:draft??(commandRunning.current?"":input),focus:focus??undefined};
  if(active&&el&&restorePosition.current?.sessionId!==active){
   const top=el.getBoundingClientRect().top;
   const anchor=Array.from(el.querySelectorAll<HTMLElement>(".assistant-message")).find(node=>node.getBoundingClientRect().bottom>top);
   views.current[active]={top:el.scrollTop,draft:draft??(commandRunning.current?"":input),focus:focus??undefined,...(anchor?{anchorId:anchor.id,offset:anchor.getBoundingClientRect().top-top}:{})};
  }
  return views.current;
 }
 function restoreWorkspace(value:Workspace){
  views.current=value.views;
  if(value.active&&value.views[value.active])restorePosition.current={sessionId:value.active,view:value.views[value.active]};
  setSessions(value.sessions);setActive(value.active);setInput(value.input);setReadingFocus(value.readingFocus);setExpanded(value.expanded);setOpen(value.sidebarOpen);
 }
 function cancelLoad(){request.current++;requestAbort.current?.abort();requestAbort.current=null;busyRef.current=false;setBusy(false);}
 function activateSession(id:string|null){
  if(id===active){setOpenMobile(false);return;}
  captureViews();cancelLoad();
  const view=id?views.current[id]:undefined;
  restorePosition.current=id&&view?{sessionId:id,view}:null;
  setActive(id);setInput(view?.draft??"");setReadingFocus(view?.focus??null);setOpenMobile(false);
 }
 function closeSession(id:string){
  const target=sessions.find(s=>s.id===id);if(!target)return;
  captureViews();setClosed({session:target,index:sessions.indexOf(target),view:views.current[id]});
  const next=closeWorkspaceSession(sessions,active,id);
  if(active===id)activateSession(next.active);
  delete views.current[id];setSessions(next.sessions);setNotice("已關閉對話，可復原最近一次關閉。");
 }
 function undoClose(){
  if(!closed){setNotice("目前沒有可復原的對話。");return;}
  if(closed.view)views.current[closed.session.id]=closed.view;
  setSessions(all=>{const next=all.filter(s=>s.id!==closed.session.id);next.splice(Math.min(closed.index,next.length),0,closed.session);return next.slice(0,20);});
  activateSession(closed.session.id);setClosed(null);setNotice("已復原對話。");
 }
 function clearHistory(){
  cancelLoad();pending.current=null;restorePosition.current=null;views.current={};
  setSessions([]);setActive(null);setReadingFocus(null);setExpanded({});setInput("");setClosed(null);setGallery(null);setClearOpen(false);setOpenMobile(false);
  try{localStorage.removeItem(WORKSPACE_KEY);setNotice("已清除對話與閱讀紀錄，圖片偏好仍保留。");}catch{setNotice("瀏覽器無法清除儲存資料，請至瀏覽器設定清除此網站資料。");}
 }
 useEffect(()=>{if(storage.status==="error")setNotice("瀏覽器無法儲存目前紀錄，請關閉較舊對話後再試；上次成功儲存的版本仍保留。");},[storage.status]);
 const maskText=(text:string)=>quiet?boards.reduce((value,board)=>value.replace(new RegExp(board.id,"ig"),board.alias),text).replace(/PTT/g,"資料來源"):text;
 const label=(board:string)=>quiet?(boards.find(b=>b.id===board)?.alias??"主題研究"):board;
 useEffect(()=>{try{setAdult(localStorage.getItem("chatptt-adult")==="yes");setQuiet(localStorage.getItem("chatptt-quiet")==="yes");}catch{}},[]);
 useEffect(()=>{document.title=quiet?"Chat · 筆記與研究":SITE.title;if(storage.ready)try{localStorage.setItem("chatptt-quiet",quiet?"yes":"no");}catch{}},[quiet,storage.ready]);
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!e.defaultPrevented&&!document.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')&&!ageGate&&!help&&!boardPicker&&!searchOpen&&!imageSettingsOpen&&!referenceOpen&&!clearOpen&&!document.querySelector('[data-article-outline="open"]'))setQuiet(q=>!q);};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener);},[ageGate,help,boardPicker,searchOpen,imageSettingsOpen,referenceOpen,clearOpen]);
 useLayoutEffect(()=>{
  const el=scroll.current;if(!el||!storage.ready)return;
  const saved=restorePosition.current;
  if(saved&&saved.sessionId===active){
   let stopped=false;
   const apply=()=>{if(stopped)return;const anchor=saved.view.anchorId?document.getElementById(saved.view.anchorId):null;if(anchor)el.scrollTop+=anchor.getBoundingClientRect().top-el.getBoundingClientRect().top-(saved.view.offset??0);else el.scrollTop=saved.view.top;};
   const stop=()=>{stopped=true;if(restorePosition.current===saved)restorePosition.current=null;observer.disconnect();};
   const observer=new ResizeObserver(apply);if(el.firstElementChild)observer.observe(el.firstElementChild);
   apply();const frame=requestAnimationFrame(apply),timer=setTimeout(stop,1800);
   for(const type of ["wheel","touchstart","pointerdown","keydown"])el.addEventListener(type,stop,{passive:true});
   return()=>{stop();cancelAnimationFrame(frame);clearTimeout(timer);for(const type of ["wheel","touchstart","pointerdown","keydown"])el.removeEventListener(type,stop);};
  }
  const behavior=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth";
  const target=!busy&&!messages.at(-1)?.error&&readingMessage?document.getElementById(`message-${readingMessage.id}`):null;
  if(target)target.scrollIntoView({block:"start",behavior});else el.scrollTo({top:el.scrollHeight,behavior});
 },[active,messages.length,busy,readingMessage?.id,storage.ready]);
 function ageCheck(action:()=>void){if(adult){action();return;}pending.current=action;setAgeGate(true);}
 function reset(){captureViews();cancelLoad();restorePosition.current=null;setActive(null);setReadingFocus(null);setInput("");setOpenMobile(false);textarea.current?.focus();}
 function append(id:string,message:Message){setSessions(all=>all.map(s=>s.id===id?{...s,messages:[...s.messages,message]}:s));}
 async function load(kind:"board"|"article",board:string,options:LoadOptions={}){
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);setOpenMobile(false);setInput("");
  const token=++request.current;requestAbort.current?.abort();const controller=new AbortController();requestAbort.current=controller;
  let sid=options.targetSessionId??active;
  const prompt=options.prompt??`看看 ${label(board)} 的最新文章`;
  if(!sid||options.fresh||(!options.targetSessionId&&session?.articleKey)){sid=uid();captureViews("");restorePosition.current=null;setActive(sid);const s:Session={id:sid,title:prompt,board,messages:[]};setSessions(all=>[s,...all].slice(0,20));}
  const id=sid;
  const userMessage:Message={id:uid(),role:"user",text:prompt};
  setSessions(all=>all.map(s=>s.id===id?{...s,board,messages:s.articleKey?[userMessage]:[...s.messages,userMessage]}:s));
  try{
   const params=new URLSearchParams({board,adult:"1"});
   if(options.author)params.set("author",options.author);if(options.minScore!==undefined&&options.minScore!=="")params.set("minScore",options.minScore);
   if(options.page)params.set("page",options.page);if(options.query)params.set("q",options.query);if(options.article)params.set("article",options.article);
   const response=await fetch(`/api/ptt?${params}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(18000)])});
   const data=await response.json() as BoardResult | Article | {error:string};if(!response.ok)throw new Error("error" in data?data.error:"暫時無法讀取，請稍後重試。");
   if(token!==request.current)return;
   const responseMessage:Message={id:uid(),role:"assistant",...(kind==="board"?{board:data as BoardResult}:{article:data as Article,sourceListId:options.sourceListId})};
   setSessions(all=>all.map(s=>s.id===id?{...s,title:s.articleKey&&responseMessage.article?responseMessage.article.title:s.title,messages:[...s.messages,responseMessage]}:s));setReadingFocus({sessionId:id,messageId:responseMessage.id});
  }catch(error){if(token===request.current)append(id,{id:uid(),role:"assistant",text:error instanceof Error&&error.name!=="TimeoutError"?error.message:"PTT 回應較慢，請稍後再試。",error:true,retry:{kind,board,options:{...options,fresh:false,targetSessionId:id}}});}
  finally{if(token===request.current){setBusy(false);busyRef.current=false;requestAbort.current=null;}}
 }
 function openBoard(board:string,fresh=true){setBoardPicker(false);ageCheck(()=>load("board",board,{fresh}));}
 function executeCommand(command:ChatCommand){
  if(busyRef.current&&!["new","close","clear","help","switch","work","images","size","save","gallery-close"].includes(command.type)){setNotice("目前正在讀取文章，請稍候再執行這個指令。");return;}
  setInput("");setNotice("");
  switch(command.type){
   case "new":reset();return;
   case "close":if(active)closeSession(active);else setNotice("目前沒有開啟的對話。");return;
   case "undo":undoClose();return;
   case "clear":setClearOpen(true);return;
   case "help":setHelp(true);return;
   case "switch":{const target=sessions[command.index];if(target)activateSession(target.id);else setNotice(`目前只有 ${sessions.length} 個對話；編號依左側由上到下排列。`);return;}
   case "list":if(outlineBoard)repeatList();else setNotice("請先開啟看板文章列表。");return;
   case "back":if(outlineMessage)returnToList();else setNotice("這個對話沒有文章列表，可用「看看最新」開啟看板。");return;
   case "latest":openBoard(currentBoard,false);return;
   case "more":{const board=outlineBoard??latestBoard;if(board?.previous)ageCheck(()=>load("board",board.board,{page:board.previous!,query:board.query,...board.filters,prompt:"再看一些文章"}));else setNotice("目前沒有可繼續載入的列表頁面。");return;}
   case "open":{const post=outlineBoard?.posts[command.index];if(!post||!outlineMessage){setNotice(`本頁沒有第 ${command.index+1} 篇文章，請先開啟列表或確認編號。`);return;}if(command.separate)openStandaloneArticle(outlineBoard!.board,post.id,post.title);else readArticle(post,outlineMessage);return;}
   case "solo":{const raw=command.reference||readingMessage?.article?.url||"";const reference=parseArticleReference(raw,outlineBoard?.board??currentBoard);if(reference)openStandaloneReference(reference);else setNotice("可輸入 /solo 3、/solo 加上 PTT 網址或 AID，或先閱讀一篇文章再輸入 /solo。");return;}
   case "article-step":{const index=outlineBoard?.posts.findIndex(p=>p.id===outlinePostId)??-1;const post=outlineBoard?.posts[index+command.delta];if(!post||!outlineMessage){setNotice(command.delta>0?"本頁沒有下一篇，或尚未開啟文章列表。":"本頁沒有上一篇，或尚未開啟文章列表。");return;}readArticle(post,outlineMessage);return;}
   case "comments":{const article=readingMessage?.article?readingMessage:[...messages].reverse().find(m=>m.article);if(!article){setNotice("請先開啟一篇文章。");return;}setExpanded(value=>({...value,[article.id]:command.open}));if(command.open)requestAnimationFrame(()=>document.getElementById(`comments-${article.id}`)?.scrollIntoView({behavior:"smooth",block:"start"}));return;}
   case "images":changeImages({...imageSettings,display:command.display});if(command.display!=="floating")setGallery(null);setNotice(command.display==="floating"?"圖片已改用浮動小視窗。":command.display==="inline"?"圖片會顯示在文章中。":"圖片已改為只顯示連結。");return;
   case "size":changeImages({...imageSettings,size:command.size});setNotice("已更新預設圖片大小。");return;
   case "work":setQuiet(command.enabled);return;
   case "gallery":if(quiet)setNotice("請先關閉工作模式，再開啟圖片。");else if(latestArticle&&imagesByArticle.get(latestArticle.id)?.length)openGallery(latestArticle.id);else setNotice("目前文章沒有可預覽的圖片。");return;
   case "gallery-close":closeGallery();return;
   case "image-step":{if(!galleryMessage||!gallery){setNotice("請先用 /gallery 開啟圖片小視窗。");return;}const index=gallery.index+command.delta;if(index<0||index>=galleryImages.length){setNotice(command.delta>0?"已是最後一張圖片。":"已是第一張圖片。");return;}setGallery({...gallery,index});return;}
   case "save":storage.schedule();setTimeout(storage.flush,0);return;
  }
 }
 function runCommand(raw:string){
  const text=raw.trim();if(!text)return;
  const command=parseChatCommand(text);
  if(command){commandRunning.current=true;try{executeCommand(command);}finally{commandRunning.current=false;}return;}
  if(busyRef.current){setNotice("文章正在載入；可用 /close 關閉或 /new 開始新對話。");return;}
  if(text.startsWith("/")&&text!=="/"&&(!/^\/[A-Za-z][A-Za-z0-9_-]{0,29}$/.test(text)||commandHints.some(hint=>hint.command.split(" ")[0].toLowerCase()===text.toLowerCase()))){setNotice("指令格式不正確，輸入 /help 查看用法。");return;}
  if(text==="/"){setInput("");setHelp(true);return;}
  if(/^(?:顯示文章列表|文章列表|重貼列表)$/.test(text)&&outlineBoard){setInput("");repeatList();return;}
  const reference=parseArticleReference(text,outlineBoard?.board??currentBoard);
  if(reference){if(reference.kind==="aid"&&!reference.explicitBoard&&!session)openReferenceDialog(text);else openReference(reference);return;}
  if(/^(?:https?:\/\/|#|(?:※\s*)?文章代碼|AID\s*[:：])/i.test(text)){openReferenceDialog(text);return;}
  if(/^(大家怎麼說|推文|看推文|留言)[？?]?$/.test(text)){const last=readingMessage?.article?readingMessage:[...messages].reverse().find(m=>m.article);if(last){setExpanded(e=>({...e,[last.id]:true}));setInput("");requestAnimationFrame(()=>document.getElementById(`comments-${last.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}));return;}}
  if(/^(下一頁|上一頁|再多一點|更多)[！!]?/.test(text)){const last=outlineBoard??latestBoard;const page=last?.previous;if(last&&page){ageCheck(()=>load("board",last.board,{page,query:last.query,...last.filters,prompt:"再看一些文章"}));return;}}
  const known=boards.find(b=>text.toLowerCase().includes(b.id.toLowerCase())||text.includes(b.name)||text.includes(b.alias));
  const filtered=parseSearchCommand(text.replace(/^(?:搜尋一下|搜尋|找一下|找找|找)\s*/,""));
  if(filtered.hasFilters){let query=filtered.query;if(known)query=query.replace(new RegExp(known.id,"ig"),"").replace(known.name,"").trim();ageCheck(()=>load("board",known?.id??currentBoard,{query,author:filtered.author,minScore:filtered.minScore,prompt:text}));return;}
  const search=text.match(/(?:搜尋一下|搜尋|找一下|找找|找)\s*[:：]?\s*(.+)/);
  if(search){let term=search[1].trim();if(known)term=term.replace(new RegExp(known.id,"ig"),"").replace(known.name,"").trim();if(term){ageCheck(()=>load("board",known?.id??currentBoard,{query:term,prompt:text}));return;}}
  const custom=text.match(/^(?:看一下|看看|打開|看|\/)?\s*([A-Za-z][A-Za-z0-9_-]{0,29})(?:\s*(?:板|版|最新文章))?$/);
  if(known||custom){ageCheck(()=>load("board",known?.id??custom![1],{prompt:text}));return;}
  ageCheck(()=>load("board",currentBoard,{query:text,prompt:`在 ${label(currentBoard)} 搜尋「${text}」`}));
 }
 function openReferenceDialog(value=""){setReferenceSeed(value);setReferenceOpen(true);}
 function openReference(reference:ArticleReference){
  if(busyRef.current)return;
  if(session?.articleKey){openStandaloneArticle(reference.board,reference.article);return;}
  const source=outlineMessage?.board?.board===reference.board&&outlineMessage.board.posts.some(p=>p.id===reference.article)?outlineMessage:[...messages].reverse().find(m=>m.board?.board===reference.board&&m.board.posts.some(p=>p.id===reference.article));
  const cached=messages.find(m=>m.article?.board===reference.board&&articleMatches(m.article.url,reference.board,reference.article));
  if(cached){setInput("");jumpToMessage(cached.id,source?.id);return;}
  ageCheck(()=>load("article",reference.board,{article:reference.article,prompt:reference.kind==="aid"?`開啟 ${reference.aid} (${reference.board})`:reference.url,sourceListId:source?.id}));
 }
 function pasteReference(event:ClipboardEvent<HTMLTextAreaElement>){
  if(busyRef.current)return;
  const field=event.currentTarget;
  if(input.trim()&&!(field.selectionStart===0&&field.selectionEnd===input.length))return;
  const pasted=event.clipboardData.getData("text/plain").trim();
  const reference=parseArticleReference(pasted,outlineBoard?.board??currentBoard);
  if(!reference)return;
  event.preventDefault();setInput(pasted);
  if(reference.kind==="aid"&&!reference.explicitBoard&&!session)openReferenceDialog(pasted);else openReference(reference);
 }
 function readReference(raw:string,board:string){const reference=parseArticleReference(raw,board);if(reference)openReference(reference);}
 function openStandaloneArticle(board:string,postId:string,title?:string){
  if(busyRef.current)return;
  const articleKey=`${board}/${postId}`;
  const existing=sessions.find(s=>s.articleKey===articleKey);
  const matches=(m:Message)=>m.article?.board===board&&articleMatches(m.article.url,board,postId);
  const loaded=existing?.messages.find(matches);
  if(existing&&loaded){activateSession(existing.id);restorePosition.current=null;setReadingFocus({sessionId:existing.id,messageId:loaded.id});setInput("");setOpenMobile(false);return;}
  const cached=messages.find(matches)??sessions.flatMap(s=>s.messages).find(matches);
  const open=()=>{
   const id=existing?.id??uid();
   const prompt=cached?.article?.title??title??`開啟 ${board} 的文章`;
   const message:Message|undefined=cached?.article?{id:uid(),role:"assistant",article:cached.article}:undefined;
   const entry:Session={id,title:prompt,board,articleKey,messages:message?[{id:uid(),role:"user",text:prompt},message]:[]};
   setSessions(all=>existing?all.map(s=>s.id===id?entry:s):[entry,...all].slice(0,20));
   captureViews("");restorePosition.current=null;setActive(id);setInput("");setOpenMobile(false);
   if(message)setReadingFocus({sessionId:id,messageId:message.id});
   else void load("article",board,{article:postId,prompt,targetSessionId:id});
  };
  if(cached)open();else ageCheck(open);
 }
 function openStandaloneReference(reference:ArticleReference){openStandaloneArticle(reference.board,reference.article);}
 async function copyAid(m:Message){
  const reference=parseArticleReference(m.article!.url);if(!reference?.aid)return;
  try{await navigator.clipboard.writeText(`${reference.aid} (${reference.board})`);setCopied(`${m.id}:aid`);setTimeout(()=>setCopied(null),1800);}catch{setCopied(null);}
 }
 function submit(e:FormEvent){e.preventDefault();runCommand(input);}
 async function copyArticle(m:Message){try{await navigator.clipboard.writeText(`${m.article!.title}\n\n${m.article!.body}\n\n${m.article!.url}`);setCopied(m.id);setTimeout(()=>setCopied(null),1800);}catch{setCopied(null);}}
 const latestBoard=[...messages].reverse().find(m=>m.board)?.board;
 function focusSearch(){openSearch();}
 function openSearch(result?:BoardResult){const value=result??outlineBoard??latestBoard;setSearchSeed({board:value?.board??currentBoard,query:value?.query??"",...value?.filters});setSearchOpen(true);setOpenMobile(false);}
 const imagesByArticle=useMemo(()=>new Map(messages.filter(m=>m.article).map(m=>[m.id,articleImages(m.article!)])),[session?.messages]);
 const latestArticle=readingMessage?.article?readingMessage:undefined;
 function jumpToMessage(messageId:string,listId?:string){
  if(!active)return;setReadingFocus({sessionId:active,messageId,listId});
  requestAnimationFrame(()=>{const target=document.getElementById(`message-${messageId}`);target?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});target?.focus({preventScroll:true});});
 }
 function readArticle(post:Post,source:Message){
  if(!source.board||busyRef.current)return;
  const cached=messages.find(m=>m.article&&m.article.board===source.board!.board&&articleMatches(m.article.url,source.board!.board,post.id));
  if(cached){jumpToMessage(cached.id,source.id);return;}
  ageCheck(()=>load("article",source.board!.board,{article:post.id,prompt:post.title,sourceListId:source.id}));
 }
 function returnToList(){if(outlineMessage)jumpToMessage(outlineMessage.id);}
 function repeatList(){
  if(!active||!outlineBoard||busyRef.current)return;
  const response:Message={id:uid(),role:"assistant",board:outlineBoard};
  setSessions(all=>all.map(s=>s.id===active?{...s,board:outlineBoard.board,messages:[...s.messages,{id:uid(),role:"user",text:"顯示文章列表"},response]}:s));
  setReadingFocus({sessionId:active,messageId:response.id});
 }

 const galleryMessage=gallery?.sessionId===active?messages.find(m=>m.id===gallery?.articleId):undefined;
 const galleryImages=galleryMessage?imagesByArticle.get(galleryMessage.id)??[]:[];
 useEffect(()=>{
  if(imageSettings.display==="floating"&&!quiet&&latestArticle&&(imagesByArticle.get(latestArticle.id)?.length??0)>0){galleryTrigger.current=null;setGallery({sessionId:active,articleId:latestArticle.id,index:0});}
  else setGallery(null);
 },[active,latestArticle?.id,imageSettings.display,quiet]);
 function openGallery(articleId:string,href?:string){
  const images=imagesByArticle.get(articleId)??[];if(quiet||!images.length)return;
  galleryTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setGallery({sessionId:active,articleId,index:href?Math.max(0,images.findIndex(image=>image.src===imagePreviewUrl(href))):0});
 }
 function closeGallery(){setGallery(null);if(galleryTrigger.current?.isConnected)galleryTrigger.current.focus({preventScroll:true});}

 const visibleHints=input.trimStart().startsWith("/")?commandHints.filter(hint=>hint.command.startsWith(input.trim().toLowerCase())).slice(0,6):[];
 const composer=<form className={`composer ${input.includes("\n")?"multiline":""}`} onSubmit={submit}>
  {visibleHints.length>0&&<div className="command-hints" role="region" aria-label="快捷指令提示">{visibleHints.map(hint=><button type="button" key={hint.command} onClick={()=>{setInput(hint.command);textarea.current?.focus();}}><code>{hint.command.trim()}</code><span>{hint.label}</span></button>)}</div>}
  <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="composer-add icon-btn" aria-label="新增內容"><Plus size={23} strokeWidth={1.6}/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="composer-menu" onCloseAutoFocus={event=>event.preventDefault()}><DropdownMenuItem onSelect={()=>setBoardPicker(true)}><PanelsTopLeft/>瀏覽看板</DropdownMenuItem><DropdownMenuItem onSelect={focusSearch}><Search/>搜尋文章</DropdownMenuItem><DropdownMenuItem onSelect={()=>openReferenceDialog()}><LinkIcon/>網址／文章代碼</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>setClearOpen(true)}><Trash2/>清除閱讀紀錄</DropdownMenuItem><DropdownMenuItem onSelect={()=>setHelp(true)}><HelpCircle/>使用說明</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  <textarea ref={textarea} aria-label="輸入瀏覽指令" value={input} onPaste={pasteReference} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();runCommand(input);}}} placeholder={quiet?"問問 Chat":"輸入 / 查看指令，或貼上 PTT 網址／AID"} rows={input.includes("\n")?3:1} maxLength={400}/>
  <div className="composer-controls"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="source-picker" aria-label="選擇看板">{quiet?"標準":currentBoard}<ChevronDown size={13}/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end" className="composer-menu">{boards.map(b=><DropdownMenuItem key={b.id} onSelect={()=>openBoard(b.id)} disabled={busy}><span>{quiet?b.alias:b.id}</span><span className="menu-meta">{quiet?"":b.name}</span>{currentBoard===b.id&&<Check size={15}/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><button type="button" className="icon-btn composer-help" onClick={()=>setHelp(true)} aria-label="瀏覽指令說明"><HelpCircle size={19} strokeWidth={1.5}/></button><button className="send-button" type="submit" disabled={!input.trim()||!storage.ready} aria-label="送出">{busy?<LoaderCircle size={19} className="spinner"/>:<ArrowUp size={22} strokeWidth={2}/>}</button></div>
 </form>;
 return <>
 <nav className="app-rail" aria-label="應用程式導覽"><div className="rail-top"><button className="rail-button is-active" onClick={reset} aria-label="首頁" title="首頁"><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3-9 7.5a1 1 0 0 0 .65 1.77H5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-7.73h1.35A1 1 0 0 0 21 10.5Z" fill="currentColor"/></svg></button><button className="rail-button" onClick={()=>setBoardPicker(true)} aria-label="瀏覽看板" title="看板"><Files size={19} strokeWidth={1.5}/></button><button className="rail-button" onClick={()=>{setOpen(true);setOpenMobile(true);document.getElementById("recent-conversations")?.scrollIntoView({block:"nearest"});}} aria-label="最近對話" title="最近對話"><History size={19} strokeWidth={1.5}/></button><button className="rail-button" onClick={focusSearch} aria-label="搜尋文章" title="搜尋"><AtSign size={19} strokeWidth={1.5}/></button><button className="rail-button" onClick={()=>setHelp(true)} aria-label="更多選項" title="更多"><MoreHorizontal size={19}/></button></div><button className="rail-profile" onClick={()=>setHelp(true)} aria-label="我的閱讀空間">W</button></nav>
 <Sidebar className="chat-sidebar">
  <SidebarHeader className="side-top"><button className="sidebar-wordmark" onClick={reset}>{quiet?"Chat":"ChatPTT"}</button><div className="sidebar-tools"><button className="icon-btn" aria-label="閱讀提醒" title="閱讀提醒" onClick={()=>setHelp(true)}><Bell size={17} strokeWidth={1.5}/></button><button className="icon-btn" aria-label="搜尋" onClick={focusSearch}><Search size={18} strokeWidth={1.6}/></button><button className="icon-btn" aria-label="收合側邊欄" onClick={toggleSidebar}><PanelLeft size={18} strokeWidth={1.5}/></button></div></SidebarHeader>
  <SidebarContent className="side-content">
   <button className={`nav-button ${!session?"nav-current":""}`} onClick={reset}><SquarePen size={17} strokeWidth={1.6}/><span>新對話</span></button>
   <button className="nav-button board-shortcut" onClick={()=>setBoardPicker(true)}><Files size={17} strokeWidth={1.5}/><span>{quiet?"瀏覽專案":"瀏覽看板"}</span></button>
   <div className="side-section-heading"><span>{quiet?"專案":"看板"}</span><button className="icon-btn" onClick={()=>setBoardPicker(true)} aria-label="選擇其他看板"><Plus size={16}/></button></div>
   <button className={`board-nav board-current ${session?"":"board-placeholder"}`} onClick={()=>setBoardPicker(true)}>{session?<><Folder size={16} strokeWidth={1.5}/><span>{label(currentBoard)}</span><ChevronDown size={14}/></>:<span>{quiet?"選擇專案":"選擇看板"}</span>}</button>
   <div className="side-section-heading history-label" id="recent-conversations"><span>最近項目</span><button className="icon-btn" onClick={reset} aria-label="開始新對話"><SquarePen size={16}/></button></div>
   {sessions.length?sessions.map((s,i)=><div key={s.id} className="history-entry"><button className={`history-button ${s.id===active?"selected":""}`} aria-current={s.id===active?"page":undefined} title={quiet?undefined:s.title} onClick={()=>activateSession(s.id)}>{s.articleKey&&<FileText size={15} strokeWidth={1.5} aria-label="獨立文章"/>}<span>{quiet?`${boards.find(b=>b.id===s.board)?.alias??"主題研究"} ${sessions.length-i}`:s.title}</span></button><button className="history-close icon-btn" aria-label={`關閉對話：${quiet?"閱讀項目":s.title}`} title="關閉對話" onClick={()=>closeSession(s.id)}><X size={14}/></button></div>):<div className="history-empty">尚無對話</div>}
   <div className="workspace-tools"><span role="status">{storage.status==="error"?"無法儲存，請關閉較舊對話後再試":storage.status==="recovered"?"無法還原舊紀錄，已開啟新工作區":storage.ready?"自動儲存於此瀏覽器":"正在還原閱讀紀錄…"}</span><button className="text-action" onClick={()=>setClearOpen(true)}><Trash2 size={13}/>清除紀錄</button></div>
  </SidebarContent>
 </Sidebar>
 <main className={`chat-main ${quiet?"quiet":""} ${outlineBoard?.posts.length?"has-article-outline":""}`}>
  <header className="topbar"><div className="topbar-left"><button className="icon-btn" onClick={toggleSidebar} aria-label="切換側邊欄"><PanelLeft size={20}/></button><span className="mobile-wordmark">{quiet?"Chat":"ChatPTT"}</span></div><Tabs value={quiet?"work":"chat"} onValueChange={value=>setQuiet(value==="work")} className="mode-tabs"><TabsList aria-label="瀏覽模式"><TabsTrigger value="chat">對話</TabsTrigger><TabsTrigger value="work" title="低調模式：隱藏看板代號與推噓數">工作</TabsTrigger></TabsList></Tabs><div className="topbar-actions"><button className="icon-btn" onClick={()=>setImageSettingsOpen(true)} aria-label="圖片設定" title="圖片設定"><ImageIcon size={18} strokeWidth={1.5}/></button><button className="icon-btn new-chat-top" onClick={reset} aria-label="新對話" title="新對話"><MessageCircle size={19} strokeWidth={1.5}/></button></div></header>
  <div className={`conversation-scroll ${!session?"is-welcome":""}`} ref={scroll} onScroll={storage.schedule}>
   {!session?<section className="welcome"><h1>準備好了，隨時等你。</h1>{!quiet&&<p className="welcome-description">用聊天介面，閱讀 PTT 真實文章與推文。</p>}{composer}<div className="suggestions">{suggestions.map((id,i)=>{const b=boards.find(b=>b.id===id)!;return <div className="suggestion-row" key={id}><button onClick={()=>openBoard(b.id)}><span className={`suggestion-icon tone-${i}`}>{i===0?<MessageSquare size={16}/>:i===1?<Folder size={16}/>:<BookOpen size={16}/>}</span><span>{quiet?`看看${b.alias}的最新討論。`:`${i===0?"看看":"找找"}${b.name}板最近有什麼新話題。`}</span></button><button className="dismiss-suggestion icon-btn" aria-label={`關閉${b.name}建議`} onClick={()=>setSuggestions(items=>items.filter(item=>item!==id))}><X size={14}/></button></div>;})}</div>{!quiet&&<a className="about-link" href="/about">關於 ChatPTT 與使用說明</a>}</section>:<div className="conversation">
   {messages.map(m=>m.role==="user"?<div className="user-message" key={m.id}><div>{maskText(m.text??"")}</div></div>:<article key={m.id} id={`message-${m.id}`} tabIndex={-1} className="assistant-message"><div className="assistant-heading"><span className="assistant-avatar"><MessageCircle size={19}/></span><strong>{quiet?"Chat":"ChatPTT"}</strong>{m.board&&<span className="source-label">{quiet?"參考資料":`讀取自 ${m.board.board}`}</span>}{m.article&&<span className="source-label">{quiet?"文章內容":"PTT 原文"}</span>}</div>
    {m.text&&<div className={m.error?"error-message":"response-text"}><p>{m.text}</p>{m.retry&&<button className="text-action" onClick={()=>{const retry=m.retry!;ageCheck(()=>load(retry.kind,retry.board,{...retry.options,targetSessionId:session!.id,fresh:false}));}} disabled={busy}><RefreshCw size={15}/>重新讀取</button>}</div>}
    {m.board&&<div className="board-response"><p className="response-intro">{(m.board.query||m.board.filters?.author||m.board.filters?.minScore!==undefined&&m.board.filters?.minScore!=="")?<>以下是 <strong>{label(m.board.board)}</strong> 符合「{searchDescription(m.board.query,m.board.filters)}」的文章。</>:<>這是 <strong>{label(m.board.board)}</strong> 最近的討論，想先看哪一篇？</>}</p>{m.board.posts.length?<div className="article-list">{m.board.posts.map((post,i)=><div className="article-list-entry" key={post.id}><button className="article-row" disabled={busy} onClick={()=>readArticle(post,m)}><span className="row-number">{String(i+1).padStart(2,"0")}</span><span className="row-content"><span className="article-title">{post.title}</span><span className="article-meta">{!quiet&&<>{post.author}<span>·</span></>}{post.date}{post.pinned&&<span>置底</span>}</span></span>{!quiet&&<span className={`post-score ${post.score==="爆"||Number(post.score)>=50?"hot":""}`}>{post.score||"–"}</span>}<ChevronRight size={16} className="row-chevron"/></button><button className="article-open-separate icon-btn" disabled={busy} aria-label={`獨立開啟：${post.title}`} title="在側邊欄獨立開啟" onClick={()=>openStandaloneArticle(m.board!.board,post.id,post.title)}><SquareArrowOutUpRight size={16} strokeWidth={1.5}/></button></div>)}</div>:<div className="empty-result">沒有找到文章。換個關鍵字，或輸入其他看板試試。</div>}<div className="response-actions"><button className="text-action" disabled={busy} onClick={()=>openSearch(m.board)}><Search size={14}/>調整搜尋</button>{m.board.previous&&<button className="pill-action" disabled={busy} onClick={()=>ageCheck(()=>load("board",m.board!.board,{page:m.board!.previous!,query:m.board!.query,...m.board!.filters,prompt:"再看一些文章"}))}><Plus size={15}/>再看一些</button>}{!quiet&&<a href={m.board.url} target="_blank" rel="noreferrer" className="text-action"><ExternalLink size={14}/>原始看板</a>}</div></div>}
    {m.article&&<div className="article-response"><h2>{m.article.title}</h2>{!quiet&&<p className="article-byline"><button className="author-search" disabled={busy} title="搜尋這位作者在本板的文章" onClick={()=>ageCheck(()=>load("board",m.article!.board,{author:m.article!.author.split(/\s/)[0],prompt:`看看 ${m.article!.author.split(/\s/)[0]} 的文章`}))}>{m.article.author}</button> <span>·</span> {m.article.date}</p>}<div className="image-preferences"><ImagePreferenceFields value={imageSettings} onChange={changeImages} disabled={quiet}/><button className="image-gallery-open" disabled={quiet||!imagesByArticle.get(m.id)?.length} onClick={()=>openGallery(m.id)}><ImageIcon size={14}/>圖片小視窗<span>{imagesByArticle.get(m.id)?.length??0}</span></button><span className="image-preference-note">{quiet?"工作模式已隱藏圖片":imagesSaved?"偏好已記住，下次開啟仍會套用":"本次有效，瀏覽器無法儲存偏好"}</span></div><div className="article-body"><RichText text={m.article.body} mode={imageMode} defaultSize={imageSettings.size} quiet={quiet} floating={imageSettings.display==="floating"} onOpenArticle={raw=>readReference(raw,m.article!.board)} onOpenImage={href=>openGallery(m.id,href)}/></div><div className="article-tools">{!session?.articleKey&&<button className="text-action article-standalone" disabled={busy} title="在側邊欄獨立開啟" onClick={()=>{const ref=parseArticleReference(m.article!.url);if(ref)openStandaloneReference(ref);}}><SquareArrowOutUpRight size={15}/>獨立開啟</button>}<button className={`pill-action ${expanded[m.id]?"active":""}`} onClick={()=>setExpanded(e=>({...e,[m.id]:!e[m.id]}))}><MessageSquare size={16}/>{expanded[m.id]?"收起討論":"大家怎麼說？"}<span>{m.article.comments.length}</span></button><button className="icon-btn" aria-label="複製文章" onClick={()=>copyArticle(m)}>{copied===m.id?<Check size={17}/>:<Copy size={17}/>}</button>{!quiet&&parseArticleReference(m.article.url)?.aid&&<button className="text-action copy-aid" aria-label="複製文章代碼" onClick={()=>copyAid(m)}>{copied===`${m.id}:aid`?<Check size={15}/>:<Hash size={15}/>}<span>{copied===`${m.id}:aid`?"已複製代碼":"複製代碼"}</span></button>}{!quiet&&<a className="icon-btn" href={m.article.url} target="_blank" rel="noreferrer" aria-label="在 PTT 開啟原文"><ExternalLink size={17}/></a>}</div>{expanded[m.id]&&<section className="comments" id={`comments-${m.id}`}><p className="comments-note">推文依 PTT 網頁更新，可能有延遲。</p><div className="comments-heading"><h3>大家的回應</h3><span>{m.article.comments.length} 則</span></div>{m.article.comments.length?m.article.comments.map((c,i)=><div className="comment" key={i}><span className={`comment-tag ${c.tag==="推"?"up":c.tag==="噓"?"down":""}`}>{quiet?"·":c.tag}</span><div><span className="comment-user">{c.user}</span><p><RichText text={c.text} mode={imageMode} defaultSize={imageSettings.size} quiet={quiet} floating={imageSettings.display==="floating"} onOpenArticle={raw=>readReference(raw,m.article!.board)} onOpenImage={href=>openGallery(m.id,href)}/></p></div><time>{c.time}</time></div>):<p className="empty-result">目前 PTT 網頁尚未提供推文，稍後重新開啟可查看更新。</p>}</section>}</div>}
   </article>)}
   {busy&&<div className="loading-response" role="status"><div><LoaderCircle size={18} className="spinner"/><span>正在讀取{quiet?"資料":" PTT"}…</span></div><Skeleton className="h-3 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>}
   </div>}
  </div>
  {session&&<div className="composer-area">{!busy&&<div className="followup-chips">{outlineBoard&&<button onClick={repeatList}><List size={14}/>顯示文章列表</button>}{readingMessage?.article&&outlineBoard&&<button onClick={returnToList}><ArrowLeft size={14}/>回到文章列表</button>}<button onClick={()=>openBoard(currentBoard,false)}><RefreshCw size={14}/>看看最新</button>{(outlineBoard??latestBoard)?.previous&&<button onClick={()=>runCommand("再多一點")}><Plus size={14}/>再多一點</button>}<button onClick={focusSearch}><Search size={14}/>找個話題</button></div>}{composer}<p className="composer-note">{quiet?"內容僅供參考，請核對原始資料。":"ChatPTT 可能無法即時取得更新，請核對 PTT 原文。"}</p></div>}

  {outlineBoard&&outlineMessage&&outlineBoard.posts.length>0&&<ArticleOutline key={`${active}:${outlineMessage.id}`} board={label(outlineBoard.board)} posts={outlinePosts} activeId={outlinePostId} quiet={quiet} busy={busy} onSelect={id=>{const post=outlineBoard.posts.find(p=>p.id===id);if(post)readArticle(post,outlineMessage);}} onReturn={returnToList}/>}
 </main>
 {gallery&&galleryMessage?.article&&galleryImages.length>0&&!quiet&&<FloatingImageViewer key={`${active}:${galleryMessage.id}`} title={galleryMessage.article.title} images={galleryImages} index={gallery.index} size={imageSettings.size} onIndexChange={index=>setGallery(current=>current?{...current,index}:null)} onSizeChange={size=>changeImages({...imageSettings,size})} onClose={closeGallery}/>}
 {notice&&<div className="workspace-notice" role="status"><span>{notice}</span>{closed&&<button onClick={undoClose}><Undo2 size={14}/>復原關閉</button>}<button className="icon-btn" aria-label="關閉提示" onClick={()=>setNotice("")}><X size={14}/></button></div>}
 <Dialog open={clearOpen} onOpenChange={setClearOpen}><DialogContent><DialogTitle>清除全部閱讀紀錄？</DialogTitle><DialogDescription>將清除這個瀏覽器儲存的對話、獨立文章、草稿與閱讀位置，無法復原。圖片偏好與年齡確認會保留。</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={()=>setClearOpen(false)}>取消</Button><Button onClick={clearHistory}>清除全部紀錄</Button></div></DialogContent></Dialog>
 <ArticleReferenceDialog open={referenceOpen} onOpenChange={setReferenceOpen} initial={referenceSeed} board={outlineBoard?.board??currentBoard} busy={busy} onRead={openReference} onReadSeparately={openStandaloneReference}/>
 <ImageSettingsDialog open={imageSettingsOpen} onOpenChange={setImageSettingsOpen} value={imageSettings} onChange={changeImages} saved={imagesSaved}/>
 <PttSearchDialog open={searchOpen} onOpenChange={setSearchOpen} initial={searchSeed} busy={busy} onSearch={draft=>{setSearchOpen(false);ageCheck(()=>load("board",draft.board,{query:draft.query,author:draft.author,minScore:draft.minScore,prompt:`在 ${label(draft.board)} 搜尋${searchDescription(draft.query,draft)||"所有文章"}`}));}}/>
 <Dialog open={boardPicker} onOpenChange={setBoardPicker}><DialogContent className="board-dialog"><DialogTitle>{quiet?"選擇研究主題":"選擇看板"}</DialogTitle><DialogDescription>選擇一個話題，或在輸入框填入其他英文看板名稱。</DialogDescription><div className="board-picker-grid">{boards.map(b=><button key={b.id} onClick={()=>openBoard(b.id)} disabled={busy}><Folder size={20}/><span><strong>{quiet?b.alias:b.id}</strong><small>{b.desc}</small></span></button>)}</div></DialogContent></Dialog>
 <Dialog open={ageGate} onOpenChange={value=>{setAgeGate(value);if(!value)pending.current=null;}}><DialogContent><DialogTitle>開始閱讀前</DialogTitle><DialogDescription className="dialog-copy">PTT 要求讀者確認年齡，部分看板可能包含成人內容。確認後，本瀏覽器會記住你的選擇。</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={()=>{setAgeGate(false);pending.current=null;}}>先返回</Button><Button onClick={()=>{setAdult(true);try{localStorage.setItem("chatptt-adult","yes");}catch{}setAgeGate(false);const action=pending.current;pending.current=null;action?.();}}>我已滿 18 歲，開始閱讀</Button></div></DialogContent></Dialog>
 <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle>把逛看板，變成一段對話。</DialogTitle><DialogDescription className="dialog-copy">ChatPTT 會讀取 PTT 公開網頁，保留文章和推文原文。這裡的聊天輸入是瀏覽指令，沒有串接 AI，也不會替你發文或推文。</DialogDescription><dl className="help-examples"><dt>從輸入框操作</dt><dd>輸入 / 會顯示快捷提示，選取後按 Enter 執行。也支援「新對話」、「關閉對話」、「開啟第 3 篇」、「獨立開啟第 3 篇」、「下一篇」、「圖片 浮動」、「圖片大小 小」等中文指令。</dd>{commandHints.map(hint=><div key={hint.command}><dt><code>{hint.command}</code></dt><dd>{hint.label}</dd></div>)}<dt>關閉與儲存</dt><dd>側欄每個對話右側的 × 可關閉，接著可按提示中的「復原關閉」或輸入 /undo。對話、草稿與閱讀位置自動儲存，重新整理後接著看。若空間不足會提示且保留上次成功儲存的版本；可關閉舊對話或清除紀錄。</dd><dt>看一下 C_Chat</dt><dd>打開看板的最新文章</dd><dt>搜尋 鋼彈</dt><dd>在目前看板搜尋文章標題</dd><dt>搜尋 作者:〈作者帳號〉 推文:50</dt><dd>把〈作者帳號〉換成要查的帳號，搜尋推文分數至少 50 的文章；也可點搜尋按鈕填寫條件</dd><dt>圖片顯示</dt><dd>右上角「圖片設定」可選只看連結、文章內顯示或浮動小視窗，並記住預設大小。小視窗可拖曳移動、從角落調整寬高，也收錄推文圖片；在視窗內按 Esc 可關閉。支援各圖床的直接圖片、GIF／APNG、WebP／AVIF、SVG，以及 GIFV／MP4／WebM 動圖；HEIC、TIFF 等格式視瀏覽器而定。相簿或防外連來源可能無法預覽，仍保留原連結。</dd><dt>本頁文章目錄</dt><dd>左側每條短線代表一篇文章，滑鼠移入會顯示預覽卡，點擊可切換閱讀；「回到文章列表」會回到原本那一頁，保留搜尋條件。「顯示文章列表」可在對話結尾再貼一次列表。手機可點「本頁文章」。</dd><dt>獨立開啟文章</dt><dd>文章列表右側的獨立開啟按鈕，或文章下方的「獨立開啟」，可把單篇文章放進左側「最近項目」。同一篇會沿用既有項目；網址／文章代碼視窗也能選擇獨立開啟。紀錄會自動儲存在這個瀏覽器。</dd><dt>再多一點</dt><dd>繼續看前一頁的文章</dd><dt>大家怎麼說？</dt><dd>展開剛剛那篇文章的推文</dd><dt>網址與文章代碼</dt><dd>直接貼上 PTT 網址或「#AID (看板)」即可在對話裡閱讀。只貼 AID 時使用目前看板；新對話會先讓你確認看板。輸入框的「＋」→「網址／文章代碼」可雙向轉換與複製，文章內的 PTT 連結也可按「在這裡閱讀」。</dd></dl><p className="help-footnote">上方「工作」會切換低調模式，隱藏看板代號與推噓數；按 Esc 也能切換。對話、輸入草稿與閱讀位置會自動儲存在這個瀏覽器，不會上傳到主機；多個分頁以最後操作儲存的狀態為準。若 PTT 暫時無法連線，請稍後重試。<br/><a href="/about">關於 ChatPTT 與閱讀隱私</a></p></DialogContent></Dialog>
 </>;
}
