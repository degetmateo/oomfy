import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushReconnectBanner } from './PushReconnectBanner.js';
import { PushNotificationService } from '../../services/PushNotificationService.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

vi.mock('../../services/PushNotificationService.js', () => ({
  PushNotificationService: {
    checkSubscriptionHealth: vi.fn(),
    reconnect: vi.fn(),
  },
}));

describe('PushReconnectBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, token: 'test-token' });
  });

  it('skips subscription health check while unauthenticated or loading session', async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: true, token: null });
    render(<PushReconnectBanner />);
    expect(PushNotificationService.checkSubscriptionHealth).not.toHaveBeenCalled();
  });

  it('does not render when subscription is healthy', async () => {
    vi.mocked(PushNotificationService.checkSubscriptionHealth).mockResolvedValue({
      healthy: true,
      needsReconnect: false,
    });

    const { container } = render(<PushReconnectBanner />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders banner and allows user to reconnect on click (user gesture)', async () => {
    vi.mocked(PushNotificationService.checkSubscriptionHealth).mockResolvedValue({
      healthy: false,
      needsReconnect: true,
    });
    vi.mocked(PushNotificationService.reconnect).mockResolvedValue(true);
    const alertMock = vi.fn();
    useDialogStore.setState({ alert: alertMock });

    render(<PushReconnectBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Tus notificaciones push se desconectaron/i)).toBeInTheDocument();
    });

    const reconnectBtn = screen.getByRole('button', { name: /Reconectar/i });
    fireEvent.click(reconnectBtn);

    await waitFor(() => {
      expect(PushNotificationService.reconnect).toHaveBeenCalledTimes(1);
      expect(alertMock).toHaveBeenCalledWith('Notificaciones push reconectadas con éxito.', 'Notificaciones');
    });
  });

  it('can be dismissed by the user', async () => {
    vi.mocked(PushNotificationService.checkSubscriptionHealth).mockResolvedValue({
      healthy: false,
      needsReconnect: true,
    });

    render(<PushReconnectBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Tus notificaciones push se desconectaron/i)).toBeInTheDocument();
    });

    const dismissBtn = screen.getByTitle('Descartar');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/Tus notificaciones push se desconectaron/i)).not.toBeInTheDocument();
  });
});

