import { describe, it, expect } from 'vitest';
import { PublicationSnippetHelper } from '../src/services/publications/PublicationSnippetHelper.js';

describe('PublicationSnippetHelper', () => {
  it('extracts the first sentence with period', () => {
    const pub = { content: 'Esta es la primera oración. Y esta es la segunda.' };
    expect(PublicationSnippetHelper.extractSnippet(pub)).toBe('Esta es la primera oración.');
  });

  it('extracts the first sentence with exclamation or question mark', () => {
    const pub1 = { content: '¡Increíble novedad! No te lo pierdas.' };
    expect(PublicationSnippetHelper.extractSnippet(pub1)).toBe('¡Increíble novedad!');

    const pub2 = { content: '¿Qué opinan de esto? Dejen sus comentarios.' };
    expect(PublicationSnippetHelper.extractSnippet(pub2)).toBe('¿Qué opinan de esto?');
  });

  it('extracts first line when split by newline', () => {
    const pub = { content: 'Línea uno sin punto\nLínea dos con punto.' };
    expect(PublicationSnippetHelper.extractSnippet(pub)).toBe('Línea uno sin punto');
  });

  it('truncates very long first sentence with ellipsis', () => {
    const longText = 'A'.repeat(150) + '.';
    const snippet = PublicationSnippetHelper.extractSnippet({ content: longText });
    expect(snippet.length).toBe(100);
    expect(snippet.endsWith('...')).toBe(true);
  });

  it('returns "📷 Imagen adjunta" when content is empty but images exist', () => {
    const pub1 = { content: '', images: [{ url: 'https://img.test/pic.png' }] };
    expect(PublicationSnippetHelper.extractSnippet(pub1)).toBe('📷 Imagen adjunta');

    const pub2 = { content: null, images: [{ url: 'https://img.test/pic.png' }] };
    expect(PublicationSnippetHelper.extractSnippet(pub2)).toBe('📷 Imagen adjunta');
  });

  it('returns empty string if neither content nor images exist', () => {
    expect(PublicationSnippetHelper.extractSnippet(null)).toBe('');
    expect(PublicationSnippetHelper.extractSnippet({ content: '', images: [] })).toBe('');
  });
});

