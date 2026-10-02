export type SearchFilters = { author?: string; minScore?: string };

export function searchDescription(query: string, filters: SearchFilters = {}) {
  return [query ? `標題「${query}」` : "", filters.author ? `作者 ${filters.author}` : "", filters.minScore !== undefined && filters.minScore !== "" ? `推文分數至少 ${filters.minScore}` : ""].filter(Boolean).join("、");
}

// Optional shortcuts can be combined with ordinary title keywords.
export function parseSearchCommand(text: string) {
  let author: string | undefined, minScore: string | undefined;
  const query = text
    .replace(/(?:作者|author)\s*[:：]\s*([A-Za-z][A-Za-z0-9_]{0,29})(?=\s|$)/gi, (_, value) => { author = value; return " "; })
    .replace(/(?:推文(?:分數|數)?|推數|recommend)\s*[:：]\s*(-?\d+)(?=\s|$)/gi, (_, value) => { minScore = value; return " "; })
    .replace(/\s+/g, " ").trim();
  return { query, author, minScore, hasFilters: author !== undefined || minScore !== undefined };
}
