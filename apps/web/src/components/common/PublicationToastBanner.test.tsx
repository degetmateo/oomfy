import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicationToastBanner } from './PublicationToastBanner.js';
import { useToastStore } from '../../stores/toastStore.js';

describe('PublicationToastBanner', () => {
  beforeEach(() => {
    useToastStore.setState({ toast: null });
  });

  it('positions the toast below the mobile top safe-area inset', () => {
    useToastStore.setState({
      toast: { id: 1, message: 'Publicación guardada', variant: 'success' },
    });

    render(<PublicationToastBanner />);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('safe-top-toast');
    expect(banner.className).not.toContain('top-3');
    expect(screen.getByText('Publicación guardada')).toBeInTheDocument();
  });
});
