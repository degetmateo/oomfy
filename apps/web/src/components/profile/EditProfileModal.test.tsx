import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProfileModal } from './EditProfileModal.js';
import { ApiClient } from '../../services/api.js';
import { PublicUser } from '@oomfy/shared';
import { userIdentityMap } from '../../models/UserIdentityMap.js';

describe('EditProfileModal Component', () => {
  const dummyUser: PublicUser = {
    id: 'user-456', username: 'junko', name: 'Junko Enoshima', role: 'admin',
    bio: 'Despair queen', location: 'Hope Peak', link: 'https://despair.net',
    icon_url: null, banner_url: null, created_at: new Date().toISOString(),
    follower_count: 10, followed_count: 5, publication_count: 20,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    userIdentityMap.clear();
    userIdentityMap.ingest([dummyUser], Date.now(), true);
  });

  it('sends only modified text fields and retains both banner and icon buffers across sequential selections', async () => {
    const handleClose = vi.fn();
    const handleUpdated = vi.fn();
    const updatedUser = { ...dummyUser, name: 'Junko Updated', banner_url: 'https://cdn/b.gif', icon_url: 'https://cdn/i.gif' };
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true, data: updatedUser } as any);

    const { container, rerender } = render(
      <EditProfileModal user={dummyUser} isOpen={true} onClose={handleClose} onUpdated={handleUpdated} />
    );

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const bannerInput = fileInputs[0] as HTMLInputElement;
    const iconInput = fileInputs[1] as HTMLInputElement;

    const bannerGif = new File(['GIF89a-banner'], 'banner.gif', { type: 'image/gif' });
    const iconGif = new File(['GIF89a-icon'], 'avatar.gif', { type: 'image/gif' });
    fireEvent.change(bannerInput, { target: { files: [bannerGif] } });
    fireEvent.change(iconInput, { target: { files: [iconGif] } });

    // Background model refresh while modal is open must NOT wipe buffered files
    rerender(<EditProfileModal user={{ ...dummyUser }} isOpen={true} onClose={handleClose} onUpdated={handleUpdated} />);

    fireEvent.change(screen.getByDisplayValue('Junko Enoshima'), { target: { value: 'Junko Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/members/me', expect.any(FormData)));
    const sentForm = putSpy.mock.calls[0][1] as FormData;
    expect(sentForm.get('name')).toBe('Junko Updated');
    expect(sentForm.get('bio')).toBeNull();
    expect(sentForm.get('location')).toBeNull();
    expect(sentForm.get('banner_action')).toBe('update');
    expect(sentForm.get('icon_action')).toBe('update');
    expect((sentForm.get('banner') as File)?.name).toBe('banner.gif');
    expect((sentForm.get('icon') as File)?.name).toBe('avatar.gif');
    expect(userIdentityMap.get('junko')?.name).toBe('Junko Updated');
    expect(handleUpdated).toHaveBeenCalledWith(updatedUser);
    expect(handleClose).toHaveBeenCalled();
  });
});
