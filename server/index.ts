import { createServer, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { siteStructuredData } from "../lib/site.mjs";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { GET as readPtt } from "./ptt";

const structuredDataHash = createHash("sha256").update(siteStructuredData).digest("base64");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../client");
const port = Number(process.env.PORT || 8892);
const origin = process.env.CHATPTT_ORIGIN || "https://chatptt.iswhiter.net";
const allowedHosts = new Set([new URL(origin).host, `127.0.0.1:${port}`, `localhost:${port}`]);
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".ico": "image/x-icon", ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".webmanifest": "application/manifest+json",
};
const buckets = new Map<string, {count:number;until:number}>();
function json(response:ServerResponse, status:number, body:unknown) {
  response.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
  response.end(JSON.stringify(body));
}
const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'sha256-${structuredDataHash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`);
  if (!allowedHosts.has(request.headers.host || "")) return json(response,421,{error:"Unknown host"});
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return json(response,405,{error:"Method not allowed"});
  }
  if ((request.url || "").length > 2048) return json(response,414,{error:"Request URL too long"});
  let url:URL;
  try {url = new URL(request.url || "/",origin);} catch {return json(response,400,{error:"Invalid URL"});}
  try {
    if (["/index.html", "/about/", "/about.html"].includes(url.pathname)) { response.writeHead(308,{Location:url.pathname === "/index.html" ? "/" : "/about"}); response.end(); return; }
    if (url.pathname.startsWith("/api/") || url.pathname === "/healthz") response.setHeader("X-Robots-Tag","noindex, nofollow");
    if (url.pathname === "/healthz") return json(response,200,{status:"ok",service:"chatptt",hosting:"self-hosted"});
    if (url.pathname === "/api/ptt") {
      if(request.method === "HEAD") {response.writeHead(200);response.end();return;}
      const ip = String(request.headers["cf-connecting-ip"] || request.socket.remoteAddress || "local");
      const now=Date.now(),bucket=buckets.get(ip);
      if (bucket && bucket.until > now && bucket.count >= 90) {
        response.setHeader("Retry-After", Math.ceil((bucket.until-now)/1000));
        return json(response,429,{error:"讀取次數較多，請稍等一下再試。"});
      }
      if (!bucket || bucket.until <= now) {
        if(buckets.size>=4096) buckets.delete(buckets.keys().next().value!);
        buckets.set(ip,{count:1,until:now+60_000});
      } else bucket.count++;
      {
        const result=await readPtt(new Request(url));
        result.headers.forEach((value,key)=>response.setHeader(key,value));
        response.statusCode=result.status;
        response.end(Buffer.from(await result.arrayBuffer()));
      }
      return;
    }
    if (url.pathname.startsWith("/api/")) return json(response,404,{error:"Not found"});
    let pathname:string;
    try {pathname=decodeURIComponent(url.pathname);} catch {return json(response,400,{error:"Invalid URL"});}
    if(pathname.includes("\0")||pathname.split("/").some(part=>part.startsWith("."))) return json(response,404,{error:"Not found"});
    const path=resolve(root,"."+(pathname === "/" ? "/index.html" : pathname === "/about" ? "/about.html" : pathname));
    if(!path.startsWith(root+sep)) return json(response,404,{error:"Not found"});
    const info=await stat(path);
    if(!info.isFile()) return json(response,404,{error:"Not found"});
    response.setHeader("Content-Type",mime[extname(path)] || "application/octet-stream");
    response.setHeader("Content-Length",info.size);
    response.setHeader("Cache-Control",pathname.startsWith("/assets/")?"public, max-age=31536000, immutable":"no-cache");
    if(request.method === "HEAD") {response.end();return;}
    const stream=createReadStream(path);
    stream.on("error",()=>response.destroy());
    response.on("close",()=>stream.destroy());
    stream.pipe(response);
  } catch(error) {
    if(!response.headersSent) {
      const missing=(error as NodeJS.ErrnoException).code === "ENOENT";
      json(response,missing?404:500,{error:missing?"Not found":"服務暫時無法處理請求。"});
    } else response.destroy();
  }
});
server.requestTimeout=25_000;
server.headersTimeout=10_000;
server.keepAliveTimeout=5_000;
server.listen(port,"127.0.0.1",()=>console.log(`ChatPTT listening on http://127.0.0.1:${port}`));
for(const signal of ["SIGINT","SIGTERM"] as const) process.on(signal,()=>{
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),5000).unref();
});
