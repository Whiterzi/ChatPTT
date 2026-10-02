import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RequestCache, UpstreamBusyError } from '../server/request-cache.ts';
import { imagePreviewUrl, imageReferrerPolicy, previewMediaKind, articleImages, readImagePreferences } from '../lib/image-links.ts';
import { parseSearchCommand, searchDescription } from '../lib/search.ts';

test('100 simultaneous visitors share one upstream read; cache expires', async () => {
 let now=0,calls=0;
 const cache=new RequestCache({ttl:30_000,maxEntries:5,maxBytes:1024,concurrency:2,perMinute:10},()=>now);
 const read=async()=>{calls++;return {ok:true};};
 const responses=await Promise.all(Array.from({length:100},()=>cache.read('same',read)));
 assert.equal(calls,1);assert.ok(responses.every(body=>JSON.parse(body).ok));
 now=29_999;await cache.read('same',read);assert.equal(calls,1);
 now=30_001;await cache.read('same',read);assert.equal(calls,2);
});

test('busy upstream does not block cache hits or duplicate requests; failures recover', async () => {
 const cache=new RequestCache({ttl:30_000,maxEntries:5,maxBytes:1024,concurrency:1,perMinute:10});
 await cache.read('cached',async()=>({ready:true}));
 let complete;const slow=cache.read('slow',()=>new Promise(resolve=>{complete=resolve;}));
 await Promise.resolve();
 const duplicate=cache.read('slow',()=>{throw Error('should share');});
 await assert.rejects(cache.read('different',async()=>({})),UpstreamBusyError);
 assert.equal(JSON.parse(await cache.read('cached',()=>{})).ready,true);
 complete({done:true});await Promise.all([slow,duplicate]);
 await assert.rejects(cache.read('failure',async()=>{throw Error('upstream failed');}),/upstream failed/);
 assert.equal(await cache.read('failure',async()=>({recovered:true})),'{"recovered":true}');
});

test('upstream rate and byte budgets are enforced, then recover', async () => {
 let now=0,calls=0;
 const cache=new RequestCache({ttl:30_000,maxEntries:5,maxBytes:20,concurrency:2,perMinute:3},()=>now);
 const read=async()=>{calls++;return '1234567890';};
 await cache.read('one',read);await cache.read('two',read);await cache.read('one',read);assert.equal(calls,3);
 await assert.rejects(cache.read('three',read),UpstreamBusyError);
 now=60_001;await cache.read('three',read);assert.equal(calls,4);
});

test('author and score shortcuts compose with title search, including zero', () => {
 const value=parseSearchCommand('鋼彈 作者:fixture_user 推文:0');
 assert.deepEqual(value,{query:'鋼彈',author:'fixture_user',minScore:'0',hasFilters:true});
 assert.equal(searchDescription(value.query,value),'標題「鋼彈」、作者 fixture_user、推文分數至少 0');
 assert.equal(parseSearchCommand('author:fixture_user recommend:50').query,'');
 assert.equal(parseSearchCommand('一般標題').hasFilters,false);
});

test('gallery preserves body/comment order, strips punctuation and deduplicates share/direct links', () => {
 const images=articleImages({body:'附圖 https://imgur.com/Abc1234。\nhttps://example.com/untrusted.jpg\nhttps://i.imgur.com/Def5678.png',comments:[{user:'fixture_user',text:'重複 https://i.imgur.com/Abc1234.jpg，新圖 https://i.imgur.com/Ghi9012.webp）'}]});
 assert.deepEqual(images.map(image=>[image.src,image.source]),[
  ['https://i.imgur.com/Abc1234.jpg','文章內文'],
  ['https://example.com/untrusted.jpg','文章內文'],
  ['https://i.imgur.com/Def5678.png','文章內文'],
  ['https://i.imgur.com/Ghi9012.webp','推文 · fixture_user'],
 ]);
 assert.equal(images[0].href,'https://imgur.com/Abc1234');
 assert.deepEqual(articleImages({body:'沒有附圖',comments:[]}),[]);
});

test('image settings migrate legacy sizes and recover from invalid browser storage', () => {
 assert.deepEqual(readImagePreferences(null,'large'),{display:'inline',size:'large'});
 assert.deepEqual(readImagePreferences('{broken','small'),{display:'inline',size:'small'});
 assert.deepEqual(readImagePreferences('{"display":"floating","size":"small"}','large'),{display:'floating',size:'small'});
 for(const saved of ['null','[]','{"display":"floating","size":"huge"}','{"display":"all","size":"small"}']) assert.deepEqual(readImagePreferences(saved,null),{display:'links',size:'medium'});
});

