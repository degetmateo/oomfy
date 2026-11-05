import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminPushForm } from './AdminPushForm.js';
import { useDialogStore } from '../../stores/dialogStore.js';

vi.mock('../../services/api.js', () => ({
  ApiClient: {
    post: vi.fn().mockResolvedValue({ success: true, message: 'Notificación enviada' }),
  },
}));

describe('AdminPushForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form elements and switches recipient target type', () => {
    render(<AdminPushForm />);

    expect(screen.getByText('Todos los usuarios')).toBeInTheDocument();
    expect(screen.getByText('Usuario específico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/publicó un nuevo anuncio/i)).toBeInTheDocument();

    const specificUserBtn = screen.getByText('Usuario específico');
    fireEvent.click(specificUserBtn);

    expect(screen.getByPlaceholderText(/ej: mateo o @mateo/i)).toBeInTheDocument();
  });

  it('alerts when submitting empty required fields', () => {
    const alertMock = vi.fn();
    useDialogStore.setState({ alert: alertMock });

    render(<AdminPushForm />);
    const submitBtn = screen.getByRole('button', { name: /Enviar notificación push/i });
    fireEvent.click(submitBtn);

    expect(alertMock).toHaveBeenCalledWith('El título y contenido son obligatorios.', 'Campos requeridos');
  });
});

