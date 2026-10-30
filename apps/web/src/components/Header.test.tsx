import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './layout/Header.js';

describe('Header Component', () => {
  it('renders title and subtitle correctly', () => {
    render(<Header title="Mi Título" subtitle="Subtítulo de prueba" />);
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
    expect(screen.getByText('Subtítulo de prueba')).toBeInTheDocument();
  });
});
