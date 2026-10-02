import type { Article } from './chat-types';

/** Keep inserted replies with their surrounding discussion when copying. */
export function articlePlainText(article:Pick<Article,'title'|'body'|'comments'|'url'>){
 return [article.title,article.body,...article.comments.flatMap(comment=>[
  `${comment.tag} ${comment.user}: ${comment.text}${comment.time?` ${comment.time}`:''}`,
  ...(comment.continuation?[comment.continuation]:[]),
 ]),article.url].join('\n\n');
}

/** Keep source text intact while giving PTT's footer metadata a quieter style. */
export function articleTextSections(text:string) {
 const sections:{text:string;metadata:boolean}[]=[];
 for(const line of text.match(/[^\n]*(?:\n|$)/g)??[]){
  if(!line)continue;
  const metadata=/^\s*※\s*(?:發信站|文章網址|文章代碼|編輯|轉錄(?:者|至)?|來自)\s*[:：]/.test(line);
  const previous=sections.at(-1);
  if(previous?.metadata===metadata)previous.text+=line;
  else sections.push({text:line,metadata});
 }
 return sections;
}
