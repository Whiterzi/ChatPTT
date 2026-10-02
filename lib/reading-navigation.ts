type ReadingMessage = { id: string; sourceListId?: string; board?: { board: string }; article?: { board: string; url: string } };

/** Keep an article tied to the exact list/search page that opened it. */
export function readingContext<T extends ReadingMessage>(messages: T[], focusId?: string, sourceListId?: string) {
  const reading = messages.find(m => m.id === focusId && (m.board || m.article)) ?? [...messages].reverse().find(m => m.board || m.article);
  if (!reading) return { reading: undefined, list: undefined };
  if (reading.board) return { reading, list: reading };
  const source = messages.find(m => m.id === (sourceListId ?? reading.sourceListId) && m.board?.board === reading.article?.board);
  const preceding = messages.slice(0, messages.indexOf(reading) + 1);
  return { reading, list: source ?? [...preceding].reverse().find(m => m.board?.board === reading.article?.board) };
}

export function articleMatches(url: string, board: string, postId: string) {
  try { return new URL(url).pathname === `/bbs/${board}/${postId}.html`; } catch { return false; }
}
