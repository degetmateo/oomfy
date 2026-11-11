import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountLifecycleSection } from './AccountLifecycleSection.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ApiClient } from '../../services/api.js';

describe('AccountLifecycleSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member' } as any, isAuthenticated: true });
  });

  it('requests JSON export from GET /members/me/export cleanly', async () => {
    const getSpy = vi.spyOn(ApiClient, 'get').mockResolvedValue({ success: true, data: { account: { username: 'alice' } } } as any);
    const createObjSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<MemoryRouter><AccountLifecycleSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Exportar datos/i }));

    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/members/me/export'));
    expect(createObjSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
  });

  it('requires confirmation and password before calling DELETE /members/me and logging out', async () => {
    const logoutSpy = vi.fn();
    useAuthStore.setState({ logout: logoutSpy } as any);
    useDialogStore.setState({ confirm: vi.fn().mockResolvedValue(true), alert: vi.fn().mockResolvedValue(undefined) } as any);
    const delSpy = vi.spyOn(ApiClient, 'delete').mockResolvedValue({ success: true } as any);

    render(<MemoryRouter><AccountLifecycleSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Eliminar cuenta/i }));

    fireEvent.change(screen.getByPlaceholderText('Confirma tu contraseña actual'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar borrado/i }));

    await waitFor(() => expect(delSpy).toHaveBeenCalledWith('/members/me', { password: 'StrongPass1!' }));
    expect(logoutSpy).toHaveBeenCalledWith(false);
  });
});
