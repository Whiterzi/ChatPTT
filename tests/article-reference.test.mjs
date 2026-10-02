import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aidToArticleId, articleIdToAid, parseArticleReference } from '../lib/article-reference.ts';

test('AID uses the PTT alphabet, preserves leading zeros, and avoids signed 32-bit truncation',()=>{
 const vectors=[['#00000101','M.1.A.001'],['#10000000','M.1073741824.A.000'],['#20000000','M.2147483648.A.000'],['#3_______','M.4294967295.A.FFF'],['#1bK_4001','M.1700000000.A.001']];
 for(const [aid,id] of vectors){assert.equal(aidToArticleId(aid),id);assert.equal(articleIdToAid(id),aid);}
 for(const input of ['#00000000','#40000000','#zzzzzzzz','#1bK_400','##1bK_4001','#1bK_400!'])assert.equal(aidToArticleId(input),null,input);
 for(const input of ['M.4294967296.A.001','M.0.A.001','G.1700000000.A.001','M.1700000000.A.X01'])assert.equal(articleIdToAid(input),null,input);
});

test('PTT URL recognition normalizes supported hosts without accepting external or malformed URLs',()=>{
 const expected={board:'C_Chat',article:'M.1700000000.A.001',url:'https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html',aid:'#1bK_4001',kind:'url',explicitBoard:true};
 assert.deepEqual(parseArticleReference('http://ptt.cc/bbs/C_Chat/M.1700000000.A.001.html?from=share#comments'),expected);
 for(const input of ['https://www.ptt.cc.evil.example/bbs/C_Chat/M.1700000000.A.001.html','https://evil.example/?next=https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html','https://name@www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html','https://www.ptt.cc:8080/bbs/C_Chat/M.1700000000.A.001.html','javascript:alert(1)','https://www.ptt.cc/bbs/C_Chat/index.html','https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html\nother text'])assert.equal(parseArticleReference(input),null,input);
});

test('AID accepts explicit board formats and uses the selected board only when omitted',()=>{
 for(const input of ['#1bK_4001 (NBA)','#1bK_4001（NBA）','#1bK_4001@NBA','NBA #1bK_4001','※ 文章代碼(AID): #1bK_4001 (NBA)']){
  const result=parseArticleReference(input,'C_Chat');assert.equal(result.board,'NBA');assert.equal(result.explicitBoard,true);assert.equal(result.article,'M.1700000000.A.001');
 }
 const bare=parseArticleReference('#1bK_4001','Tech_Job');assert.equal(bare.board,'Tech_Job');assert.equal(bare.explicitBoard,false);
 assert.equal(parseArticleReference('#1bK_4001','../../etc'),null);
 assert.equal(parseArticleReference('#1bK_4001 #1bK_4102'),null);
 assert.equal(parseArticleReference('搜尋 #1bK_4001'),null);
});

test('archive links preserve their complete location instead of generating an unrelated AID',()=>{
 const path='/man/C_Chat/D20B/D522/DB8F/M.1700000000.A.001.html';
 assert.deepEqual(parseArticleReference(`http://ptt.cc${path}?from=share#comments`),{
  board:'C_Chat',article:'M.1700000000.A.001',url:`https://www.ptt.cc${path}`,aid:null,kind:'url',explicitBoard:true,archivePath:path,
 });
 assert.equal(parseArticleReference('https://www.ptt.cc/man/C_Chat/M.1700000000.A.001.html').archivePath,'/man/C_Chat/M.1700000000.A.001.html');
 assert.equal(parseArticleReference('https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html').aid,'#1bK_4001');
 for(const path of ['/man/C_Chat/index.html','/man/C_Chat/D20B/index.html','/man/C_Chat/arbitrary/M.1700000000.A.001.html','/man/C_Chat/D20B/not-an-article.html','/man/C_Chat/D20B/M.1700000000.A.001.html/extra'])assert.equal(parseArticleReference(`https://www.ptt.cc${path}`),null,path);
 assert.equal(parseArticleReference(`https://www.ptt.cc.evil.example${path}`),null);
});
