import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPolicyView } from '../src/views/PrivacyPolicyView.js';
import { TermsAndConditionsView } from '../src/views/TermsAndConditionsView.js';
import { SignupView } from '../src/views/SignupView.js';
import { TermsAcceptanceModal } from '../src/components/legal/TermsAcceptanceModal.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { ApiClient } from '../src/services/api.js';

describe('Legal Views, Signup Checkbox & Existing User Terms Popup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('renders Privacy Policy and Terms & Conditions content accurately for Oomfy', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyView />
        <TermsAndConditionsView />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidad' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Términos y Condiciones' })).toBeInTheDocument();
    expect(screen.getByText(/ImgBB/i)).toBeInTheDocument();
    expect(screen.getByText(/Contenido generado por el usuario/i)).toBeInTheDocument();
  });

  it('requires checking privacy/terms agreement before enabling signup submission', async () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true } as any);
    render(<MemoryRouter><SignupView /></MemoryRouter>);

    const submitBtn = screen.getByRole('button', { name: 'Registrarse' });
    expect(submitBtn).toBeDisabled();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Mateo' } });
    fireEvent.change(inputs[1], { target: { value: 'mateo_dev' } });
    fireEvent.change(inputs[2], { target: { value: 'mateo@oomfy.online' } });
    const passInput = document.querySelector('input[type="password"]')!;
    fireEvent.change(passInput, { target: { value: 'password123' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(submitBtn).not.toBeDisabled();

    fireEvent.submit(submitBtn.closest('form')!);
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/auth/signup', expect.objectContaining({ accepted_terms: true })));
  });

  it('shows popup to existing logged-in users with terms_accepted === false and hides on /terms or after accepting', async () => {
    const updatedUser: any = { id: 'u1', username: 'alice', name: 'Alice', role: 'member', terms_accepted: true };
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true, data: updatedUser } as any);

    useAuthStore.setState({
      isAuthenticated: true,
      token: 'tok',
      user: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', terms_accepted: false } as any,
    });

    const { unmount } = render(<MemoryRouter initialEntries={['/terms']}><TermsAcceptanceModal /></MemoryRouter>);
    expect(screen.queryByText(/Aceptar y continuar/i)).toBeNull();
    unmount();

    render(<MemoryRouter initialEntries={['/']}><TermsAcceptanceModal /></MemoryRouter>);
    const acceptBtn = screen.getByRole('button', { name: /Aceptar y continuar/i });
    expect(acceptBtn).toBeInTheDocument();

    fireEvent.click(acceptBtn);
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/members/me/accept-terms'));
    expect(useAuthStore.getState().user?.terms_accepted).toBe(true);
  });
});

