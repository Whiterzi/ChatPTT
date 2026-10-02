import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeWorkspace,encodeWorkspace,closeWorkspaceSession,rememberClosedSession,MAX_WORKSPACE_CHARS } from '../lib/workspace-storage.ts';
import { parseChatCommand } from '../lib/chat-commands.ts';

const fixture=()=>({version:1,sessions:[{id:'one',title:'測試對話',board:'C_Chat',messages:[
 {id:'list',role:'assistant',board:{board:'C_Chat',posts:[{id:'M.1700000000.A.001',title:'測試文章',author:'fixture_user',date:'10/02',score:'50',pinned:false}],previous:'123',query:'測試',filters:{author:'fixture_user',minScore:'50'},url:'https://www.ptt.cc/bbs/C_Chat/search?q=測試'}},
 {id:'article',role:'assistant',sourceListId:'list',article:{title:'測試文章',board:'C_Chat',author:'fixture_user',date:'10/02',body:'內文',comments:[{tag:'推',user:'fixture_user',text:'推文',time:'10/02'}],url:'https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html'}},
 {id:'error',role:'assistant',error:true,text:'讀取失敗',retry:{kind:'article',board:'C_Chat',options:{article:'M.1700000001.A.002',sourceListId:'list',targetSessionId:'one',fresh:false}}}
 ]}],active:'one',input:'尚未送出的草稿',readingFocus:{sessionId:'one',messageId:'article',listId:'list'},expanded:{article:true},views:{one:{top:345,anchorId:'message-article',offset:-100,draft:'尚未送出的草稿',focus:{sessionId:'one',messageId:'article',listId:'list'}}},sidebarOpen:false,sidebarWidth:288,closedSessions:[]});

test('workspace round trip retains list context, drafts, scroll anchor, comments and serializable retries',()=>{
 const state=fixture();const restored=decodeWorkspace(encodeWorkspace(state));
 assert.deepEqual(restored,state);
 assert.equal(restored.sessions[0].messages[2].retry.options.sourceListId,'list');
});

test('malformed, incompatible, oversized and unsafe stored data are rejected',()=>{
 for(const raw of ['{broken','null','[]',JSON.stringify({...fixture(),version:2})])assert.throws(()=>decodeWorkspace(raw));
 const invalid=fixture();invalid.sessions[0].messages[1].article.url='javascript:alert(1)';assert.throws(()=>decodeWorkspace(JSON.stringify(invalid)));
 assert.throws(()=>decodeWorkspace(' '.repeat(MAX_WORKSPACE_CHARS+1)));
 const large=fixture();large.sessions[0].messages[1].article.body='大'.repeat(MAX_WORKSPACE_CHARS);assert.throws(()=>encodeWorkspace(large));
 const duplicate=fixture();duplicate.sessions.push(duplicate.sessions[0]);assert.throws(()=>decodeWorkspace(JSON.stringify(duplicate)));
});

test('closed or missing sessions do not leave stale active pointers or persistent view data',()=>{
 const state=fixture();state.views.closed={top:123,draft:'old'};state.expanded.deleted=true;
 let restored=decodeWorkspace(encodeWorkspace(state));assert.ok(!('closed' in restored.views));assert.ok(!('deleted' in restored.expanded));
 state.active='missing';state.readingFocus={sessionId:'missing',messageId:'article'};
 restored=decodeWorkspace(JSON.stringify(state));assert.equal(restored.active,null);assert.equal(restored.readingFocus,null);
});

test('closing active/inactive/last conversations preserves the correct neighboring selection and source array',()=>{
 const sessions=[{id:'a'},{id:'b'},{id:'c'}];
 assert.deepEqual(closeWorkspaceSession(sessions,'a','c'),{sessions:sessions.slice(0,2),active:'a'});
 assert.equal(closeWorkspaceSession(sessions,'b','b').active,'c');
 assert.equal(closeWorkspaceSession(sessions,'c','c').active,'b');
 assert.equal(closeWorkspaceSession([{id:'a'}],'a','a').active,null);
 assert.equal(sessions.length,3);
});

test('Chinese and slash actions match complete commands without hijacking searches or titles',()=>{
 for(const text of ['/close','關閉對話','關閉目前對話'])assert.deepEqual(parseChatCommand(text),{type:'close'});
 assert.deepEqual(parseChatCommand('獨立開啟第 3 篇'),{type:'open',index:2,separate:true});
 assert.deepEqual(parseChatCommand('/open 12'),{type:'open',index:11,separate:false});
 assert.deepEqual(parseChatCommand('/switch 2'),{type:'switch',index:1});
 assert.deepEqual(parseChatCommand('圖片 浮動'),{type:'images',display:'floating'});
 assert.deepEqual(parseChatCommand('圖片大小 小'),{type:'size',size:'small'});
 assert.deepEqual(parseChatCommand('工作模式 關閉'),{type:'work',enabled:false});
 assert.deepEqual(parseChatCommand('/image next'),{type:'image-step',delta:1});
 assert.deepEqual(parseChatCommand('/solo #1bK_4001 (C_Chat)'),{type:'solo',reference:'#1bK_4001 (C_Chat)'});
 for(const text of ['搜尋 關閉對話','關閉对话的心得','/open 0','/open -1','/open 1.5','看看 /close 的文章','/close extra','C_Chat','https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html'])assert.equal(parseChatCommand(text),null,text);
});


