import assert from 'node:assert/strict';
const base=process.env.CHATPTT_TEST_BASE || 'http://127.0.0.1:8892';
const home=await fetch(base);assert.equal(home.status,200);assert.ok(!home.url.includes('chatgpt.site'));
const csp=home.headers.get('content-security-policy');
assert.ok(csp.includes("img-src 'self' data: https:;"));assert.ok(csp.includes('media-src https:;'));
assert.ok(csp.includes("connect-src 'self';"));assert.equal(home.headers.get('referrer-policy'),'no-referrer');
const html=await home.text();assert.ok(html.includes('/src/')===false);assert.ok(html.includes('ChatPTT'));assert.ok(!html.includes('使用 ChatGPT 繼續'));
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match=>match[1]);assert.ok(assets.length>=2);
for(const asset of assets){const response=await fetch(new URL(asset,base));assert.equal(response.status,200,asset);const text=await response.text();assert.ok(text.length>0,asset);assert.ok(!text.includes('sites-connectors'));assert.ok(!text.includes('custom-domains.chatgpt.site'));}
assert.equal((await fetch(new URL('/healthz',base))).status,200);
assert.equal((await fetch(new URL('/.env',base))).status,404);
assert.equal((await fetch(new URL('/%2e%2e/%2e%2e/etc/passwd',base))).status,404);
assert.equal((await fetch(new URL('/api/no-such-route',base))).status,404);
assert.equal((await fetch(new URL('/api/ptt',base),{method:'POST'})).status,405);
assert.equal((await fetch(new URL('/api/ptt?board=C_Chat',base))).status,403);
console.log('Self-hosted HTML, assets, health, safe static paths, methods, and age gate: passed');
