import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageItem } from './ChatMessageItem.js';

describe('ChatMessageItem Component', () => {
  const dummyMessage = {
    id: 'msg-123',
    content: 'Hola, este es un mensaje con fuente Inter',
    sender_id: 'user-1',
    created_at: new Date('2026-10-30T15:30:00Z').toISOString(),
  };

  it('renders message text with font-sans class', () => {
    render(<ChatMessageItem message={dummyMessage} isMe={false} />);
    const contentEl = screen.getByText(dummyMessage.content);
    expect(contentEl).toBeInTheDocument();
    expect(contentEl).toHaveClass('font-sans');
  });

  it('aligns to end when isMe is true', () => {
    const { container } = render(<ChatMessageItem message={dummyMessage} isMe={true} />);
    const rootEl = container.firstChild as HTMLElement;
    expect(rootEl).toHaveClass('self-end');
  });

  it('aligns to start when isMe is false', () => {
    const { container } = render(<ChatMessageItem message={dummyMessage} isMe={false} />);
    const rootEl = container.firstChild as HTMLElement;
    expect(rootEl).toHaveClass('self-start');
  });
});

