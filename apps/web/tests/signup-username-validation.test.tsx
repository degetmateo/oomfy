import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignupView } from '../src/views/SignupView.js';
import { AccountSettingsTab } from '../src/components/settings/AccountSettingsTab.js';
import { ApiClient } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';
import { useDialogStore } from '../src/stores/dialogStore.js';

describe('Username Character Validation in Frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ isAuthenticated: false, user: null });
  });

  it('rejects usernames with non-English letters or symbols in SignupView', async () => {
    const postSpy = vi.spyOn(ApiClient, 'post').mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <SignupView />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText('Nombre');
    const userInput = screen.getByLabelText('Nombre de Usuario (@)');
    const emailInput = screen.getByLabelText('Correo Electrónico');
    const passInput = screen.getByLabelText('Contraseña');
    const termsCheck = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /registrarse/i });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(userInput, { target: { value: 'usuario-con-guion' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    fireEvent.click(termsCheck);

    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Solo se permiten letras del alfabeto inglés, números y guiones bajos.'
    );
    expect(postSpy).not.toHaveBeenCalled();

    // Now test with non-English character 'ñ'
    fireEvent.change(userInput, { target: { value: 'usuario_español' } });
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Solo se permiten letras del alfabeto inglés, números y guiones bajos.'
    );
    expect(postSpy).not.toHaveBeenCalled();

    // Now test with valid username containing only English letters, numbers and underscores
    fireEvent.change(userInput, { target: { value: 'valid_user_123' } });
    fireEvent.submit(form);

    expect(postSpy).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ username: 'valid_user_123' })
    );
  });

  it('validates username in AccountSettingsTab and alerts on invalid characters', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'initial_user', name: 'User 1' } as any,
    });
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true, data: { username: 'new_user' } });
    const alertSpy = vi.spyOn(useDialogStore.getState(), 'alert').mockResolvedValue();

    render(
      <MemoryRouter>
        <AccountSettingsTab />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('nuevo_usuario');
    const form = input.closest('form')!;

    // Try setting username with special character '@'
    fireEvent.change(input, { target: { value: 'invalid@user' } });
    fireEvent.submit(form);

    expect(alertSpy).toHaveBeenCalledWith(
      'Solo se permiten letras del alfabeto inglés, números y guiones bajos.',
      'Nombre de usuario inválido'
    );
    expect(putSpy).not.toHaveBeenCalled();

    // Try setting valid username
    fireEvent.change(input, { target: { value: 'valid_new_user_99' } });
    fireEvent.submit(form);

    expect(putSpy).toHaveBeenCalledWith('/settings/username', { username: 'valid_new_user_99' });
  });
});
