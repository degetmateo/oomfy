import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileDrawerTrigger } from './MobileDrawerTrigger.js';
import { MobileSideDrawer } from './MobileSideDrawer.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

describe('MobileDrawerTrigger & MobileSideDrawer', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u-1',
        username: 'alice',
        name: 'Alice',
        role: 'member',
        icon_url: null,
        banner_url: null,
        followed_count: 3,
        follower_count: 5,
      } as any,
    });
    useUIStore.setState({ isMobileDrawerOpen: false });
  });

  const renderDrawer = () =>
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MobileDrawerTrigger />
          <MobileSideDrawer />
        </QueryClientProvider>
      </MemoryRouter>
    );

  it('removes focus outline classes from trigger and blurs trigger on click', () => {
    renderDrawer();
    const trigger = screen.getByTestId('mobile-drawer-trigger');
    expect(trigger.className).toContain('outline-none');
    expect(trigger.className).not.toContain('focus-visible:ring-2');

    const blurSpy = vi.spyOn(trigger, 'blur');
    fireEvent.click(trigger);

    expect(blurSpy).toHaveBeenCalled();
    expect(useUIStore.getState().isMobileDrawerOpen).toBe(true);
  });

  it('focuses the aside sheet container instead of the profile link when opening', () => {
    renderDrawer();
    const trigger = screen.getByTestId('mobile-drawer-trigger');
    fireEvent.click(trigger);

    const aside = screen.getByLabelText('Panel de usuario y opciones');
    const profileLink = screen.getByRole('link', { name: /Alice/i });
    expect(aside).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(aside);
    expect(document.activeElement).not.toBe(profileLink);
    expect(profileLink.className).toContain('outline-none');
  });
});
