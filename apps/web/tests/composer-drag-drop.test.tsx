import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationCreator } from '../src/components/publication/PublicationCreator.js';
import { ReplyComposer } from '../src/components/publication/ReplyComposer.js';
import { ChatInputBar } from '../src/components/chat/ChatInputBar.js';
import { useAuthStore } from '../src/stores/authStore.js';

function createFileDragDataTransfer(files: File[]) {
  return {
    types: ['Files'],
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    dropEffect: 'none',
    getData: () => '',
  };
}

describe('Drag & Drop Images and GIFs in Publication & Message Composers', () => {
  const wrap = (ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'tester', name: 'Tester', role: 'member' } as any,
    });
  });

  it('attaches dropped images and GIF files in PublicationCreator and prevents nested child dragleave flicker', () => {
    const { container } = wrap(<PublicationCreator />);
    const form = container.querySelector('form')!;
    const textarea = screen.getByPlaceholderText('¿Qué estás pensando?');

    const png = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
    const gif = new File(['GIF89a'], 'baile.gif', { type: 'image/gif' });
    const dt = createFileDragDataTransfer([png, gif]);

    fireEvent.dragEnter(form, { dataTransfer: dt });
    expect(screen.getByText('Suelta imágenes o GIFs aquí')).toBeInTheDocument();

    // Moving drag into child textarea increments depth and leaving form->textarea keeps overlay visible
    fireEvent.dragEnter(textarea, { dataTransfer: dt });
    fireEvent.dragLeave(form, { relatedTarget: textarea, dataTransfer: dt });
    expect(screen.getByText('Suelta imágenes o GIFs aquí')).toBeInTheDocument();

    fireEvent.drop(form, { dataTransfer: dt });
    expect(screen.queryByText('Suelta imágenes o GIFs aquí')).toBeNull();
    expect(screen.getByText('foto.png')).toBeInTheDocument();
    expect(screen.getByText('baile.gif')).toBeInTheDocument();
  });

  it('attaches dropped GIF URLs (text/html and text/uri-list) and images in ChatInputBar and ReplyComposer', () => {
    const chatView = wrap(
      <ChatInputBar replyingTo={null} onCancelReply={vi.fn()} onSendMessage={vi.fn()} onTyping={vi.fn()} />
    );
    const chatContainer = chatView.container.querySelector('.chat-input-bar-container')!;
    const webp = new File([new Uint8Array([1, 2, 3])], 'sticker.webp', { type: 'image/webp' });
    fireEvent.drop(chatContainer, { dataTransfer: createFileDragDataTransfer([webp]) });
    expect(chatView.getByAltText('sticker.webp')).toBeInTheDocument();

    const gifHtmlDt = {
      types: ['text/html', 'text/uri-list'],
      files: [],
      items: [],
      getData: (t: string) =>
        t === 'text/html'
          ? '<img src="https://media.tenor.com/happy.gif">'
          : t === 'text/uri-list'
          ? 'https://media.tenor.com/happy.gif'
          : '',
    };
    fireEvent.dragOver(chatContainer, { dataTransfer: gifHtmlDt });
    expect(chatView.getByText('Suelta imágenes o GIFs aquí')).toBeInTheDocument();
    fireEvent.drop(chatContainer, { dataTransfer: gifHtmlDt });
    expect(chatView.container.querySelector('img[src="https://media.tenor.com/happy.gif"]')).toBeInTheDocument();
    chatView.unmount();

    const replyView = wrap(<ReplyComposer targetId="p1" onSubmit={vi.fn()} isSubmitting={false} />);
    const replyForm = replyView.container.querySelector('form')!;
    const uriDt = {
      types: ['text/uri-list'],
      files: [],
      items: [],
      getData: (t: string) => (t === 'text/uri-list' ? '# comment\nhttps://cdn.example.com/wave.gif' : ''),
    };
    fireEvent.drop(replyForm, { dataTransfer: uriDt });
    expect(replyView.container.querySelector('img[src="https://cdn.example.com/wave.gif"]')).toBeInTheDocument();
  });

  it('rejects unsupported dropped files with accessible feedback, enforces max 4 limit, and ignores plain text drags', () => {
    const { container } = wrap(<PublicationCreator />);
    const form = container.querySelector('form')!;

    // Plain text drag must NOT show drop overlay or preventDefault
    const plainTextDt = { types: ['text/plain'], files: [], items: [], getData: () => 'hola mundo' };
    const textDragOver = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(textDragOver, 'dataTransfer', { value: plainTextDt });
    fireEvent(form, textDragOver);
    expect(textDragOver.defaultPrevented).toBe(false);
    expect(screen.queryByText('Suelta imágenes o GIFs aquí')).toBeNull();

    // Unsupported file drop calls preventDefault and announces feedback
    const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });
    const pdfDt = createFileDragDataTransfer([pdf]);
    const pdfDrop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(pdfDrop, 'dataTransfer', { value: pdfDt });
    fireEvent(form, pdfDrop);
    expect(pdfDrop.defaultPrevented).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent(/Solo se permiten imágenes y GIFs/i);

    // Enforces max 4 attachments across drops
    const batch = [1, 2, 3, 4, 5].map((n) => new File(['x'], `img${n}.png`, { type: 'image/png' }));
    fireEvent.drop(form, { dataTransfer: createFileDragDataTransfer(batch) });
    expect(screen.getByText('img1.png')).toBeInTheDocument();
    expect(screen.getByText('img4.png')).toBeInTheDocument();
    expect(screen.queryByText('img5.png')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/límite de 4/i);
  });
});
