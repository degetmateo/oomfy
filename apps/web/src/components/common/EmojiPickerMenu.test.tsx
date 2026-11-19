import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPickerMenu } from './EmojiPickerMenu.js';
import { EMOJI_CATEGORIES } from '../../utils/emojiData.js';
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

  it('renders all 9 categorized sections and a comprehensive emoji catalog', () => {
    const totalEmojis = EMOJI_CATEGORIES.reduce((acc, c) => acc + c.items.length, 0);
    expect(totalEmojis).toBeGreaterThan(500);
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={vi.fn()} />);
    for (const name of ['Caras', 'Gestos', 'Corazones', 'Naturaleza', 'Comida', 'Actividades', 'Viajes', 'Objetos', 'Símbolos']) {
      expect(screen.getByTitle(name)).toBeInTheDocument();
    }
    expect(screen.getByText('😀')).toBeInTheDocument();
  });

  it('switches category when category button clicked', () => {
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Gestos'));
    expect(screen.getByText('👌')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Comida'));
    expect(screen.getByRole('button', { name: /taco mexicano/i })).toBeInTheDocument();
  });

  it('searches across all emoji sections accent-insensitively and handles empty state', () => {
    const onSelect = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={onSelect} />);
    const input = screen.getByLabelText('Buscar emoji');

    fireEvent.change(input, { target: { value: 'cohete' } });
    const rocketBtn = screen.getByRole('button', { name: /cohete espacio/i });
    expect(rocketBtn).toBeInTheDocument();
    expect(screen.queryByText('😀')).toBeNull();
    fireEvent.click(rocketBtn);
    expect(onSelect).toHaveBeenCalledWith('🚀');

    fireEvent.change(input, { target: { value: 'murcielago' } });
    expect(screen.getByRole('button', { name: /murcielago/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'zzzz_no_existe' } });
    expect(screen.getByText('No se encontraron emojis.')).toBeInTheDocument();
  });

  it('shows and filters user personal emotes and selects them on click', () => {
    useAuthStore.setState({ user: { id: 'user-1', username: 'tester', name: 'Tester', role: 'member' } as any });
    useEmoteStore.setState({
      emotes: [
        { id: 'e1', name: 'hype', image_url: '/emotes/hype.png', creator_id: 'user-1', creator_username: 'tester', created_at: '' },
        { id: 'e2', name: 'sadcat', image_url: '/emotes/sad.png', creator_id: 'user-1', creator_username: 'tester', created_at: '' },
        { id: 'e3', name: 'other_emote', image_url: '/emotes/other.png', creator_id: 'user-2', creator_username: 'other', created_at: '' },
      ],
      isLoaded: true, isLoading: false,
    });

    const onSelect = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={onSelect} />);
    expect(screen.getByText('Tus Emotes')).toBeInTheDocument();
    expect(screen.getByTitle(':hype:')).toBeInTheDocument();
    expect(screen.queryByTitle(':other_emote:')).toBeNull();

    fireEvent.change(screen.getByLabelText('Buscar emoji'), { target: { value: 'hype' } });
    expect(screen.getByTitle(':hype:')).toBeInTheDocument();
    expect(screen.queryByTitle(':sadcat:')).toBeNull();

    fireEvent.click(screen.getByTitle(':hype:'));
    expect(onSelect).toHaveBeenCalledWith(':hype: ');
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={onClose} onSelectEmoji={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
