import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FormattedText } from './FormattedText.js';

describe('FormattedText Component', () => {
  it('renders standard text without special tokens', () => {
    render(
      <MemoryRouter>
        <FormattedText text="Hola mundo desde oomfy" />
      </MemoryRouter>
    );
    expect(screen.getByText('Hola mundo desde oomfy')).toBeInTheDocument();
  });

  it('detects and highlights URLs, mentions, and hashtags', () => {
    const text = 'Mira @buenardo_bro esto en https://example.com #oomfy';
    render(
      <MemoryRouter>
        <FormattedText text={text} />
      </MemoryRouter>
    );

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
});
