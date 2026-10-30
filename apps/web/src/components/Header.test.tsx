import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './layout/Header.js';

describe('Header Component', () => {
  it('renders title and subtitle correctly', () => {
    render(
      <MemoryRouter>
        <Header title="Mi Título" subtitle="Subtítulo de prueba" />
      </MemoryRouter>
    );
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
    expect(screen.getByText('Subtítulo de prueba')).toBeInTheDocument();
  });

  it('renders back button when showBack is true', () => {
    render(
      <MemoryRouter>
        <Header title="Detalles" showBack={true} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Volver atrás')).toBeInTheDocument();
  });
});