test('older workspaces gain default width and empty history without losing open content',()=>{
 const old=fixture();delete old.sidebarWidth;delete old.closedSessions;
 const restored=decodeWorkspace(JSON.stringify(old));
 assert.equal(restored.sidebarWidth,288);assert.deepEqual(restored.closedSessions,[]);
 assert.deepEqual(restored.sessions,old.sessions);assert.equal(restored.input,old.input);
});

test('closed history survives reload with article context, draft, expanded comments and scroll position',()=>{
 const state=fixture(),original=state.sessions[0];
 const item={session:original,index:0,view:state.views.one,expanded:{article:true,missing:true},closedAt:1700000000000};
 state.closedSessions=rememberClosedSession([],item);state.sessions=[];state.active=null;state.readingFocus=null;state.sidebarWidth=432;
 const restored=decodeWorkspace(encodeWorkspace(state));
 assert.equal(restored.sidebarWidth,432);assert.deepEqual(restored.views,{});
 assert.deepEqual(restored.closedSessions[0].session,original);
 assert.deepEqual(restored.closedSessions[0].view,item.view);
 assert.deepEqual(restored.closedSessions[0].expanded,{article:true});
 assert.equal(restored.closedSessions[0].session.messages[2].retry.options.targetSessionId,'one');
});

test('history keeps the latest 20 unique closures and validates archived data',()=>{
 const state=fixture(),session=state.sessions[0];let history=[];
 for(let i=0;i<25;i++)history=rememberClosedSession(history,{session:{...session,id:String(i)},index:0,expanded:{},closedAt:i});
 assert.equal(history.length,20);assert.equal(history[0].session.id,'24');assert.equal(history.at(-1).session.id,'5');
 history=rememberClosedSession(history,{...history[5],closedAt:30});
 assert.equal(history.length,20);assert.equal(history[0].session.id,'19');assert.equal(new Set(history.map(item=>item.session.id)).size,20);
 state.closedSessions=history;assert.equal(decodeWorkspace(encodeWorkspace(state)).closedSessions.length,20);
 state.closedSessions[0].session.messages[1].article.url='https://malicious.example/article';
 assert.throws(()=>decodeWorkspace(JSON.stringify(state)));
 const duplicate=fixture();duplicate.closedSessions=[{session:duplicate.sessions[0],index:0,expanded:{},closedAt:1}];
 assert.throws(()=>decodeWorkspace(JSON.stringify(duplicate)));
 for(const width of [0,999,NaN])assert.throws(()=>decodeWorkspace(JSON.stringify({...fixture(),sidebarWidth:width})));
 assert.deepEqual(parseChatCommand('/history'),{type:'history'});
});

test('archive locations survive saved standalone conversations and failed-request retries',()=>{
 const state=fixture(),path='/man/C_Chat/D20B/M.1700000000.A.001.html';
 state.sessions[0].articleKey=path;
 state.sessions[0].messages[1].article.url=`https://www.ptt.cc${path}`;
 state.sessions[0].messages[2].retry.options={article:'M.1700000000.A.001',archivePath:path,targetSessionId:'one'};
 const restored=decodeWorkspace(encodeWorkspace(state));
 assert.equal(restored.sessions[0].articleKey,path);
 assert.equal(restored.sessions[0].messages[1].article.url,`https://www.ptt.cc${path}`);
 assert.equal(restored.sessions[0].messages[2].retry.options.archivePath,path);
});

test('inserted replies retain their position in both open and closed saved conversations',()=>{
 const state=fixture(),article=state.sessions[0].messages[1].article;
 article.discussionVersion=1;
 article.comments[0].continuation='原文補充\nhttps://images.example.com/reply.png\n※ 編輯: fixture_author';
 article.comments.push({tag:'推',user:'fixture_reader',text:'下一則推文',time:'10/02'});
 let restored=decodeWorkspace(encodeWorkspace(state));
 assert.deepEqual(restored.sessions[0].messages[1].article,article);
 state.closedSessions=[{session:state.sessions[0],index:0,closedAt:100,expanded:{article:true}}];
 state.sessions=[];state.active=null;
 restored=decodeWorkspace(encodeWorkspace(state));
 assert.deepEqual(restored.closedSessions[0].session.messages[1].article,article);
});
