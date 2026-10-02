import type { CheerioAPI } from 'cheerio/slim';
import type { Comment } from '../lib/chat-types';

const clean = (text:string) => text.replace(/\u0000/g,'').trim();

/** Text after a push belongs at that position, not back in the article body. */
export function parseArticleContent($:CheerioAPI) {
 const content=$('#main-content');
 content.find('.article-metaline, .article-metaline-right, script, style').remove();
 content.find('br').replaceWith('\n');
 content.find('.richcontent').each((_,el)=>{
  const links=$(el).find('a[href]').map((_,a)=>$(a).attr('href')).get().filter(s=>s&&/^https?:\/\//.test(s));
  $(el).text(links.length?`\n${links.join('\n')}\n`:'');
 });
 const comments:Comment[]=[];
 let body='',pending='';
 function flush(){
  const text=clean(pending);pending='';
  if(!text)return;
  const previous=comments.at(-1);
  if(previous)previous.continuation=text;
  else body=text;
 }
 function visit(nodes:ReturnType<typeof content.contents>){
  nodes.each((_,node)=>{
   if(node.type==='text'){pending+=node.data;return;}
   if(node.type!=='tag')return;
   const element=$(node);
   if(!element.hasClass('push')){visit(element.contents());return;}
   flush();
   comments.push({
    tag:clean(element.find('.push-tag').text()),
    user:clean(element.find('.push-userid').text()),
    text:element.find('.push-content').text().replace(/^:\s?/,''),
    time:clean(element.find('.push-ipdatetime').text()).replace(/^(?:\d{1,3}\.){3}\d{1,3}\s*/,''),
   });
  });
 }
 visit(content.contents());flush();
 return {body,comments};
}