test('supported image links normalize without embedding arbitrary pages or schemes', () => {
 assert.equal(imagePreviewUrl('http://imgur.com/Abc1234'),'https://i.imgur.com/Abc1234.jpg');
 assert.equal(imagePreviewUrl('https://i.imgur.com/Abc1234.png'),'https://i.imgur.com/Abc1234.png');
 assert.equal(imagePreviewUrl('https://pbs.twimg.com/media/test?format=jpg&name=small'),'https://pbs.twimg.com/media/test?format=jpg&name=small');
 for(const url of ['https://imgur.com/a/album','https://imgur.com/gallery/Abc1234','https://example.com/gallery','http://127.0.0.1/pic.png','javascript:alert(1)','https://i.imgur.com.evil.test/image.jpg','https://192.168.1.10/image.png','https://[::1]/image.png','http://2130706433/pic.jpg','https://printer.local/pic.png','https://localhost./pic.jpg','https://user:pass@i.imgur.com/Abc1234.png','https://i.imgur.com/Abc1234.svg']) assert.equal(imagePreviewUrl(url),null,url);
});


test('direct images support public hosts, modern formats and signed CDN URLs', () => {
 for (const ext of ['jpg','jpeg','JPG','jfif','png','apng','gif','webp','avif','bmp','svg','ico','tif','tiff','heic','heif','jxl']) {
  const url=`https://images.example.com/photo.${ext}`;
  assert.equal(imagePreviewUrl(url),url);
  assert.equal(previewMediaKind(url),'image');
 }
 const urls=[
  'https://cdn.discordapp.com/attachments/123/456/photo.webp?ex=abc&is=def&hm=ghi',
  'https://truth.bahamut.com.tw/s01/202610/fixture.JPG?w=1000',
  'https://cdn.example.com/image?id=123&format=avif',
  'https://cdn.example.com/image?id=123&fm=webp',
  'https://cdn.example.com/get.php?file=photo.png',
  'https://cdn.example.com/object?response-content-type=image%2Fpng&signature=abc%2F123',
  'https://lh3.googleusercontent.com/fixture=w800-h600',
  'https://images.plurk.com/fixture',
 ];
 for(const url of urls) assert.equal(imagePreviewUrl(url),url);
 assert.equal(imagePreviewUrl('https://pbs.twimg.com/media/fixture.jpg:large'),'https://pbs.twimg.com/media/fixture.jpg?name=large');
 assert.equal(imagePreviewUrl('https://images.example.com/photo.png#section'),'https://images.example.com/photo.png');
 assert.equal(imagePreviewUrl('https://images.example.com/photo.jpg.exe'),null);
 assert.equal(imagePreviewUrl('https://example.com/?format=html'),null);
});

test('GIFV is normalized to video and gallery includes animations without losing source links', () => {
 assert.equal(imagePreviewUrl('https://imgur.com/Abc1234.gifv'),'https://i.imgur.com/Abc1234.mp4');
 assert.equal(imagePreviewUrl('https://i.imgur.com/Abc1234.gifv?download=1'),'https://i.imgur.com/Abc1234.mp4?download=1');
 for(const src of ['https://i.imgur.com/Abc1234.mp4','https://media.example.com/clip.webm?token=123']) assert.equal(previewMediaKind(src),'video');
 const images=articleImages({body:'https://imgur.com/Abc1234.gifv，動圖https://i.imgur.com/Abc1234.mp4。圖：https://images.example.com/photo.avif',comments:[{user:'fixture_user',text:'https://images.example.com/animated.apng）'}]});
 assert.equal(images.length,3);
 assert.equal(images[0].href,'https://imgur.com/Abc1234.gifv');
 assert.equal(images[0].src,'https://i.imgur.com/Abc1234.mp4');
 assert.equal(images[1].src,'https://images.example.com/photo.avif');
 assert.equal(images[2].source,'推文 · fixture_user');
});


test('Verb supports extensionless images and sends only the origin for its exact image host',()=>{
 assert.equal(imagePreviewUrl('https://i.verb.tw/Abcd1234'),'https://i.verb.tw/Abcd1234.jpg');
 assert.equal(imagePreviewUrl('https://i.verb.tw/Abcd1234.jpg'),'https://i.verb.tw/Abcd1234.jpg');
 assert.equal(imageReferrerPolicy('https://i.verb.tw/Abcd1234'),'origin');
 assert.equal(imagePreviewUrl('https://img.verb.tw/view/Abcd1234'),'https://i.verb.tw/Abcd1234.jpg');
 for(const url of ['https://i.imgur.com/Abcd123.jpg','https://i.verb.tw.evil.com/Abcd1234.jpg','data:image/png;base64,abc'])assert.equal(imageReferrerPolicy(url),'no-referrer');
});
