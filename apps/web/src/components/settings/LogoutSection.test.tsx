import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LogoutSection } from './LogoutSection.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

describe('LogoutSection Component', () => {
  it('renders logout button and triggers logout on confirmation', async () => {
    const logoutMock = vi.fn();
    useAuthStore.setState({
      user: { id: '1', username: 'tester', name: 'Tester', role: 'member' } as any,
      logout: logoutMock,
      isAuthenticated: true,
    });

    const confirmMock = vi.fn().mockResolvedValue(true);
    useDialogStore.setState({ confirm: confirmMock } as any);

    render(
      <MemoryRouter>
        <LogoutSection />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /Cerrar sesión/i });
    expect(logoutButton).toBeInTheDocument();

    fireEvent.click(logoutButton);
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cerrar sesión',
        isDanger: true,
      })
    );
  });
});

