import assert from 'node:assert/strict';
import { test } from 'node:test';
import { articleMatches, readingContext } from '../lib/reading-navigation.ts';

const first={id:'page-one',board:{board:'C_Chat',query:'first search'}};
const second={id:'page-two',board:{board:'C_Chat',query:'second search'}};
const oldArticle={id:'article-one',sourceListId:first.id,article:{board:'C_Chat',url:'https://www.ptt.cc/bbs/C_Chat/M.1.A.AAA.html'}};

test('reading an article from an earlier list keeps that exact source page',()=>{
 const messages=[first,second,oldArticle];
 assert.equal(readingContext(messages).list,first);
 assert.equal(readingContext(messages,second.id).list,second);
 assert.equal(readingContext(messages,oldArticle.id,second.id).list,second);
 assert.equal(readingContext(messages,first.id).reading,first);
});

test('direct links only fall back to preceding lists from the same board',()=>{
 const other={id:'other',board:{board:'NBA'}};
 const direct={id:'direct',article:oldArticle.article};
 assert.equal(readingContext([first,other,direct]).list,first);
 assert.equal(readingContext([other,direct,first],direct.id).list,undefined);
 assert.equal(readingContext([first,oldArticle,{id:'loading'}]).reading,oldArticle);
 assert.equal(readingContext([]).list,undefined);
});

test('cached articles match the board and exact post, including a URL fragment',()=>{
 assert.equal(articleMatches(oldArticle.article.url+'#comments','C_Chat','M.1.A.AAA'),true);
 assert.equal(articleMatches(oldArticle.article.url,'NBA','M.1.A.AAA'),false);
 assert.equal(articleMatches(oldArticle.article.url,'C_Chat','M.1.A.AA'),false);
 assert.equal(articleMatches('not a url','C_Chat','M.1.A.AAA'),false);
});
