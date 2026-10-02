import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from 'cheerio/slim';
import { parseArticleContent } from '../server/article-content.ts';
import { articleImages } from '../lib/image-links.ts';
import { articlePlainText } from '../lib/article-text.ts';

const push=(text,user='fixture_reader',tag='推')=>`<div class="push"><span class="push-tag">${tag} </span><span class="push-userid">${user}</span><span class="push-content">: ${text}</span><span class="push-ipdatetime"> 192.0.2.1 10/02 12:34</span></div>`;
const parse=html=>parseArticleContent(load(`<div id="main-content">${html}</div>`));

test('inline replies stay after their preceding push, including multiple lines and trailing edits',()=>{
 const {body,comments}=parse(`
<div class="article-metaline"><span class="article-meta-tag">作者</span><span class="article-meta-value">fixture_author</span></div>
文章開頭\n第二段\n※ 發信站: 批踢踢實業坊(ptt.cc)
${push('第一個問題')}
<span class="f2">第一個回答</span><br>回答第二行
※ 編輯: fixture_author
${push('第二個問題')}
第二個回答
${push('作者用一般推文回應','fixture_author','→')}
${push('最後一則推文')}
最後補充\n※ 編輯: fixture_author
<script>unwantedScript()</script><style>.unwanted{}</style><!-- not article text -->`);
 assert.equal(body,'文章開頭\n第二段\n※ 發信站: 批踢踢實業坊(ptt.cc)');
 assert.equal(comments.length,4);
 assert.deepEqual(comments[0],{tag:'推',user:'fixture_reader',text:'第一個問題',time:'10/02 12:34',continuation:'第一個回答\n回答第二行\n※ 編輯: fixture_author'});
 assert.equal(comments[1].continuation,'第二個回答');
 assert.equal(comments[2].user,'fixture_author');
 assert.equal(comments[2].tag,'→');
 assert.equal(comments[2].continuation,undefined);
 assert.equal(comments[3].continuation,'最後補充\n※ 編輯: fixture_author');
});

test('ordinary articles, adjacent pushes and nested wrappers retain all visible text once',()=>{
 assert.deepEqual(parse('只有內文<br>&lt;不是標籤&gt;'),{body:'只有內文\n<不是標籤>',comments:[]});
 const data=parse(`本文<section>${push('問題一')}\n${push('問題二')}<span>回答 <b>重點</b></span></section>${push('問題三')}`);
 assert.equal(data.body,'本文');assert.equal(data.comments.length,3);
 assert.equal(data.comments[0].continuation,undefined);
 assert.equal(data.comments[1].continuation,'回答 重點');
 assert.equal(data.comments[2].continuation,undefined);
 assert.equal(parse(push('只有推文')).body,'');
});

test('reply images, links and copied text follow the same order as the source discussion',()=>{
 const data=parse(`本文 https://images.example.com/body.png
${push('附圖 https://images.example.com/comment.png')}
回覆附圖 <a href="https://images.example.com/reply.webp">https://images.example.com/reply.webp</a>
<div class="richcontent"><a href="https://images.example.com/reply.webp">preview</a><iframe src="https://example.com/embed"></iframe></div>
${push('下一則 https://images.example.com/next.gif')}
<span>最後回答</span>`);
 assert.ok(!data.body.includes('回覆附圖'));
 assert.ok(data.comments[0].continuation.includes('https://images.example.com/reply.webp'));
 assert.deepEqual(articleImages(data).map(image=>[image.src,image.source]),[
  ['https://images.example.com/body.png','文章內文'],
  ['https://images.example.com/comment.png','推文 · fixture_reader'],
  ['https://images.example.com/reply.webp','原文補充'],
  ['https://images.example.com/next.gif','推文 · fixture_reader'],
 ]);
 const copied=articlePlainText({...data,title:'測試文章',url:'https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html'});
 let previous=-1;
 for(const text of ['測試文章','本文','推 fixture_reader: 附圖','回覆附圖','推 fixture_reader: 下一則','最後回答','https://www.ptt.cc/bbs/']){
  const position=copied.indexOf(text);assert.ok(position>previous,text);previous=position;
 }
 assert.ok(!copied.includes('preview'));
});
