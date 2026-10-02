import type { ImageDisplay, ImageSize } from './image-links';
export type ChatCommand =
 | {type:'new'|'close'|'undo'|'clear'|'help'|'list'|'back'|'more'|'latest'|'gallery'|'gallery-close'|'save'}
 | {type:'open';index:number;separate:boolean}
 | {type:'solo';reference:string}
 | {type:'switch';index:number}
 | {type:'article-step'|'image-step';delta:number}
 | {type:'comments';open:boolean}
 | {type:'images';display:ImageDisplay}
 | {type:'size';size:ImageSize}
 | {type:'work';enabled:boolean};

export const commandHints = [
 {command:'/help',label:'查看全部指令'}, {command:'/new',label:'開始新對話'},
 {command:'/close',label:'關閉目前對話'}, {command:'/undo',label:'復原最近關閉'},
 {command:'/open 3',label:'閱讀本頁第 3 篇'}, {command:'/solo 3',label:'將第 3 篇獨立開啟'},
 {command:'/solo ',label:'加上 PTT 網址或 AID，獨立開啟'}, {command:'/switch 2',label:'切換至側欄第 2 個項目'},
 {command:'/list',label:'再貼一次文章列表'}, {command:'/back',label:'返回原文章列表'},
 {command:'/next',label:'閱讀下一篇'}, {command:'/prev',label:'閱讀上一篇'},
 {command:'/more',label:'載入下一頁列表'}, {command:'/latest',label:'讀取看板最新文章'},
 {command:'/comments',label:'展開推文'}, {command:'/images floating',label:'改用圖片小視窗'},
 {command:'/images inline',label:'在文章中顯示圖片'}, {command:'/images off',label:'只顯示圖片連結'},
 {command:'/size small',label:'預設圖片改成小型'}, {command:'/size medium',label:'預設圖片改成中型'}, {command:'/size large',label:'預設圖片改成大型'},
 {command:'/gallery',label:'開啟目前文章圖片小視窗'}, {command:'/image next',label:'下一張圖片'}, {command:'/image prev',label:'上一張圖片'},
 {command:'/gallery close',label:'關閉圖片小視窗'}, {command:'/work on',label:'開啟工作模式'}, {command:'/work off',label:'關閉工作模式'},
 {command:'/save',label:'立即儲存閱讀狀態'}, {command:'/clear',label:'清除紀錄（先確認）'},
];

/** Only complete commands are actions; quoted/search text remains ordinary input. */
export function parseChatCommand(raw:string):ChatCommand|null {
 const text=raw.trim();
 const simple:[RegExp,ChatCommand['type']][]=[
  [/^(?:\/new|新對話|開始新對話)$/i,'new'],[/^(?:\/close|關閉(?:目前)?對話)$/i,'close'],
  [/^(?:\/undo|復原關閉|復原對話)$/i,'undo'],[/^(?:\/clear|清除(?:全部)?紀錄|關閉全部對話)$/i,'clear'],
  [/^(?:\/help|指令|指令說明|使用說明)$/i,'help'],[/^(?:\/list|顯示文章列表|文章列表|重貼列表)$/i,'list'],
  [/^(?:\/back|回到文章列表|返回列表)$/i,'back'],[/^(?:\/more|下一頁|上一頁|再多一點|更多)[！!]?$/i,'more'],
  [/^(?:\/latest|看看最新|最新文章)$/i,'latest'],[/^(?:\/gallery|圖片小視窗)$/i,'gallery'],
  [/^(?:\/gallery\s+close|關閉圖片小視窗)$/i,'gallery-close'],[/^(?:\/save|儲存狀態|儲存紀錄)$/i,'save'],
 ];
 for(const [pattern,type] of simple)if(pattern.test(text))return {type} as ChatCommand;
 const numbered=text.match(/^(?:\/(open|solo)\s+|((?:獨立)?開啟)\s*第?\s*)([1-9]\d{0,2})(?:\s*篇)?$/i);
 if(numbered)return {type:'open',index:Number(numbered[3])-1,separate:numbered[1]?.toLowerCase()==='solo'||numbered[2]==='獨立開啟'};
 const solo=text.match(/^(?:\/solo|獨立開啟)(?:\s+(.+))?$/i);
 if(solo)return {type:'solo',reference:solo[1]?.trim()??''};
 const switchTo=text.match(/^(?:\/switch\s+|切換對話\s*第?\s*)([1-9]\d{0,2})(?:\s*(?:個|則))?$/i);
 if(switchTo)return {type:'switch',index:Number(switchTo[1])-1};
 if(/^(?:\/next|下一篇)$/i.test(text))return {type:'article-step',delta:1};
 if(/^(?:\/prev|上一篇)$/i.test(text))return {type:'article-step',delta:-1};
 if(/^(?:\/image\s+next|下一張(?:圖片)?)$/i.test(text))return {type:'image-step',delta:1};
 if(/^(?:\/image\s+prev|上一張(?:圖片)?)$/i.test(text))return {type:'image-step',delta:-1};
 if(/^(?:\/comments|大家怎麼說|推文|看推文|留言)[？?]?$/i.test(text))return {type:'comments',open:true};
 if(/^(?:\/comments\s+hide|收起推文|收起討論)$/i.test(text))return {type:'comments',open:false};
 const images=text.match(/^(?:\/images|圖片)\s+(off|links|inline|floating|關閉|隱藏|連結|顯示|文章內|浮動)$/i);
 if(images)return {type:'images',display:/^(?:floating|浮動)$/i.test(images[1])?'floating':/^(?:inline|顯示|文章內)$/i.test(images[1])?'inline':'links'};
 const size=text.match(/^(?:\/size|圖片大小)\s+(small|medium|large|小|中|大)$/i);
 if(size)return {type:'size',size:/^(?:small|小)$/i.test(size[1])?'small':/^(?:large|大)$/i.test(size[1])?'large':'medium'};
 const work=text.match(/^(?:\/work|工作模式)\s+(on|off|開啟|關閉)$/i);
 if(work)return {type:'work',enabled:/^(?:on|開啟)$/i.test(work[1])};
 return null;
}
