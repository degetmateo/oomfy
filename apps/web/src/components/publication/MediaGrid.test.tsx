import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaGrid } from './MediaGrid.js';

describe('MediaGrid censorship and GIF playback controls', () => {
  it('renders spoiler/sensitive blurred overlay with Mostrar toggle and suppresses zoom while hidden', () => {
    render(
      <MediaGrid
        images={[
          { url: 'https://cdn.example.com/secret.png', source: 'imgbb', index: 0, warning: 'spoiler' },
        ]}
      />
    );

    expect(screen.getByText('Spoiler')).toBeInTheDocument();
    const img = screen.getByAltText('Adjunto de publicación');
    expect(img.className).toContain('blur-2xl');

    // Clicking blurred media does NOT open the zoom modal
    fireEvent.click(img);
    expect(screen.queryByRole('dialog', { name: 'Visor de imagen ampliada' })).not.toBeInTheDocument();

    // Clicking Mostrar reveals the crisp image and offers Ocultar
    fireEvent.click(screen.getByRole('button', { name: /Mostrar/i }));
    expect(screen.queryByText('Spoiler')).not.toBeInTheDocument();
    expect(screen.getByAltText('Adjunto de publicación').className).not.toContain('blur-2xl');
    expect(screen.getByRole('button', { name: /Ocultar imagen censurada/i })).toBeInTheDocument();

    // Re-hiding brings back the warning overlay
    fireEvent.click(screen.getByRole('button', { name: /Ocultar imagen censurada/i }));
    expect(screen.getByText('Spoiler')).toBeInTheDocument();
  });

  it('shows compact icon-only Pause/Resume button at bottom-left of GIFs and toggles state', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    render(
      <MediaGrid
        images={[
          { url: 'https://cdn.example.com/dance.gif', source: 'tenor', index: 0, is_gif: true },
        ]}
      />
    );

    const pauseBtn = screen.getByRole('button', { name: 'Pausar GIF' });
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'false');
    expect(pauseBtn.className).toContain('bottom-2');
    expect(pauseBtn.className).toContain('left-2');
    expect(pauseBtn.textContent).toBe('');

    fireEvent.click(pauseBtn);
    const resumeBtn = screen.getByRole('button', { name: 'Reanudar GIF' });
    expect(resumeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(resumeBtn.textContent).toBe('');
    expect(screen.getByText('GIF pausado')).toBeInTheDocument();

    fireEvent.click(resumeBtn);
    expect(screen.getByRole('button', { name: 'Pausar GIF' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByAltText('Adjunto de publicación')).toBeInTheDocument();
  });

  it('reveals a censored GIF before showing its Pause/Resume controls', () => {
    render(
      <MediaGrid
        images={[
          { url: 'https://cdn.example.com/reveal-gif.gif', source: 'imgbb', index: 0, is_gif: true, warning: 'sensitive' },
        ]}
      />
    );

    expect(screen.getByText('Contenido sensible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pausar GIF' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mostrar/i }));
    expect(screen.getByRole('button', { name: 'Pausar GIF' })).toBeInTheDocument();
  });
});
