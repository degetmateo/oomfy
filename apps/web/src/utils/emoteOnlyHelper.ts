import { CustomEmote } from '@oomfy/shared';
import { MarkdownBlock } from './markdownParser.js';

export type EmoteOnlyMode = 'none' | 'single' | 'multiple';

export type EmoteOnlyItem =
  | { kind: 'custom'; emote: CustomEmote }
  | { kind: 'unicode'; value: string };

const UNICODE_EMOJI_RE =
  /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3)/u;
const WHITESPACE_RE = /^\s+$/u;

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function'
    ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
    : null;

function segmentGraphemes(text: string): string[] {
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (seg: any) => seg.segment as string);
  }
  return Array.from(text);
}

export function isUnicodeEmojiGrapheme(grapheme: string): boolean {
  return UNICODE_EMOJI_RE.test(grapheme);
}

export function analyzeEmoteOnlyBlocks(
  blocks: MarkdownBlock[],
  resolveEmote: (name: string) => CustomEmote | undefined,
  maxJumboCount = 27
): { mode: EmoteOnlyMode; count: number; lines: EmoteOnlyItem[][] } {
  if (blocks.length === 0 || blocks.some((b) => b.type !== 'line')) {
    return { mode: 'none', count: 0, lines: [] };
  }

  const lines: EmoteOnlyItem[][] = [];
  let count = 0;

  for (const block of blocks) {
    if (block.type !== 'line') {
      return { mode: 'none', count: 0, lines: [] };
    }

    const lineItems: EmoteOnlyItem[] = [];
    for (const tok of block.children) {
      if (tok.type === 'emote') {
        const emote = resolveEmote(tok.name);
        if (!emote) return { mode: 'none', count: 0, lines: [] };
        lineItems.push({ kind: 'custom', emote });
        count += 1;
        if (count > maxJumboCount) return { mode: 'none', count: 0, lines: [] };
        continue;
      }

      if (tok.type === 'text') {
        for (const grapheme of segmentGraphemes(tok.text)) {
          if (WHITESPACE_RE.test(grapheme)) continue;
          if (!isUnicodeEmojiGrapheme(grapheme)) {
            return { mode: 'none', count: 0, lines: [] };
          }
          lineItems.push({ kind: 'unicode', value: grapheme });
          count += 1;
          if (count > maxJumboCount) return { mode: 'none', count: 0, lines: [] };
        }
        continue;
      }

      return { mode: 'none', count: 0, lines: [] };
    }

    if (lineItems.length > 0) {
      lines.push(lineItems);
    }
  }

  if (count === 0) return { mode: 'none', count: 0, lines: [] };
  return {
    mode: count === 1 ? 'single' : 'multiple',
    count,
    lines,
  };
}
