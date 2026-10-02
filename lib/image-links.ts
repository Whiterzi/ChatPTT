// Decode media in the visitor's browser; never fetch or proxy arbitrary URLs on the server.
const imageExtension = /\.(?:jpe?g|jpe|jfif|png|apng|gif|webp|avif|bmp|dib|svg|ico|cur|tiff?|heic|heif|jxl)$/i;
const imageFormat = /^(?:image\/)?(?:jpe?g|jpe|jfif|png|apng|gif|webp|avif|bmp|svg(?:\+xml)?|ico|tiff?|heic|heif|jxl)$/i;

export function imagePreviewUrl(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // Only public DNS names: don't turn article text into requests to local devices.
  if (!host.includes(".") || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)) return null;
  url.protocol = "https:";
  url.hash = "";
  if (host === "i.verb.tw" && /^\/[A-Za-z0-9_-]{4,80}\/?$/.test(url.pathname)) { url.pathname=url.pathname.replace(/\/$/, "")+".jpg"; return url.href; }
  if (host === "img.verb.tw" && /^\/view\/[A-Za-z0-9_-]{4,80}\/?$/.test(url.pathname)) { url.hostname="i.verb.tw";url.pathname=url.pathname.replace(/^\/view/, "").replace(/\/$/, "")+".jpg";return url.href; }
  if (["imgur.com", "www.imgur.com", "m.imgur.com", "i.imgur.com"].includes(host)) {
    const match = url.pathname.match(/^\/([A-Za-z0-9]{5,12})(?:\.(jpe?g|png|gif|webp|avif|apng|gifv|mp4|webm))?\/?$/i);
    if (!match) return null; // Albums and gallery pages are not individual images.
    url.hostname = "i.imgur.com";
    url.pathname = `/${match[1]}.${match[2]?.toLowerCase() === "gifv" ? "mp4" : match[2] || "jpg"}`;
    return url.href;
  }
  // X also uses /media/id.jpg:large, in addition to ?format=jpg&name=large.
  if (host === "pbs.twimg.com" && /^\/(?:media|tweet_video_thumb)\//.test(url.pathname)) {
    const sized = url.pathname.match(/^(.*\.(?:jpe?g|png|webp|gif)):(orig|large|medium|small|thumb)$/i);
    if (sized) { url.pathname = sized[1]; url.searchParams.set("name", sized[2]); }
    if (imageExtension.test(url.pathname) || imageFormat.test(url.searchParams.get("format") || "")) return url.href;
  }
  // A direct media URL can be hosted anywhere; preserve signed query parameters.
  if (imageExtension.test(url.pathname) || /\.(?:mp4|webm)$/i.test(url.pathname)) return url.href;
  for (const name of ["format", "fm", "output", "ext", "content-type", "response-content-type"]) {
    if (imageFormat.test(url.searchParams.get(name) || "")) return url.href;
  }
  for (const name of ["filename", "file", "image", "img"]) {
    if (imageExtension.test(url.searchParams.get(name) || "")) return url.href;
  }
  // These CDN endpoints serve images without file extensions, including resize suffixes.
  if (url.pathname !== "/" && (["images.plurk.com", "i.meee.com.tw", "i.ibb.co", "i.postimg.cc"].includes(host) || /(?:^|\.)googleusercontent\.com$/.test(host))) return url.href;
  return null;
}

export function previewMediaKind(src: string): "image" | "video" {
  try { return /\.(?:mp4|webm)$/i.test(new URL(src).pathname) ? "video" : "image"; } catch { return "image"; }
}

// Verb requires a Referer on browser image requests. Origin is sufficient and
// avoids exposing the current path: https://img.verb.tw/home/developers/
export function imageReferrerPolicy(src: string): "origin" | "no-referrer" {
  try { return new URL(src).hostname === "i.verb.tw" ? "origin" : "no-referrer"; } catch { return "no-referrer"; }
}

export type ImageSize = "small" | "medium" | "large";
export type ImageMode = "links" | ImageSize;
export type ImageDisplay = "links" | "inline" | "floating";
export type ImagePreferences = { display: ImageDisplay; size: ImageSize };
export type ArticleImage = { href: string; src: string; source: string };
export const defaultImagePreferences: ImagePreferences = { display: "links", size: "medium" };
export const imageSizes = { small: 160, medium: 360, large: 680 };

export function readImagePreferences(saved: string | null, legacy: string | null): ImagePreferences {
  try {
    const value = JSON.parse(saved || "null");
    if (value && ["links", "inline", "floating"].includes(value.display) && ["small", "medium", "large"].includes(value.size)) return { display: value.display, size: value.size };
  } catch { /* Fall back to the previous preference or the default. */ }
  if (legacy && ["small", "medium", "large"].includes(legacy)) return { display: "inline", size: legacy as ImageSize };
  return { ...defaultImagePreferences };
}

export const splitImageLinks = (text: string) => text.split(/(https?:\/\/[^\s<>"\u3000，。；！？「」『』【】]+)/g);
export const cleanImageLink = (text: string) => text.replace(/[。，、；！？）\])]+$/, "");

export function articleImages(article: { body: string; comments: { user: string; text: string; continuation?:string }[] }): ArticleImage[] {
  const seen = new Set<string>();
  const images: ArticleImage[] = [];
  for (const item of [{ text: article.body, source: "文章內文" }, ...article.comments.flatMap(c => [{ text: c.text, source: `推文 · ${c.user}` },{text:c.continuation??"",source:"原文補充"}])]) {
    for (const part of splitImageLinks(item.text)) {
      if (!/^https?:\/\//.test(part)) continue;
      const href = cleanImageLink(part), src = imagePreviewUrl(href);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      images.push({ href, src, source: item.source });
    }
  }
  return images;
}
