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

  it('renders CRLF markdown headings, lists, blockquotes, codeblocks, nested emphasis, links and emotes', () => {
    const md = [
      '# Título Principal', '##Subtítulo Pegado', '> Cita destacada',
      '- elemento uno', '1. primer paso', '```', 'const x = 1;', '```',
      '**negrita con *cursiva* y __subrayado__** __sub con @buenardo_bro y :pepe_ok:__ [link](https://example.com) ~~tachado~~ `inline`',
    ].join('\r\n');
    const { container } = render(<MemoryRouter><FormattedText text={md} /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Título Principal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Subtítulo Pegado' })).toBeInTheDocument();
    expect(screen.getByText('Cita destacada').tagName.toLowerCase()).toBe('blockquote');
    expect(screen.getByText('elemento uno').closest('ul')).toBeInTheDocument();
    expect(screen.getByText('primer paso').closest('ol')).toBeInTheDocument();
    expect(container.querySelector('pre')?.textContent).toBe('const x = 1;');
    expect(screen.getByText('cursiva').tagName.toLowerCase()).toBe('em');
    expect(screen.getByText('subrayado').tagName.toLowerCase()).toBe('u');
    expect(screen.getByText('@buenardo_bro').closest('u')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('tachado').tagName.toLowerCase()).toBe('del');
    expect(screen.getByText('inline').tagName.toLowerCase()).toBe('code');
  });

  it('renders known custom emotes as inline images and leaves unknown tokens as text', () => {
    render(<MemoryRouter><FormattedText text="Hola :pepe_ok: y :desconocido:" /></MemoryRouter>);

    const img = screen.getByRole('img', { name: ':pepe_ok:' });
    expect(img).toHaveAttribute('src', 'https://cdn.example/pepe.png');
    expect(screen.getByText(/y :desconocido:/)).toBeInTheDocument();
  });
});
