// PTT's AID alphabet and 48-bit layout: common/bbs/aids.c in ptt/pttbbs.
// https://github.com/ptt/pttbbs/blob/master/common/bbs/aids.c
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const boardPattern = /^[A-Za-z][A-Za-z0-9_-]{0,29}$/;
export type ArticleReference = { board: string; article: string; url: string; aid: string | null; kind: "url" | "aid"; explicitBoard: boolean; archivePath?: string };

export function articleIdToAid(article: string): string | null {
  const match = article.match(/^M\.(\d{1,10})\.A\.([0-9A-Fa-f]{3})$/);
  if (!match) return null;
  const timestamp = Number(match[1]);
  if (timestamp <= 0 || timestamp > 0xffffffff) return null;
  let value = timestamp * 4096 + parseInt(match[2], 16), result = "";
  for (let i = 0; i < 8; i++) { result = alphabet[value % 64] + result; value = Math.floor(value / 64); }
  return `#${result}`;
}

export function aidToArticleId(aid: string): string | null {
  const code = aid.replace(/^#/, "");
  if (!/^[0-9A-Za-z_-]{8}$/.test(code)) return null;
  const value = [...code].reduce((number, char) => number * 64 + alphabet.indexOf(char), 0);
  // The upper four bits describe the file type; only normal M articles use /bbs/.
  if (value >= 2 ** 44) return null;
  const timestamp = Math.floor(value / 4096);
  if (timestamp <= 0) return null;
  return `M.${timestamp}.A.${(value % 4096).toString(16).toUpperCase().padStart(3, "0")}`;
}

export function parseArticleReference(raw: string, fallbackBoard = "C_Chat"): ArticleReference | null {
  const text = raw.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (/\s/.test(text) || !['www.ptt.cc', 'ptt.cc'].includes(url.hostname) || url.username || url.password || url.port) return null;
      const archive = url.pathname.match(/^\/man\/([A-Za-z][A-Za-z0-9_-]{0,29})\/(?:D[0-9A-Fa-f]{1,16}\/){0,32}(M\.\d{8,14}\.A\.[A-Za-z0-9]{1,8})\.html$/);
      // An AID cannot encode the archive directories, and archive copies can have
      // different filenames from the original post. Keep the exact archive URL.
      if (archive) return { board: archive[1], article: archive[2], url: `https://www.ptt.cc${url.pathname}`, aid: null, kind: "url", explicitBoard: true, archivePath: url.pathname };
      const match = url.pathname.match(/^\/bbs\/([A-Za-z][A-Za-z0-9_-]{0,29})\/(M\.\d{8,14}\.A\.[A-Za-z0-9]{1,8})\.html$/);
      if (!match) return null;
      return { board: match[1], article: match[2], url: `https://www.ptt.cc${url.pathname}`, aid: articleIdToAid(match[2]), kind: "url", explicitBoard: true };
    } catch { return null; }
  }
  const clean = text.replace(/^(?:※\s*)?(?:文章代碼\s*(?:\(AID\))?|AID)\s*[:：]\s*/i, "");
  const suffix = clean.match(/^#([0-9A-Za-z_-]{8})(?:\s*(?:[（(]([A-Za-z][A-Za-z0-9_-]{0,29})[）)]|@([A-Za-z][A-Za-z0-9_-]{0,29})))?$/);
  const prefix = clean.match(/^([A-Za-z][A-Za-z0-9_-]{0,29})\s+#([0-9A-Za-z_-]{8})$/);
  const match = suffix ?? (prefix ? [prefix[0], prefix[2], prefix[1]] : null);
  if (!match) return null;
  const article = aidToArticleId(match[1]), board = match[2] || match[3] || fallbackBoard;
  if (!article || !boardPattern.test(board)) return null;
  return { board, article, url: `https://www.ptt.cc/bbs/${board}/${article}.html`, aid: `#${match[1]}`, kind: "aid", explicitBoard: !!(match[2] || match[3]) };
}
