import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPickerMenu } from './EmojiPickerMenu.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useEmoteStore } from '../../stores/emoteStore.js';

describe('EmojiPickerMenu Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null as any });
    useEmoteStore.setState({ emotes: [], isLoaded: true, isLoading: false });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<EmojiPickerMenu isOpen={false} onClose={vi.fn()} onSelectEmoji={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders categories and emojis when isOpen is true', () => {
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={vi.fn()} />);
    expect(screen.getByTitle('Caras')).toBeInTheDocument();
    expect(screen.getByTitle('Gestos')).toBeInTheDocument();
    expect(screen.getByText('😀')).toBeInTheDocument();
  });

  it('switches category when category button clicked', () => {
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Gestos'));
    expect(screen.getByText('👌')).toBeInTheDocument();
  });

  it('triggers onSelectEmoji when an emoji is clicked', () => {
    const onSelect = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={onSelect} />);
    fireEvent.click(screen.getByText('😀'));
    expect(onSelect).toHaveBeenCalledWith('😀');
  });

  it('shows user personal emotes first in the first tab and selects them on click', () => {
    useAuthStore.setState({ user: { id: 'user-1', username: 'tester', name: 'Tester', role: 'member' } as any });
    useEmoteStore.setState({
      emotes: [
        { id: 'e1', name: 'hype', image_url: '/emotes/hype.png', creator_id: 'user-1', creator_username: 'tester', created_at: '' },
        { id: 'e2', name: 'other_emote', image_url: '/emotes/other.png', creator_id: 'user-2', creator_username: 'other', created_at: '' },
      ],
      isLoaded: true,
      isLoading: false,
    });

    const onSelect = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={onSelect} />);

    expect(screen.getByText('Tus Emotes')).toBeInTheDocument();
    const emoteBtn = screen.getByTitle(':hype:');
    expect(emoteBtn).toBeInTheDocument();
    expect(screen.queryByTitle(':other_emote:')).toBeNull();

    fireEvent.click(emoteBtn);
    expect(onSelect).toHaveBeenCalledWith(':hype: ');
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={onClose} onSelectEmoji={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
