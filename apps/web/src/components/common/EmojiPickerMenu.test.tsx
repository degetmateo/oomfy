import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPickerMenu } from './EmojiPickerMenu.js';

describe('EmojiPickerMenu Component', () => {
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
    const gestosBtn = screen.getByTitle('Gestos');
    fireEvent.click(gestosBtn);
    expect(screen.getByText('👌')).toBeInTheDocument();
  });

  it('triggers onSelectEmoji when an emoji is clicked', () => {
    const onSelect = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={vi.fn()} onSelectEmoji={onSelect} />);
    const emojiBtn = screen.getByText('😀');
    fireEvent.click(emojiBtn);
    expect(onSelect).toHaveBeenCalledWith('😀');
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<EmojiPickerMenu isOpen={true} onClose={onClose} onSelectEmoji={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
