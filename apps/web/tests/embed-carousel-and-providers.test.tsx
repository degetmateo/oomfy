import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicationEmbed } from '@oomfy/shared';
import { LinkPreviewCard } from '../src/components/publication/LinkPreviewCard.js';

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<>{ui}</>} />
        <Route path="/external" element={<div data-testid="external-warning-page">External Warning</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EmbedCarousel, Provider Cards & Safe External Navigation', () => {
  it('renders single YouTube facade with click-to-play youtube-nocookie iframe and metadata bar', () => {
    const embeds: PublicationEmbed[] = [{
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Cool Video',
      author_name: 'Creator',
      video_id: 'dQw4w9WgXcQ',
      iframe_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }];

    renderWithRouter(<LinkPreviewCard embeds={embeds} />);
    expect(screen.queryByRole('region', { name: 'Enlaces embebidos' })).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Cool Video/i }));
    const iframe = document.querySelector('iframe');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('renders accessible carousel with data-no-swipe, controls before track, and provider cards for >1 links', () => {
    const embeds: PublicationEmbed[] = [
      {
        type: 'anilist', url: 'https://anilist.co/anime/21/One-Piece', title: 'ONE PIECE',
        site_name: 'AniList', media_format: 'TV', season_year: 1999, score: 8.8, genres: ['Action', 'Adventure'],
      },
      {
        type: 'myanimelist', url: 'https://myanimelist.net/anime/5114', title: 'Fullmetal Alchemist',
        site_name: 'MyAnimeList', media_format: 'TV', episodes: 64, score: 9.1,
      },
      {
        type: 'twitter', url: 'https://x.com/user/status/123', title: 'X User', author_username: 'xuser', description: 'Hello X',
      },
    ];

    renderWithRouter(<LinkPreviewCard embeds={embeds} />);
    const carousel = screen.getByRole('region', { name: 'Enlaces embebidos' });
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    expect(carousel).toHaveAttribute('data-no-swipe', 'true');
    expect(carousel).toHaveAttribute('data-no-card-nav', 'true');

    const prevBtn = screen.getByRole('button', { name: 'Enlace anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Siguiente enlace' });
    const track = screen.getByRole('group', { name: 'Enlaces' });
    expect(Boolean(prevBtn.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const slides = screen.getAllByRole('group').filter((el) => el.getAttribute('aria-roledescription') === 'slide');
    expect(slides).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Ir al enlace 1' })).toHaveAttribute('aria-current', 'true');
    expect(prevBtn).toBeDisabled();

    fireEvent.click(nextBtn);
    expect(screen.getByRole('button', { name: 'Ir al enlace 2' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Enlace 2 de 3');
  });

  it('routes external embed link clicks through /external?url=...', () => {
    const embeds: PublicationEmbed[] = [{
      type: 'tiktok',
      url: 'https://www.tiktok.com/@creator/video/123',
      title: 'Dance clip',
      site_name: 'TikTok',
    }];

    renderWithRouter(<LinkPreviewCard embeds={embeds} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/external?url=${encodeURIComponent('https://www.tiktok.com/@creator/video/123')}`);
    fireEvent.click(link);
    expect(screen.getByTestId('external-warning-page')).toBeInTheDocument();
  });
});
