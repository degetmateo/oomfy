import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditProfileModal } from './EditProfileModal.js';
import { PublicUser } from '@oomfy/shared';

describe('EditProfileModal Component', () => {
  const dummyUser: PublicUser = {
    id: 'user-456',
    username: 'junko',
    name: 'Junko Enoshima',
    role: 'admin',
    bio: 'Despair queen',
    location: 'Hope Peak',
    link: 'https://despair.net',
    icon_url: null,
    banner_url: null,
    created_at: new Date().toISOString(),
    follower_count: 10,
    followed_count: 5,
    publication_count: 20,
  };

  it('renders modal with all pixel form fields and counters', () => {
    const handleClose = vi.fn();
    const handleUpdated = vi.fn();

    render(
      <EditProfileModal
        user={dummyUser}
        isOpen={true}
        onClose={handleClose}
        onUpdated={handleUpdated}
      />
    );

    expect(screen.getByText('Editar perfil')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Biografía')).toBeInTheDocument();
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Sitio web')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Junko Enoshima')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Despair queen')).toBeInTheDocument();
  });
});

