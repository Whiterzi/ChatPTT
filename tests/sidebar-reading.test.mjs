import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampSidebarWidth, sidebarWidthLimit } from '../lib/sidebar-size.ts';
import { articleTextSections } from '../lib/article-text.ts';

test('sidebar bounds preserve reading space on narrow desktops and reject invalid sizes',()=>{
 assert.equal(clampSidebarWidth(-100,1440),240);
 assert.equal(clampSidebarWidth(900,1440),480);
 assert.equal(sidebarWidthLimit(768),356);
 assert.equal(clampSidebarWidth(480,768),356);
 assert.equal(clampSidebarWidth(NaN),288);
});

test('PTT footer styling preserves all text, URLs and newlines without dimming quoted content',()=>{
 const body='內文\n※ 引述《測試》之銘言：\n> 引文\n\n※ 發信站: 批踢踢實業坊(ptt.cc)\n※ 文章網址: https://www.ptt.cc/bbs/C_Chat/M.1700000000.A.001.html\n接著補充\n※ 編輯: fixture_user\n';
 const sections=articleTextSections(body);
 assert.equal(sections.map(section=>section.text).join(''),body);
 assert.deepEqual(sections.map(section=>section.metadata),[false,true,false,true]);
 assert.ok(sections[0].text.includes('引述'));
 assert.deepEqual(articleTextSections(''),[]);
 assert.deepEqual(articleTextSections('末行沒有換行'),[{text:'末行沒有換行',metadata:false}]);
});
