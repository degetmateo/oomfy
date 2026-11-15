export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'code'; content: string }
  | { type: 'bold_italic'; children: InlineToken[] }
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'italic'; children: InlineToken[] }
  | { type: 'underline'; children: InlineToken[] }
  | { type: 'strike'; children: InlineToken[] }
  | { type: 'url'; url: string }
  | { type: 'mention'; username: string }
  | { type: 'hashtag'; tag: string }
  | { type: 'emote'; name: string };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineToken[] }
  | { type: 'blockquote'; children: InlineToken[] }
  | { type: 'line'; children: InlineToken[] };

const INLINE_SOURCE = [
  '`([^`\\n]+)`',
  '\\*\\*\\*([^*\\n]+?)\\*\\*\\*',
  '\\*\\*([^*\\n]+?)\\*\\*',
  '__([^_\\n]+?)__',
  '\\+\\+([^+\\n]+?)\\+\\+',
  '~~([^~\\n]+?)~~',
  '(https?:\\/\\/[^\\s]+)',
  '((?<![a-zA-Z0-9_.])@[a-zA-Z0-9_]+)',
  '(#[a-zA-Z0-9_-]+)',
  ':([a-zA-Z0-9_]{2,32}):',
  '\\*([^*\\n]+?)\\*',
  '(?<![a-zA-Z0-9_])_([^_\\n]+?)_(?![a-zA-Z0-9_])',
].join('|');

export function parseInlineTokens(input: string, depth = 0): InlineToken[] {
  if (!input) return [];
  if (depth > 3) return [{ type: 'text', text: input }];

  const tokens: InlineToken[] = [];
  const regex = new RegExp(INLINE_SOURCE, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) tokens.push({ type: 'code', content: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: 'bold_italic', children: parseInlineTokens(match[2], depth + 1) });
    else if (match[3] !== undefined) tokens.push({ type: 'bold', children: parseInlineTokens(match[3], depth + 1) });
    else if (match[4] !== undefined || match[5] !== undefined) {
      tokens.push({ type: 'underline', children: parseInlineTokens(match[4] ?? match[5], depth + 1) });
    } else if (match[6] !== undefined) tokens.push({ type: 'strike', children: parseInlineTokens(match[6], depth + 1) });
    else if (match[7] !== undefined) tokens.push({ type: 'url', url: match[7] });
    else if (match[8] !== undefined) tokens.push({ type: 'mention', username: match[8] });
    else if (match[9] !== undefined) tokens.push({ type: 'hashtag', tag: match[9] });
    else if (match[10] !== undefined) tokens.push({ type: 'emote', name: match[10] });
    else if (match[11] !== undefined || match[12] !== undefined) {
      tokens.push({ type: 'italic', children: parseInlineTokens(match[11] ?? match[12], depth + 1) });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', text: input.slice(lastIndex) });
  }
  return tokens;
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  return text.split('\n').map((line) => {
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      return {
        type: 'heading',
        level: hMatch[1].length as 1 | 2 | 3,
        children: parseInlineTokens(hMatch[2]),
      };
    }
    const qMatch = line.match(/^>\s+(.+)$/);
    if (qMatch) {
      return { type: 'blockquote', children: parseInlineTokens(qMatch[1]) };
    }
    return { type: 'line', children: parseInlineTokens(line) };
  });
}
