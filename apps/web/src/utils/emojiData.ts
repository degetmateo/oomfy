import { SMILEYS_RAW } from '../data/emojis/smileysEmojis.js';
import { GESTURES_RAW } from '../data/emojis/gesturesPeopleEmojis.js';
import { HEARTS_RAW, SYMBOLS_RAW } from '../data/emojis/heartsSymbolsEmojis.js';
import { NATURE_RAW } from '../data/emojis/natureAnimalsEmojis.js';
import { FOOD_RAW } from '../data/emojis/foodDrinkEmojis.js';
import { ACTIVITIES_RAW, TRAVEL_RAW } from '../data/emojis/activitiesTravelEmojis.js';
import { OBJECTS_RAW, FLAGS_RAW } from '../data/emojis/objectsFlagsEmojis.js';

export interface EmojiEntry {
  emoji: string;
  name: string;
  searchText: string;
}

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
  items: EmojiEntry[];
}

export function normalizeEmojiQuery(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parseEmojiEntries(raw: string | string[]): EmojiEntry[] {
  const joined = Array.isArray(raw) ? raw.join('|') : raw;
  const seen = new Set<string>();
  const entries: EmojiEntry[] = [];
  for (const token of joined.split('|')) {
    const sep = token.indexOf(':');
    if (sep <= 0) continue;
    const emoji = token.slice(0, sep).trim();
    const meta = token.slice(sep + 1).trim();
    if (!emoji || !meta || seen.has(emoji)) continue;
    seen.add(emoji);
    entries.push({ emoji, name: meta, searchText: normalizeEmojiQuery(meta) });
  }
  return entries;
}

function makeCategory(id: string, name: string, icon: string, raw: string | string[]): EmojiCategory {
  const items = parseEmojiEntries(raw);
  return { id, name, icon, items, emojis: items.map((i) => i.emoji) };
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  makeCategory('smileys', 'Caras', '😃', SMILEYS_RAW),
  makeCategory('gestures', 'Gestos', '👍', GESTURES_RAW),
  makeCategory('hearts', 'Corazones', '💖', HEARTS_RAW),
  makeCategory('nature', 'Naturaleza', '🐶', NATURE_RAW),
  makeCategory('food', 'Comida', '🍕', FOOD_RAW),
  makeCategory('activities', 'Actividades', '🎮', ACTIVITIES_RAW),
  makeCategory('travel', 'Viajes', '🚀', TRAVEL_RAW),
  makeCategory('objects', 'Objetos', '💡', OBJECTS_RAW),
  makeCategory('symbols', 'Símbolos', '✨', [...SYMBOLS_RAW, ...FLAGS_RAW]),
];

export function filterEmojiCategories(query: string): Array<{ id: string; name: string; items: EmojiEntry[] }> {
  const norm = normalizeEmojiQuery(query);
  if (!norm) return EMOJI_CATEGORIES.map(({ id, name, items }) => ({ id, name, items }));
  const terms = norm.split(/\s+/).filter(Boolean);
  const results: Array<{ id: string; name: string; items: EmojiEntry[] }> = [];
  for (const cat of EMOJI_CATEGORIES) {
    const items = cat.items.filter((item) => terms.every((t) => item.searchText.includes(t)));
    if (items.length > 0) results.push({ id: cat.id, name: cat.name, items });
  }
  return results;
}
