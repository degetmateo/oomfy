import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { formatMessageTimestamp } from '../src/utils/formatTime.js';
import { ChatMessageItem } from '../src/components/chat/ChatMessageItem.js';
import { ChatListSidebar } from '../src/components/chat/ChatListSidebar.js';

describe('Chat 24h Timestamps & Active Conversation Green Highlight', () => {
  it('formats 24h time for messages <= 1 day old and includes date + 24h time for > 1 day old', () => {
    const now = new Date('2026-11-10T15:30:00').getTime();
    const recent = new Date('2026-11-10T00:05:00');
    const old = new Date('2026-11-08T21:45:00');

    const recentFormatted = formatMessageTimestamp(recent, now);
    expect(recentFormatted).toBe('00:05');
    expect(recentFormatted).not.toMatch(/am|pm/i);

    const oldFormatted = formatMessageTimestamp(old, now);
    expect(oldFormatted).toContain('21:45');
    expect(oldFormatted).toMatch(/\d+/);
    expect(oldFormatted).not.toBe('21:45');
  });

  it('renders date + time on first block message and only 24h time on follow-up grouped messages', () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000);
    const fullExpected = formatMessageTimestamp(oldDate);
    const timeOnlyExpected = formatMessageTimestamp(oldDate, Date.now(), false);
    const msg = {
      id: 'm1',
      sender_id: 'u1',
      sender: { id: 'u1', username: 'alice', name: 'Alice' },
      content: 'Hola!',
      created_at: oldDate.toISOString(),
    };

    const { rerender } = render(
      <MemoryRouter><ChatMessageItem isFirstInGroup={true} message={msg} /></MemoryRouter>
    );
    expect(screen.getByText(fullExpected)).toBeInTheDocument();

    rerender(
      <MemoryRouter><ChatMessageItem isFirstInGroup={false} message={msg} /></MemoryRouter>
    );
    expect(screen.getByText(timeOnlyExpected)).toBeInTheDocument();
    expect(screen.queryByText(fullExpected)).not.toBeInTheDocument();
  });

  it('applies green border and background highlight to ANY selected chat card (not just the first)', () => {
    const chats = [
      { id: 'chat-1', participants: [{ id: 'u2', username: 'alice', name: 'Alice' }], last_message: null },
      { id: 'chat-2', participants: [{ id: 'u3', username: 'bob', name: 'Bob' }], last_message: { content: 'Hey', created_at: new Date().toISOString() } },
      { id: 'chat-3', participants: [{ id: 'u4', username: 'carla', name: 'Carla' }], last_message: null },
    ];
    const onSelect = vi.fn();

    render(
      <ChatListSidebar
        chats={chats}
        isLoading={false}
        selectedChatId="chat-2"
        getOtherParticipant={(c) => c.participants[0]}
        onSelectChat={onSelect}
        onOpenNewChat={vi.fn()}
      />
    );

    const secondCard = screen.getByText('Bob').closest('[data-selected]')!;
    expect(secondCard).toHaveAttribute('data-selected', 'true');

    const firstCard = screen.getByText('Alice').closest('[data-selected]')!;
    expect(firstCard).toHaveAttribute('data-selected', 'false');
    expect(secondCard.className).not.toBe(firstCard.className);

    fireEvent.click(screen.getByText('Carla'));
    expect(onSelect).toHaveBeenCalledWith('chat-3');
  });
});

