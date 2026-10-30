import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PixelLogo } from './PixelLogo.js';

describe('PixelLogo Component', () => {
  it('renders oomfy text and svg swooshes', () => {
    render(<PixelLogo />);
    expect(screen.getByText('oomfy')).toBeInTheDocument();
  });
});

