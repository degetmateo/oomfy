function stripTrailingPunctuation(raw: string): string {
  let out = raw;
  while (out.length > 0) {
    if (/[.,;!?'">]$/.test(out)) {
      out = out.slice(0, -1);
      continue;
    }
    if (out.endsWith(')')) {
      const open = (out.match(/\(/g) || []).length;
      const close = (out.match(/\)/g) || []).length;
      if (close > open) { out = out.slice(0, -1); continue; }
    }
    if (out.endsWith(']')) {
      const open = (out.match(/\[/g) || []).length;
      const close = (out.match(/\]/g) || []).length;
      if (close > open) { out = out.slice(0, -1); continue; }
    }
    break;
  }
  return out;
}

export class UrlExtractor {
  public static extract(text: string, max = 4): string[] {
    if (!text) return [];
    const withoutCode = text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
    const unwrapped = withoutCode.replace(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi, ' $1 ');
    const matches = unwrapped.match(/https?:\/\/[^\s<>"'`]+/gi) || [];
    const seen = new Set<string>();
    const urls: string[] = [];

    for (const raw of matches) {
      const clean = stripTrailingPunctuation(raw);
      if (!clean) continue;
      try {
        const parsed = new URL(clean);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
        const normalized = parsed.toString();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        urls.push(clean);
        if (urls.length >= max) break;
      } catch { /* skip invalid url */ }
    }
    return urls;
  }
}
