// Share simultaneous reads and bound both cached data and upstream work.
export class UpstreamBusyError extends Error {}
export class RequestCache {
  private entries = new Map<string, { body: string; expires: number; bytes: number }>();
  private pending = new Map<string, Promise<string>>();
  private bytes = 0;
  private starts: number[] = [];
  constructor(private options = { ttl: 30_000, maxEntries: 100, maxBytes: 16 * 1024 * 1024, concurrency: 8, perMinute: 120 }, private now = Date.now) {}

  async read(key: string, fetchData: () => Promise<unknown>): Promise<string> {
    const now = this.now();
    const cached = this.entries.get(key);
    if (cached && cached.expires > now) return cached.body;
    const pending = this.pending.get(key);
    if (pending) return pending;
    this.starts = this.starts.filter(time => time > now - 60_000);
    if (this.pending.size >= this.options.concurrency || this.starts.length >= this.options.perMinute) {
      throw new UpstreamBusyError("目前讀取的人較多，請稍等一分鐘再試。");
    }
    this.starts.push(now);
    const task = Promise.resolve().then(fetchData).then(data => {
      const body = JSON.stringify(data), bytes = Buffer.byteLength(body);
      for (const [entryKey, entry] of this.entries) {
        if (entry.expires <= this.now() || entryKey === key) this.remove(entryKey);
      }
      if (bytes <= this.options.maxBytes) {
        while (this.entries.size >= this.options.maxEntries || this.bytes + bytes > this.options.maxBytes) {
          this.remove(this.entries.keys().next().value!);
        }
        this.entries.set(key, { body, bytes, expires: this.now() + this.options.ttl });
        this.bytes += bytes;
      }
      return body;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }
  private remove(key: string) {
    const entry = this.entries.get(key);
    if (entry) { this.bytes -= entry.bytes; this.entries.delete(key); }
  }
}
