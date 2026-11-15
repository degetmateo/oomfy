export type InlineToken =
  | { type: 'text'; text: string } | { type: 'code'; content: string }
  | { type: 'bold_italic'; children: InlineToken[] } | { type: 'underline_italic'; children: InlineToken[] }
  | { type: 'bold'; children: InlineToken[] } | { type: 'italic'; children: InlineToken[] }
  | { type: 'underline'; children: InlineToken[] } | { type: 'strike'; children: InlineToken[] }
  | { type: 'md_link'; label: string; url: string } | { type: 'url'; url: string }
  | { type: 'mention'; username: string } | { type: 'hashtag'; tag: string } | { type: 'emote'; name: string };

export type MarkdownBlock =
  | { type: 'codeblock'; code: string } | { type: 'heading'; level: 1 | 2 | 3; children: InlineToken[] }
  | { type: 'blockquote'; children: InlineToken[] } | { type: 'list'; ordered: boolean; items: InlineToken[][] }
  | { type: 'hr' } | { type: 'line'; children: InlineToken[] };

const INLINE_SOURCE = [
  '`([^`\\n]+)`',
  '\\*\\*\\*((?:(?!\\*\\*\\*)[^\\n])+?)\\*\\*\\*',
  '___((?:(?!___)[^\\n])+?)___',
  '\\*\\*((?:(?!\\*\\*)[^\\n])+?)\\*\\*',
  '__((?:(?!__)[^\\n])+?)__',
  '\\+\\+((?:(?!\\+\\+)[^\\n])+?)\\+\\+',
  '~~((?:(?!~~)[^\\n])+?)~~',
  '\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)',
  '(https?:\\/\\/[^\\s]+)',
  '((?<![a-zA-Z0-9_.])@[a-zA-Z0-9_]+)',
  '((?<![a-zA-Z0-9_&/])#[a-zA-Z0-9_-]+)',
  ':([a-zA-Z0-9_]{2,32}):',
  '(?<!\\*)\\*(?!\\*)((?:\\*\\*[^*\\n]+\\*\\*|[^*\\n])+?)\\*(?!\\*)',
  '(?<![a-zA-Z0-9_])_(?!_)((?:__[^_\\n]+__|[^_\\n])+?)_(?![a-zA-Z0-9_])',
].join('|');

export function parseInlineTokens(raw: string, depth = 0): InlineToken[] {
  const input = raw.replace(/\r\n?/g, '\n');
  if (!input) return [];
  if (depth > 3) return [{ type: 'text', text: input }];
  const tokens: InlineToken[] = [];
  const regex = new RegExp(INLINE_SOURCE, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    if (match[1] !== undefined) tokens.push({ type: 'code', content: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: 'bold_italic', children: parseInlineTokens(match[2], depth + 1) });
    else if (match[3] !== undefined) tokens.push({ type: 'underline_italic', children: parseInlineTokens(match[3], depth + 1) });
    else if (match[4] !== undefined) tokens.push({ type: 'bold', children: parseInlineTokens(match[4], depth + 1) });
    else if (match[5] !== undefined || match[6] !== undefined) tokens.push({ type: 'underline', children: parseInlineTokens(match[5] ?? match[6], depth + 1) });
    else if (match[7] !== undefined) tokens.push({ type: 'strike', children: parseInlineTokens(match[7], depth + 1) });
    else if (match[8] !== undefined && match[9] !== undefined) tokens.push({ type: 'md_link', label: match[8], url: match[9] });
    else if (match[10] !== undefined) tokens.push({ type: 'url', url: match[10] });
    else if (match[11] !== undefined) tokens.push({ type: 'mention', username: match[11] });
    else if (match[12] !== undefined) tokens.push({ type: 'hashtag', tag: match[12] });
    else if (match[13] !== undefined) tokens.push({ type: 'emote', name: match[13] });
    else if (match[14] !== undefined || match[15] !== undefined) tokens.push({ type: 'italic', children: parseInlineTokens(match[14] ?? match[15], depth + 1) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) tokens.push({ type: 'text', text: input.slice(lastIndex) });
  return tokens;
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCode) { blocks.push({ type: 'codeblock', code: codeLines.join('\n') }); codeLines = []; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const hMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/) || line.match(/^\s*(#{2,6})([^\s#].*?)\s*$/);
    if (hMatch) { blocks.push({ type: 'heading', level: Math.min(hMatch[1].length, 3) as 1 | 2 | 3, children: parseInlineTokens(hMatch[2]) }); continue; }
    const qMatch = line.match(/^\s*>\s*(.+)$/);
    if (qMatch) { blocks.push({ type: 'blockquote', children: parseInlineTokens(qMatch[1]) }); continue; }
    if (/^\s*(?:---|___|\*\*\*)\s*$/.test(line)) { blocks.push({ type: 'hr' }); continue; }
    const ulMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    const olMatch = ulMatch ? null : line.match(/^\s*\d+[.)]\s+(.+)$/);
    const listMatch = ulMatch ?? olMatch;
    if (listMatch) {
      const ordered = Boolean(olMatch);
      const itemTokens = parseInlineTokens(listMatch[1]);
      const prev = blocks[blocks.length - 1];
      if (prev?.type === 'list' && prev.ordered === ordered) prev.items.push(itemTokens);
      else blocks.push({ type: 'list', ordered, items: [itemTokens] });
      continue;
    }
    blocks.push({ type: 'line', children: parseInlineTokens(line) });
  }
  if (inCode && codeLines.length > 0) blocks.push({ type: 'codeblock', code: codeLines.join('\n') });
  return blocks;
}
