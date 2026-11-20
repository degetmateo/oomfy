import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushPreferencesList } from './PushPreferencesList.js';
import { PushNotificationService } from '../../services/PushNotificationService.js';

describe('PushPreferencesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(PushNotificationService, 'getPreferences').mockResolvedValue({
      preferences: {
        messages: true, replies: true, quotes: true, upvotes: true, shares: true, follows: true, mentions: true,
        messages_silent: false, upvotes_silent: false,
      },
      is_active: true,
      status: 'active',
    });
    vi.spyOn(PushNotificationService, 'updatePreferences').mockResolvedValue({
      messages: false, replies: true, quotes: true, upvotes: true, shares: true, follows: true, mentions: true,
    });
  });

  it('renders category toggles and silent alert-level controls and updates preferences', async () => {
    render(<PushPreferencesList endpoint="https://fcm.googleapis.com/fcm/send/test-endpoint" />);

    await waitFor(() => expect(screen.getByText('Notificaciones de mensajes')).toBeInTheDocument());

    const activeButtons = screen.getAllByRole('button', { name: /Activado/i });
    expect(activeButtons.length).toBe(7);

    const msgSilentBtn = screen.getByRole('button', { name: /Modo silencioso para Notificaciones de mensajes/i });
    expect(msgSilentBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(msgSilentBtn);

    await waitFor(() => {
      expect(PushNotificationService.updatePreferences).toHaveBeenCalledWith(
        { messages_silent: true },
        'https://fcm.googleapis.com/fcm/send/test-endpoint'
      );
    });

    fireEvent.click(activeButtons[0]);
    await waitFor(() => {
      expect(PushNotificationService.updatePreferences).toHaveBeenCalledWith(
        { messages: false },
        'https://fcm.googleapis.com/fcm/send/test-endpoint'
      );
    });
  });
});
