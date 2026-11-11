import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProfileModal } from './EditProfileModal.js';
import { ApiClient } from '../../services/api.js';
import { PublicUser } from '@oomfy/shared';

describe('EditProfileModal Component', () => {
  const dummyUser: PublicUser = {
    id: 'user-456', username: 'junko', name: 'Junko Enoshima', role: 'admin',
    bio: 'Despair queen', location: 'Hope Peak', link: 'https://despair.net',
    icon_url: null, banner_url: null, created_at: new Date().toISOString(),
    follower_count: 10, followed_count: 5, publication_count: 20,
  };

  it('renders fields and saves updated profile data calling onUpdated and onClose', async () => {
    const handleClose = vi.fn();
    const handleUpdated = vi.fn();
    const updatedUser = { ...dummyUser, name: 'Junko Updated' };
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true, data: updatedUser } as any);

    render(<EditProfileModal user={dummyUser} isOpen={true} onClose={handleClose} onUpdated={handleUpdated} />);

    const nameInput = screen.getByDisplayValue('Junko Enoshima');
    expect(screen.getByDisplayValue('Despair queen')).toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: 'Junko Updated' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith('/members/me', expect.any(FormData));
      expect(handleUpdated).toHaveBeenCalledWith(updatedUser);
      expect(handleClose).toHaveBeenCalled();
    });
    putSpy.mockRestore();
  });
});
