const DIRECT_GIF_URL_RE = /^https?:\/\/\S+\.(gif|webp|png|jpe?g)(\?\S*)?$/i;
const KNOWN_GIF_CDN_RE = /^https?:\/\/(media\.tenor\.com|c\.tenor\.com|media\d*\.giphy\.com|i\.giphy\.com|klipy\.com|media\.klipy\.com)\/\S+$/i;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_IMAGE_EXT_RE = /\.(gif|png|jpe?g|webp)$/i;

export function isAllowedComposerImageFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (ALLOWED_IMAGE_MIMES.has(type)) return true;
  if (!type || type === 'application/octet-stream') {
    return ALLOWED_IMAGE_EXT_RE.test(file.name || '');
  }
  return false;
}

export function hasDraggableMediaPayload(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types || []);
  if (types.includes('Files') || types.includes('text/uri-list')) return true;
  if (dt.files && dt.files.length > 0) return true;
  if (dt.items && Array.from(dt.items).some((item) => item.kind === 'file' || item.type === 'text/uri-list')) {
    return true;
  }
  return false;
}

function isMediaUrl(raw: string): boolean {
  return Boolean(raw && (DIRECT_GIF_URL_RE.test(raw) || KNOWN_GIF_CDN_RE.test(raw)));
}

export function extractMediaFromDataTransfer(
  dt: DataTransfer | null | undefined
): { files: File[]; url: string | null; rejectedCount: number } {
  if (!dt) return { files: [], url: null, rejectedCount: 0 };
  const files: File[] = [];
  let rejectedCount = 0;
  let sawFileItem = false;

  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file') {
        sawFileItem = true;
        const file = item.getAsFile();
        if (file) {
          if (isAllowedComposerImageFile(file)) files.push(file);
          else rejectedCount += 1;
        }
      }
    }
  }

  if (!sawFileItem && dt.files) {
    for (const f of Array.from(dt.files)) {
      if (isAllowedComposerImageFile(f)) files.push(f);
      else rejectedCount += 1;
    }
  }

  if (files.length > 0 || rejectedCount > 0) return { files, url: null, rejectedCount };

  const html = dt.getData?.('text/html') || '';
  const imgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch?.[1]) return { files: [], url: imgMatch[1].replace(/&amp;/g, '&'), rejectedCount: 0 };

  const uriList = (dt.getData?.('text/uri-list') || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'));
  if (uriList && isMediaUrl(uriList)) {
    return { files: [], url: uriList, rejectedCount: 0 };
  }

  const text = (dt.getData?.('text/plain') || '').trim();
  if (isMediaUrl(text)) {
    return { files: [], url: text, rejectedCount: 0 };
  }
  return { files: [], url: null, rejectedCount: 0 };
}

export function syncTextareaHeight(el: HTMLTextAreaElement | null, maxHeightPx = 320): void {
  if (!el) return;
  el.style.height = 'auto';
  if (el.value && el.scrollHeight > 0) {
    const nextHeight = Math.min(el.scrollHeight, maxHeightPx);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
  } else {
    el.style.overflowY = 'hidden';
  }
}

