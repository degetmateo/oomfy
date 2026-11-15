import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FormattedText } from './FormattedText.js';
import { useEmoteStore } from '../../stores/emoteStore.js';

describe('FormattedText Component', () => {
  beforeEach(() => {
    useEmoteStore.setState({
      emotes: [{
        id: 'em-1', name: 'pepe_ok', image_url: 'https://cdn.example/pepe.png',
        creator_id: 'u1', creator_username: 'admin', created_at: new Date().toISOString(),
      }],
      emoteMap: {
        pepe_ok: {
          id: 'em-1', name: 'pepe_ok', image_url: 'https://cdn.example/pepe.png',
          creator_id: 'u1', creator_username: 'admin', created_at: new Date().toISOString(),
        },
      },
      isLoaded: true,
      isLoading: false,
    });
  });

  it('renders standard text without special tokens', () => {
    render(<MemoryRouter><FormattedText text="Hola mundo desde oomfy" /></MemoryRouter>);
    expect(screen.getByText('Hola mundo desde oomfy')).toBeInTheDocument();
  });

  it('detects and highlights URLs, mentions, and hashtags', () => {
    const text = 'Mira @buenardo_bro esto en https://example.com #oomfy';
    render(<MemoryRouter><FormattedText text={text} /></MemoryRouter>);

    const mention = screen.getByText('@buenardo_bro');
    expect(mention).toBeInTheDocument();
    expect(mention.className).toContain('text-brand-400');

    const link = screen.getByText('https://example.com');
    expect(link).toBeInTheDocument();
    expect(link.className).toContain('text-brand-400');

    const hashtag = screen.getByText('#oomfy');
    expect(hashtag).toBeInTheDocument();
    expect(hashtag.className).toContain('text-brand-400');
  });

  it('renders markdown headings, blockquotes, emphasis, underline, strike, and code', () => {
    const md = '# Título Principal\n## Subtítulo\n> Cita destacada\n**negrita** *cursiva* __subrayado__ ~~tachado~~ `codigo`';
    render(<MemoryRouter><FormattedText text={md} /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Título Principal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Subtítulo' })).toBeInTheDocument();
    expect(screen.getByText('Cita destacada').tagName.toLowerCase()).toBe('blockquote');
    expect(screen.getByText('negrita').tagName.toLowerCase()).toBe('strong');
    expect(screen.getByText('cursiva').tagName.toLowerCase()).toBe('em');
    expect(screen.getByText('subrayado').tagName.toLowerCase()).toBe('u');
    expect(screen.getByText('tachado').tagName.toLowerCase()).toBe('del');
    expect(screen.getByText('codigo').tagName.toLowerCase()).toBe('code');
  });

  it('renders known custom emotes as inline images and leaves unknown tokens as text', () => {
    render(<MemoryRouter><FormattedText text="Hola :pepe_ok: y :desconocido:" /></MemoryRouter>);

    const img = screen.getByRole('img', { name: ':pepe_ok:' });
    expect(img).toHaveAttribute('src', 'https://cdn.example/pepe.png');
    expect(screen.getByText(/y :desconocido:/)).toBeInTheDocument();
  });
});
