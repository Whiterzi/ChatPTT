import { load } from "cheerio/slim";

export const dynamic = "force-dynamic";
const ORIGIN = "https://www.ptt.cc";
const cache = new Map<string,{expires:number;data:unknown}>();
const headers = { "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" };
class PttError extends Error { constructor(message:string,public status=502){super(message);} }
function clean(text:string){return text.replace(/\u0000/g,"").trim();}

export async function GET(request:Request){
 try {
  const params=new URL(request.url).searchParams;
  const board=params.get("board")||"C_Chat", article=params.get("article"), page=params.get("page"), query=(params.get("q")||"").trim();
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,29}$/.test(board))throw new PttError("看板名稱格式不正確。",400);
  if(article&&!/^M\.\d{8,14}\.A\.[A-Za-z0-9]{1,8}$/.test(article))throw new PttError("文章網址格式不正確。",400);
  if(page&&!/^\d{1,7}$/.test(page))throw new PttError("頁碼格式不正確。",400);
  if(query.length>150)throw new PttError("搜尋關鍵字請在 150 字以內。",400);
  if(params.get("adult")!=="1")throw new PttError("請先在畫面中確認已滿 18 歲。",403);
  const url=new URL(article?`/bbs/${board}/${article}.html`:query?`/bbs/${board}/search`:`/bbs/${board}/index${page||""}.html`,ORIGIN);
  if(query&&!article){url.searchParams.set("q",query);if(page)url.searchParams.set("page",page);}
  const key=url.href,hit=cache.get(key);if(hit&&hit.expires>Date.now())return Response.json(hit.data,{headers});
  let response:Response;
  try{response=await fetch(url,{headers:{"Cookie":"over18=1","User-Agent":"ChatPTT/1.0 (read-only PTT web reader)","Accept":"text/html"},signal:AbortSignal.timeout(12000),redirect:"manual"});}
  catch{throw new PttError("PTT 目前回應較慢或無法連線，請稍後再試。",504);}
  if(response.status===404)throw new PttError(article?"這篇文章已刪除，或文章網址不存在。":"找不到這個看板，請確認英文看板名稱。",404);
  if(response.status===403||response.status===429)throw new PttError("PTT 暫時限制連線，請稍後再試，或從原始看板閱讀。",503);
  if(!response.ok)throw new PttError("PTT 暫時無法提供內容，請稍後再試。");
  if(Number(response.headers.get("content-length"))>4_000_000)throw new PttError("這篇文章過長，請到 PTT 原文閱讀。",413);
  // Limit streamed input as well; upstream content may omit Content-Length.
  const reader=response.body?.getReader();if(!reader)throw new PttError("PTT 回傳空白內容。");
  const decoder=new TextDecoder();let html="",size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4_000_000){await reader.cancel();throw new PttError("這篇文章過長，請到 PTT 原文閱讀。",413);}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();
  const $=load(html);let data:unknown;
  if(article){
   const content=$("#main-content");if(!content.length)throw new PttError("PTT 暫時無法讀取這篇文章，請稍後重試。");
   const meta:Record<string,string>={};content.find(".article-metaline, .article-metaline-right").each((_,el)=>{meta[$(el).find(".article-meta-tag").text().trim()]=$(el).find(".article-meta-value").text().trim();});
   const comments=content.find(".push").map((_,el)=>({tag:clean($(el).find(".push-tag").text()),user:clean($(el).find(".push-userid").text()),text:$(el).find(".push-content").text().replace(/^:\s?/,""),time:clean($(el).find(".push-ipdatetime").text()).replace(/^(?:\d{1,3}\.){3}\d{1,3}\s*/,"")})).get();
   content.find(".article-metaline, .article-metaline-right, .push, script, style").remove();
   content.find("br").replaceWith("\n");
   content.find(".richcontent").each((_,el)=>{const links=$(el).find("a[href]").map((_,a)=>$(a).attr("href")).get().filter(s=>s&&/^https?:\/\//.test(s));$(el).replaceWith(links.length?`\n${links.join("\n")}\n`:"");});
   data={board,title:meta["標題"]||$("title").text().replace(/ - 看板.*$/, ""),author:meta["作者"]||"原文未提供作者",date:meta["時間"]||"",body:clean(content.text()),comments,url:key};
  }else{
   if(!$(".r-list-container").length)throw new PttError("PTT 暫時無法讀取這個看板，請稍後重試。");
   let pinned=false;
   const posts:Array<{id:string;title:string;author:string;date:string;score:string;pinned:boolean}>=[];
   $(".r-list-container").children().each((_,el)=>{if($(el).hasClass("r-list-sep"))pinned=true;if(!$(el).hasClass("r-ent"))return;const a=$(el).find(".title > a"),href=a.attr("href")||"";const id=href.match(/\/(M\.\d+\.A\.[A-Za-z0-9]+)\.html$/)?.[1];if(!id)return;posts.push({id,title:clean(a.text()),author:clean($(el).find(".author").text()),date:clean($(el).find(".date").text()),score:clean($(el).find(".nrec").text()),pinned});});
   const previousLink=$(".btn-group-paging a").filter((_,el)=>$(el).text().includes("上頁")&&!$(el).hasClass("disabled")).attr("href");
   let previous:string|null=null;if(previousLink){const target=new URL(previousLink,ORIGIN);previous=query?target.searchParams.get("page"):(target.pathname.match(/index(\d+)\.html/)?.[1]??null);}
   const normal=posts.filter(p=>!p.pinned);const sorted=[...(query?normal:normal.reverse()),...posts.filter(p=>p.pinned)];
   data={board,posts:sorted,previous,query,url:key};
  }
  if(cache.size>=50)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+30_000,data});
  return Response.json(data,{headers});
 }catch(error){return Response.json({error:error instanceof PttError?error.message:"讀取時發生問題，請稍後再試。"},{status:error instanceof PttError?error.status:502,headers});}
}
