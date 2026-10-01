import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173/api/ptt';
async function read(query){const response=await fetch(`${base}?${new URLSearchParams(query)}`);return {status:response.status,data:await response.json()};}
const board=await read({board:'C_Chat',adult:'1'});
assert.equal(board.status,200,JSON.stringify(board));assert.ok(board.data.posts.length>0);assert.ok(board.data.previous);console.log('Live board:',board.data.board,board.data.posts.length,'posts');
const post=board.data.posts.find(p=>!p.pinned&&Number(p.score)>5)||board.data.posts.find(p=>!p.pinned);
const article=await read({board:'C_Chat',adult:'1',article:post.id});
assert.equal(article.status,200,JSON.stringify(article));assert.ok(article.data.body.length>0);assert.ok(article.data.title);assert.ok(Array.isArray(article.data.comments));console.log('Live article: body and',article.data.comments.length,'comments parsed');
const older=await read({board:'C_Chat',adult:'1',page:board.data.previous});assert.equal(older.status,200);assert.ok(older.data.posts.length);assert.notEqual(older.data.posts[0].id,post.id);console.log('Pagination: passed');
const search=await read({board:'C_Chat',adult:'1',q:'鋼彈'});assert.equal(search.status,200,JSON.stringify(search));assert.ok(search.data.posts.length);assert.ok(search.data.posts.every(p=>p.title.includes('鋼彈')));assert.ok(Number(search.data.posts[0].id.split('.')[1])>=Number(search.data.posts.at(-1).id.split('.')[1]));console.log('Search: passed,',search.data.posts.length,'matches');
const discussed=search.data.posts.find((p,i)=>i>3&&Number(p.score)>5);assert.ok(discussed);const comments=await read({board:'C_Chat',adult:'1',article:discussed.id});assert.equal(comments.status,200);assert.ok(comments.data.comments.length>0);assert.ok(comments.data.comments.every(c=>c.user&&typeof c.text==='string'));console.log('Real comments:',comments.data.comments.length,'parsed');
for(const [query,status] of [[{board:'C_Chat'},403],[{board:'../admin',adult:'1'},400],[{board:'C_Chat',adult:'1',article:'../index'},400],[{board:'C_Chat',adult:'1',page:'bad'},400]]){const response=await read(query);assert.equal(response.status,status);}console.log('Invalid input and age gate: passed');
const missing=await read({board:'chatptt_no_such_board_xyz',adult:'1'});assert.equal(missing.status,404);console.log('Missing board: passed');
