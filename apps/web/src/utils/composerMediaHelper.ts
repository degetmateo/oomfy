const DIRECT_GIF_URL_RE = /^https?:\/\/\S+\.(gif|webp|png|jpe?g)(\?\S*)?$/i;
const KNOWN_GIF_CDN_RE = /^https?:\/\/(media\.tenor\.com|c\.tenor\.com|media\d*\.giphy\.com|i\.giphy\.com|klipy\.com|media\.klipy\.com)\/\S+$/i;

export function extractMediaFromDataTransfer(dt: DataTransfer | null | undefined): { files: File[]; url: string | null } {
  if (!dt) return { files: [], url: null };
  const files: File[] = [];
  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  if (files.length === 0 && dt.files) {
    for (const f of Array.from(dt.files)) {
      if (f.type.startsWith('image/') || /\.(gif|png|jpe?g|webp)$/i.test(f.name)) files.push(f);
    }
  }
  if (files.length > 0) return { files, url: null };

  const html = dt.getData?.('text/html') || '';
  const imgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch?.[1]) return { files: [], url: imgMatch[1] };

  const text = (dt.getData?.('text/plain') || '').trim();
  if (text && (DIRECT_GIF_URL_RE.test(text) || KNOWN_GIF_CDN_RE.test(text))) {
    return { files: [], url: text };
  }
  return { files: [], url: null };
}

