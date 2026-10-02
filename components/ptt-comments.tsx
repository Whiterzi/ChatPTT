import { Fragment, type ComponentProps } from 'react';
import { RichText } from '@/components/ptt-rich-text';
import { articleTextSections } from '@/lib/article-text';
import type { Comment } from '@/lib/chat-types';

export function PttComments({comments,...options}:{comments:Comment[]}&Omit<ComponentProps<typeof RichText>,'text'|'mutedMetadata'>){
 return <>{comments.map((comment,index)=><Fragment key={index}>
  <div className="comment">
   <span className={`comment-tag ${comment.tag==='推'?'up':comment.tag==='噓'?'down':''}`}>{options.quiet?'·':comment.tag}</span>
   <div><span className="comment-user">{comment.user}</span><p><RichText text={comment.text} {...options}/></p></div>
   <time>{comment.time}</time>
  </div>
  {comment.continuation&&<div className="comment-continuation">
   {articleTextSections(comment.continuation).some(part=>!part.metadata&&part.text.trim())&&<span className="comment-continuation-label">原文補充</span>}
   <div className="article-body"><RichText text={comment.continuation} mutedMetadata {...options}/></div>
  </div>}
 </Fragment>)}</>;
}
