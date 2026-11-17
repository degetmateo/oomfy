import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatScrollBottomButton } from '../src/components/chat/ChatScrollBottomButton.js';
import { ChatTypingIndicator } from '../src/components/chat/ChatTypingIndicator.js';
import { ChatMessageReplyPreview } from '../src/components/chat/ChatMessageReplyPreview.js';
import { ChatMessageItem } from '../src/components/chat/ChatMessageItem.js';
import { useChatScroll } from '../src/hooks/useChatScroll.js';

describe('Chat Scroll, Swipe-to-Reply and Typing Indicator Updates', () => {
  it('manages auto-scroll state, scroll-to-message, and floating button visibility', () => {
    let scrollHook: any;
    const TestComponent = () => {
      scrollHook = useChatScroll();
      return (
        <div className="flex-1 min-h-0 flex flex-col relative">
          <div ref={scrollHook.scrollContainerRef} onScroll={scrollHook.handleScroll} style={{ height: 200, overflowY: 'auto' }}>
            <div data-message-id="msg-1" style={{ height: 100 }}>Message 1</div>
            <div data-message-id="msg-2" style={{ height: 200 }}>Message 2</div>
          </div>
          <ChatScrollBottomButton visible={scrollHook.showScrollBottomButton} onClick={() => scrollHook.scrollToBottom('instant', true)} />
        </div>
      );
    };

    render(<TestComponent />);
    expect(scrollHook.isAutoScrollEnabled).toBe(true);
    expect(screen.queryByRole('button', { name: /Volver a los mensajes recientes/i })).toBeNull();

    // Scroll to an older message: disables auto-scroll and shows floating button
    const target = document.querySelector('[data-message-id="msg-1"]') as HTMLElement;
    target.scrollIntoView = vi.fn();
    act(() => { scrollHook.scrollToMessage('msg-1'); });

    expect(scrollHook.isAutoScrollEnabled).toBe(false);
    expect(scrollHook.showScrollBottomButton).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(screen.getByRole('button', { name: /Volver a los mensajes recientes/i })).toBeInTheDocument();

    // Clicking floating button restores auto-scroll
    fireEvent.click(screen.getByRole('button', { name: /Volver a los mensajes recientes/i }));
    expect(scrollHook.isAutoScrollEnabled).toBe(true);
    expect(scrollHook.showScrollBottomButton).toBe(false);
  });

  it('triggers jump to replied message on clicking reply preview', () => {
    const onJump = vi.fn();
    render(
      <MemoryRouter>
        <ChatMessageReplyPreview replyTo={{ id: 'orig-1', sender_username: 'bob', content: 'Pregunta previa' }} onJumpToMessage={onJump} />
      </MemoryRouter>
    );
    const jumpBtn = screen.getByRole('button', { name: /Ver mensaje respondido de @bob/i });
    fireEvent.click(jumpBtn);
    expect(onJump).toHaveBeenCalledWith('orig-1');
  });

  it('translates message on touch swipe and triggers reply on threshold', () => {
    const onReply = vi.fn();
    const message = { id: 'm-1', content: 'Deslízame', sender: { username: 'alice' }, created_at: new Date().toISOString() };
    const { container } = render(
      <MemoryRouter>
        <ChatMessageItem message={message} onReply={onReply} />
      </MemoryRouter>
    );

    const item = container.querySelector('#msg-m-1') as HTMLElement;
    fireEvent.touchStart(item, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(item, { touches: [{ clientX: 140, clientY: 100 }] }); // dx = 60 > 44
    expect(item.style.transform).toContain('translateX(-');

    fireEvent.touchEnd(item, { changedTouches: [{ clientX: 140, clientY: 100 }] });
    expect(onReply).toHaveBeenCalledWith(message);
    expect(item.style.transform).toBe('translateX(-0px)');
  });

  it('maintains a fixed h-6 slot for ChatTypingIndicator to prevent layout shifts', () => {
    const { container, rerender } = render(<ChatTypingIndicator typingUser={null} />);
    const indicatorSlot = container.firstElementChild as HTMLElement;
    expect(indicatorSlot.className).toContain('h-6');
    expect(screen.queryByText(/está escribiendo/)).toBeNull();

    rerender(<ChatTypingIndicator typingUser="carlos" />);
    expect(indicatorSlot.className).toContain('h-6');
    expect(screen.getByText('@carlos está escribiendo...')).toBeInTheDocument();
  });
});
