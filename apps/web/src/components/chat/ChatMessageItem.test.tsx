import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatMessageItem } from './ChatMessageItem.js';

describe('ChatMessageItem Component', () => {
  const dummyMessage = {
    id: 'msg-123',
    content: 'Hola, este es un mensaje con estilo Discord y fuente Inter',
    sender_id: 'user-1',
    sender: {
      id: 'user-1',
      username: 'oomfy_user',
      name: 'Oomfy User',
    },
    created_at: new Date('2026-10-30T15:30:00Z').toISOString(),
  };

  const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renders message text with font-sans class', () => {
    renderWithRouter(<ChatMessageItem message={dummyMessage} isFirstInGroup={true} />);
    const contentEl = screen.getByText(dummyMessage.content);
    expect(contentEl).toBeInTheDocument();
    expect(contentEl).toHaveClass('font-sans');
  });

  it('renders sender header when isFirstInGroup is true', () => {
    renderWithRouter(<ChatMessageItem message={dummyMessage} isFirstInGroup={true} />);
    expect(screen.getByText('Oomfy User')).toBeInTheDocument();
    expect(screen.getByText('@oomfy_user')).toBeInTheDocument();
  });

  it('renders compact line when isFirstInGroup is false', () => {
    renderWithRouter(<ChatMessageItem message={dummyMessage} isFirstInGroup={false} />);
    expect(screen.queryByText('@oomfy_user')).not.toBeInTheDocument();
    expect(screen.getByText(dummyMessage.content)).toBeInTheDocument();
  });

  it('renders reply reference when reply_to is present', () => {
    const msgWithReply = {
      ...dummyMessage,
      reply_to: {
        id: 'msg-000',
        content: 'Mensaje original a responder',
        sender_username: 'mateo_dev',
      },
    };
    renderWithRouter(<ChatMessageItem message={msgWithReply} isFirstInGroup={true} />);
    expect(screen.getByText('@mateo_dev')).toBeInTheDocument();
    expect(screen.getByText('Mensaje original a responder')).toBeInTheDocument();
  });

  it('triggers onReply, onReport and onDelete callbacks', () => {
    const onReply = vi.fn();
    const onReport = vi.fn();
    const onDelete = vi.fn();
    renderWithRouter(
      <ChatMessageItem message={dummyMessage} isMe={true} onReply={onReply} onReport={onReport} onDelete={onDelete} />
    );

    const replyBtn = screen.getByRole('button', { name: /responder/i });
    fireEvent.click(replyBtn);
    expect(onReply).toHaveBeenCalledWith(dummyMessage);

    const deleteBtn = screen.getByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(dummyMessage);
  });
});
