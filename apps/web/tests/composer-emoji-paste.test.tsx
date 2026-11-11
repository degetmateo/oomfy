import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePostModal } from '../src/components/publication/CreatePostModal.js';
import { PublicationCreator } from '../src/components/publication/PublicationCreator.js';
import { ReplyComposer } from '../src/components/publication/ReplyComposer.js';
import { ChatInputBar } from '../src/components/chat/ChatInputBar.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Composers Emoji Portal, Clipboard Paste & Mobile Keyboard GIFs', () => {
  const wrap = (ui: React.ReactElement) =>
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider></MemoryRouter>);

  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', username: 'tester', name: 'Tester', role: 'member' } as any });
  });

  it('renders EmojiPickerMenu via portal inside document.body outside CreatePostModal dialog box', () => {
    wrap(<CreatePostModal isOpen={true} onClose={vi.fn()} />);
    const emojiBtn = screen.getByTitle('Emojis');
    fireEvent.click(emojiBtn);

    const emojiOption = screen.getByText('😀');
    const modalBox = screen.getByText('Nueva publicación').parentElement!.parentElement!;
    expect(modalBox.contains(emojiOption)).toBe(false);
    expect(document.body.contains(emojiOption)).toBe(true);
  });

  it('attaches pasted image files directly in PublicationCreator, ReplyComposer, and ChatInputBar', () => {
    const pngFile = new File([new Uint8Array([1, 2, 3])], 'screenshot.png', { type: 'image/png' });
    const dt = { items: [{ kind: 'file', type: 'image/png', getAsFile: () => pngFile }], files: [pngFile], getData: () => '' };

    const pubView = wrap(<PublicationCreator />);
    fireEvent.paste(pubView.getByPlaceholderText('¿Qué estás pensando?'), { clipboardData: dt });
    expect(pubView.getByText('screenshot.png')).toBeInTheDocument();
    pubView.unmount();

    const replyView = wrap(<ReplyComposer targetId="p1" onSubmit={vi.fn()} isSubmitting={false} />);
    fireEvent.paste(replyView.getByPlaceholderText('Publicar tu respuesta...'), { clipboardData: dt });
    expect(replyView.getByText('screenshot.png')).toBeInTheDocument();
    replyView.unmount();

    const chatView = wrap(<ChatInputBar replyingTo={null} onCancelReply={vi.fn()} onSendMessage={vi.fn()} onTyping={vi.fn()} />);
    fireEvent.paste(chatView.getByPlaceholderText('Escribe un mensaje...'), { clipboardData: dt });
    expect(chatView.getByText('screenshot.png')).toBeInTheDocument();
  });

  it('attaches GIFs inserted from mobile keyboard beforeinput dataTransfer in posts and chats', () => {
    const gifFile = new File(['GIF89a'], 'gboard.gif', { type: 'image/gif' });
    const htmlDt = { items: [], files: [], getData: (t: string) => (t === 'text/html' ? '<img src="https://media.tenor.com/cat.gif">' : '') };

    const pubView = wrap(<PublicationCreator />);
    const pubInput = pubView.getByPlaceholderText('¿Qué estás pensando?');
    const fileEvt = new Event('beforeinput', { bubbles: true, cancelable: true });
    Object.defineProperty(fileEvt, 'dataTransfer', { value: { items: [{ kind: 'file', type: 'image/gif', getAsFile: () => gifFile }], files: [gifFile], getData: () => '' } });
    fireEvent(pubInput, fileEvt);
    expect(pubView.getByText('gboard.gif')).toBeInTheDocument();
    pubView.unmount();

    const chatView = wrap(<ChatInputBar replyingTo={null} onCancelReply={vi.fn()} onSendMessage={vi.fn()} onTyping={vi.fn()} />);
    const chatInput = chatView.getByPlaceholderText('Escribe un mensaje...');
    const htmlEvt = new Event('beforeinput', { bubbles: true, cancelable: true });
    Object.defineProperty(htmlEvt, 'dataTransfer', { value: htmlDt });
    fireEvent(chatInput, htmlEvt);
    expect(chatView.container.querySelector('img[src="https://media.tenor.com/cat.gif"]')).toBeInTheDocument();
  });
});

