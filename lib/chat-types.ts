import type { SearchFilters } from './search';

export type Post = { id:string; title:string; author:string; date:string; score:string; pinned:boolean };
export type Comment = { tag:string; user:string; text:string; time:string; continuation?:string };
export type Article = { title:string; author:string; date:string; body:string; comments:Comment[]; discussionVersion?:1; url:string; board:string };
export type BoardResult = { board:string; posts:Post[]; previous:string|null; query:string; filters:SearchFilters; url:string };
export type LoadOptions = SearchFilters & {page?:string;query?:string;article?:string;archivePath?:string;prompt?:string;fresh?:boolean;sourceListId?:string;targetSessionId?:string};
export type RetryRequest = { kind:'board'|'article'; board:string; options:LoadOptions };
export type Message = { id:string; role:'user'|'assistant'; sourceListId?:string; text?:string; board?:BoardResult; article?:Article; error?:boolean; retry?:RetryRequest };
export type Session = { id:string; title:string; messages:Message[]; board:string; articleKey?:string };
export type ReadingFocus = {sessionId:string;messageId:string;listId?:string};
export type SessionView = {top:number;anchorId?:string;offset?:number;draft:string;focus?:ReadingFocus};
export type ClosedSession = {session:Session;index:number;view?:SessionView;expanded:Record<string,boolean>;closedAt:number};
export type Workspace = {version:1;sessions:Session[];closedSessions:ClosedSession[];active:string|null;input:string;readingFocus:ReadingFocus|null;expanded:Record<string,boolean>;views:Record<string,SessionView>;sidebarOpen:boolean;sidebarWidth:number};
