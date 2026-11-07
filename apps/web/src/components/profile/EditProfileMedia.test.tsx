import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditProfileMedia } from './EditProfileMedia.js';

describe('EditProfileMedia Component', () => {
  it('directly calls onBannerChange and onIconChange when selecting a GIF file', () => {
    const onBannerChange = vi.fn();
    const onBannerRemove = vi.fn();
    const onIconChange = vi.fn();

    const { container } = render(
      <EditProfileMedia
        username="oomfy"
        bannerPreview={null}
        iconPreview={null}
        onBannerChange={onBannerChange}
        onBannerRemove={onBannerRemove}
        onIconChange={onIconChange}
      />
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const bannerInput = inputs[0];
    const iconInput = inputs[1];

    const gifFile = new File(['gif data'], 'avatar.gif', { type: 'image/gif' });
    fireEvent.change(bannerInput, { target: { files: [gifFile] } });
    expect(onBannerChange).toHaveBeenCalledWith(gifFile);

    fireEvent.change(iconInput, { target: { files: [gifFile] } });
    expect(onIconChange).toHaveBeenCalledWith(gifFile);
  });
});
