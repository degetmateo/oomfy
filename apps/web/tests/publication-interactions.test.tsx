import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationMenu } from '../src/components/publication/PublicationMenu.js';
import { PublicationInteractionsTabs } from '../src/components/publication/PublicationInteractionsTabs.js';
import { PublicationInteractionsView } from '../src/views/PublicationInteractionsView.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Publication Interactions UI and Navigation', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it('renders "Interacciones" in PublicationMenu and navigates on click', () => {
    render(
      <MemoryRouter>
        <PublicationMenu postId="post-123" authorId="auth-1" authorUsername="tester" canDelete={false} />
      </MemoryRouter>
    );

    const trigger = screen.getByTitle('Opciones de publicación');
    fireEvent.click(trigger);

    const interactionsBtn = screen.getByText('Interacciones');
    expect(interactionsBtn).toBeInTheDocument();

    fireEvent.click(interactionsBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/publication/post-123/interactions');
  });

  it('renders 3 tabs (Citados, Compartidos, Me gusta) and invokes onChangeTab', () => {
    const onChangeTab = vi.fn();
    render(<PublicationInteractionsTabs activeTab="quotes" onChangeTab={onChangeTab} />);

    expect(screen.getByText('Citados')).toBeInTheDocument();
    expect(screen.getByText('Compartidos')).toBeInTheDocument();
    expect(screen.getByText('Me gusta')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Me gusta'));
    expect(onChangeTab).toHaveBeenCalledWith('likes');
  });

  it('PublicationInteractionsView renders with swipe support and switches tabs', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/publication/post-123/interactions?tab=quotes']}>
          <Routes>
            <Route path="/publication/:id/interactions" element={<PublicationInteractionsView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Interacciones')).toBeInTheDocument();
    expect(screen.getByText('Citados')).toBeInTheDocument();

    const root = container.firstElementChild!;
    fireEvent.touchStart(root, { touches: [{ clientX: 250, clientY: 200 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 150, clientY: 205 }] });

    expect(screen.getByText('Compartidos')).toBeInTheDocument();
  });
});

