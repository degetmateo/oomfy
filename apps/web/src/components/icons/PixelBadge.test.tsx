import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PixelBadge } from './PixelBadge.js';

describe('PixelBadge Component', () => {
  it('renders [ADMIN] for admin role', () => {
    render(<PixelBadge role="admin" />);
    expect(screen.getByText('[ADMIN]')).toBeInTheDocument();
  });

  it('renders [MOD] for mod role', () => {
    render(<PixelBadge role="mod" />);
    expect(screen.getByText('[MOD]')).toBeInTheDocument();
  });

  it('renders [MEMBER] for member and tester roles', () => {
    const { rerender } = render(<PixelBadge role="member" />);
    expect(screen.getByText('[MEMBER]')).toBeInTheDocument();

    rerender(<PixelBadge role="tester" />);
    expect(screen.getByText('[MEMBER]')).toBeInTheDocument();

    rerender(<PixelBadge />);
    expect(screen.getByText('[MEMBER]')).toBeInTheDocument();
  });
});

