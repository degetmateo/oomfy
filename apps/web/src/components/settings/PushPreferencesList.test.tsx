import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushPreferencesList } from './PushPreferencesList.js';
import { PushNotificationService } from '../../services/PushNotificationService.js';

describe('PushPreferencesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(PushNotificationService, 'getPreferences').mockResolvedValue({
      preferences: {
        messages: true,
        replies: true,
        quotes: true,
        upvotes: true,
        shares: true,
        follows: true,
      },
      is_active: true,
      status: 'active',
    });
    vi.spyOn(PushNotificationService, 'updatePreferences').mockResolvedValue({
      messages: false,
      replies: true,
      quotes: true,
      upvotes: true,
      shares: true,
      follows: true,
    });
  });

  it('renders preference toggles and updates preferences on click', async () => {
    render(<PushPreferencesList endpoint="https://fcm.googleapis.com/fcm/send/test-endpoint" />);

    await waitFor(() => {
      expect(screen.getByText('Notificaciones de mensajes')).toBeInTheDocument();
      expect(screen.getByText('Notificaciones de respuestas')).toBeInTheDocument();
      expect(screen.getByText('Notificaciones de citas')).toBeInTheDocument();
    });

    const activeButtons = screen.getAllByRole('button', { name: /Activado/i });
    expect(activeButtons.length).toBe(6);

    fireEvent.click(activeButtons[0]);

    await waitFor(() => {
      expect(PushNotificationService.updatePreferences).toHaveBeenCalledWith(
        { messages: false },
        'https://fcm.googleapis.com/fcm/send/test-endpoint'
      );
    });
  });
});

