import assert from 'node:assert/strict';
const base=process.env.CHATPTT_TEST_BASE||'http://127.0.0.1:8893';
async function read(query){const r=await fetch(`${base}/api/ptt?${new URLSearchParams({board:'C_Chat',adult:'1',...query})}`);return {status:r.status,data:await r.json()};}
const score=await read({minScore:'50'});assert.equal(score.status,200,JSON.stringify(score));assert.ok(score.data.posts.length>0);
assert.ok(score.data.posts.every(p=>p.score==='爆'||Number(p.score)>=50));console.log('Minimum recommendation score: passed');
const author=score.data.posts[0].author;
const byAuthor=await read({author});assert.equal(byAuthor.status,200);assert.ok(byAuthor.data.posts.length);assert.ok(byAuthor.data.posts.every(p=>p.author.toLowerCase()===author.toLowerCase()));console.log('Author search:',author,'passed');
const frequentAuthor=author;
const combined=await read({author:frequentAuthor,minScore:'50'});assert.equal(combined.status,200);assert.ok(combined.data.posts.length);assert.ok(combined.data.posts.every(p=>p.author.toLowerCase()===frequentAuthor.toLowerCase()&&(p.score==='爆'||Number(p.score)>=50)));assert.deepEqual(combined.data.filters,{author:frequentAuthor,minScore:'50'});
if(combined.data.previous){const older=await read({author:frequentAuthor,minScore:'50',page:combined.data.previous});assert.equal(older.status,200);assert.ok(older.data.posts.every(p=>p.author.toLowerCase()===frequentAuthor.toLowerCase()&&(p.score==='爆'||Number(p.score)>=50)));if(older.data.posts.length)assert.notEqual(older.data.posts[0].id,combined.data.posts[0].id);console.log('Combined filters and pagination: passed');}
const title=await read({q:'鋼彈',minScore:'10'});assert.equal(title.status,200);assert.ok(title.data.posts.length);assert.ok(title.data.posts.every(p=>p.title.includes('鋼彈')&&(p.score==='爆'||Number(p.score)>=10)));console.log('Title + score: passed');
for(const query of [{author:'author:bad'},{minScore:'1000'},{minScore:'1.5'},{minScore:'NaN'}]){assert.equal((await read(query)).status,400);}console.log('Invalid filters: passed');
