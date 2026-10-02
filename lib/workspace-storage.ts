import { z } from 'zod';
import type { ClosedSession, Workspace } from './chat-types';

export const WORKSPACE_KEY = 'chatptt-workspace-v1';
export const MAX_WORKSPACE_CHARS = 2_000_000; // Keep headroom for other settings in a typical localStorage quota.
const id = z.string().min(1).max(160);
const board = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,29}$/);
const pttUrl = z.string().max(1000).refine(value => {
 try { const url = new URL(value); return url.protocol === 'https:' && ['www.ptt.cc','ptt.cc'].includes(url.hostname) && !url.username && !url.password && !url.port; } catch { return false; }
});
const filters = z.object({author:z.string().max(80).optional(),minScore:z.string().max(12).optional()});
const focus = z.object({sessionId:id,messageId:id,listId:id.optional()});
const message = z.object({
 id,role:z.enum(['user','assistant']),sourceListId:id.optional(),text:z.string().optional(),error:z.boolean().optional(),
 board:z.object({board,posts:z.array(z.object({id,title:z.string(),author:z.string(),date:z.string(),score:z.string(),pinned:z.boolean()})).max(200),previous:z.string().nullable(),query:z.string(),filters:filters.default({}),url:pttUrl}).optional(),
 article:z.object({title:z.string(),author:z.string(),date:z.string(),body:z.string(),comments:z.array(z.object({tag:z.string(),user:z.string(),text:z.string(),time:z.string(),continuation:z.string().optional()})),discussionVersion:z.literal(1).optional(),url:pttUrl,board}).optional(),
 retry:z.object({kind:z.enum(['board','article']),board,options:filters.extend({page:z.string().optional(),query:z.string().optional(),article:z.string().optional(),archivePath:z.string().max(1000).regex(/^\/man\//).optional(),prompt:z.string().optional(),fresh:z.boolean().optional(),sourceListId:id.optional(),targetSessionId:id.optional()})}).optional(),
});
const session = z.object({id,title:z.string(),board,articleKey:z.string().optional(),messages:z.array(message)});
const view = z.object({top:z.number().finite().nonnegative(),anchorId:id.optional(),offset:z.number().finite().optional(),draft:z.string().max(400),focus:focus.optional()});
const schema = z.object({
 version:z.literal(1),sessions:z.array(session).max(20),
 closedSessions:z.array(z.object({session,index:z.number().int().min(0).max(19),view:view.optional(),expanded:z.record(z.boolean()).default({}),closedAt:z.number().finite().min(0).max(8_640_000_000_000_000)})).max(20).default([]),
 active:id.nullable(),input:z.string().max(400),readingFocus:focus.nullable(),expanded:z.record(z.boolean()),
 views:z.record(view),sidebarOpen:z.boolean(),sidebarWidth:z.number().finite().min(240).max(480).default(288),
});

/** Untrusted or outdated storage must never crash hydration or restore executable callbacks. */
export function decodeWorkspace(raw:string):Workspace {
 if(raw.length>MAX_WORKSPACE_CHARS) throw new Error('Workspace is too large');
 const state = schema.parse(JSON.parse(raw));
 const sessions = new Set(state.sessions.map(s=>s.id));
 if(sessions.size!==state.sessions.length) throw new Error('Duplicate sessions');
 const allSessions=[...state.sessions,...state.closedSessions.map(item=>item.session)];
 if(new Set(allSessions.map(s=>s.id)).size!==allSessions.length)throw new Error('Duplicate closed sessions');
 for(const session of allSessions) if(new Set(session.messages.map(m=>m.id)).size!==session.messages.length) throw new Error('Duplicate messages');
 for(const item of state.closedSessions){
  const ids=new Set(item.session.messages.map(m=>m.id));
  item.expanded=Object.fromEntries(Object.entries(item.expanded).filter(([key])=>ids.has(key)));
  if(item.view?.focus&&(item.view.focus.sessionId!==item.session.id||!ids.has(item.view.focus.messageId)))delete item.view.focus;
 }
 const validFocus = (value:typeof state.readingFocus) => value && state.sessions.some(s=>s.id===value.sessionId&&s.messages.some(m=>m.id===value.messageId));
 if(state.active&&!sessions.has(state.active))state.active=null;
 if(!validFocus(state.readingFocus))state.readingFocus=null;
 state.views=Object.fromEntries(Object.entries(state.views).filter(([key])=>sessions.has(key)));
 for(const [key,view] of Object.entries(state.views))if(view.focus&&(view.focus.sessionId!==key||!validFocus(view.focus)))delete view.focus;
 const messages=new Set(state.sessions.flatMap(s=>s.messages.map(m=>m.id)));
 state.expanded=Object.fromEntries(Object.entries(state.expanded).filter(([key])=>messages.has(key)));
 return state;
}

export function encodeWorkspace(state:Workspace):string {
 // Pick known fields and drop view/expanded entries belonging to closed sessions.
 const ids=new Set(state.sessions.map(s=>s.id));
 const messageIds=new Set(state.sessions.flatMap(s=>s.messages.map(m=>m.id)));
 const raw=JSON.stringify({...state,views:Object.fromEntries(Object.entries(state.views).filter(([key])=>ids.has(key))),expanded:Object.fromEntries(Object.entries(state.expanded).filter(([key])=>messageIds.has(key)))});
 if(raw.length>MAX_WORKSPACE_CHARS)throw new Error('Workspace is too large');
 return raw;
}

export function closeWorkspaceSession<T extends {id:string}>(sessions:T[],active:string|null,id:string){
 const index=sessions.findIndex(s=>s.id===id);
 const remaining=sessions.filter(s=>s.id!==id);
 return {sessions:remaining,active:active===id?(remaining[Math.min(index,remaining.length-1)]?.id??null):active};
}

export function rememberClosedSession(history:ClosedSession[],item:ClosedSession):ClosedSession[] {
 return [item,...history.filter(previous=>previous.session.id!==item.session.id)].slice(0,20);
}
