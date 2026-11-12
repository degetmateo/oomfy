import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUserRow } from '../src/components/admin/AdminUserRow.js';
import { AdminEditUserModal } from '../src/components/admin/AdminEditUserModal.js';
import { AdminUserFiltersBar } from '../src/components/admin/AdminUserFiltersBar.js';
import { ChatInputBar } from '../src/components/chat/ChatInputBar.js';
import { ApiClient } from '../src/services/api.js';

describe('Admin Email Privacy & IME-safe Chat Submit', () => {
  const queryClient = new QueryClient();
  const sampleUser = {
    id: 'u-1',
    username: 'mateo',
    name: 'Mateo',
    role: 'member' as const,
    status: 'active' as const,
    created_at: '2026-01-15T12:00:00Z',
  };

  beforeEach(() => vi.restoreAllMocks());

  it('never displays email in AdminUserRow or filter placeholder', () => {
    const userWithLeakedEmail = { ...sampleUser, email: 'secret@oomfy.online' } as any;
    render(
      <>
        <AdminUserFiltersBar
          filters={{ query: '', role: '', status: '', from: '', to: '' }}
          onChange={vi.fn()}
          onReset={vi.fn()}
        />
        <AdminUserRow
          user={userWithLeakedEmail}
          onToggleStatus={vi.fn()}
          onRevokeSessions={vi.fn()}
          onRoleChange={vi.fn()}
          onEdit={vi.fn()}
        />
      </>
    );

    expect(screen.queryByText(/secret@oomfy\.online/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre o @username/i)).toBeInTheDocument();
  });

  it('omits email input and omits email from PUT /admin/users/:id in AdminEditUserModal', async () => {
    const putSpy = vi.spyOn(ApiClient, 'put').mockResolvedValue({ success: true } as any);
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<AdminEditUserModal user={sampleUser} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByText(/^email$/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/email|correo/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(putSpy).toHaveBeenCalledTimes(1));
    expect(putSpy.mock.calls[0][1]).not.toHaveProperty('email');
  });

  it('ignores Enter during IME composition (isComposing or keyCode 229) in ChatInputBar', () => {
    const onSendMessage = vi.fn();
    const hadOwnTouch = Object.prototype.hasOwnProperty.call(window, 'ontouchstart');
    const hadProtoTouch = Object.prototype.hasOwnProperty.call(Window.prototype, 'ontouchstart');
    delete (window as any).ontouchstart;
    delete (Window.prototype as any).ontouchstart;
    try {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInputBar replyingTo={null} onCancelReply={vi.fn()} onSendMessage={onSendMessage} onTyping={vi.fn()} />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText('Escribe un mensaje...');
      fireEvent.change(textarea, { target: { value: 'こんにちは' } });
      fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
      expect(onSendMessage).not.toHaveBeenCalled();

      fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 });
      expect(onSendMessage).toHaveBeenCalledTimes(1);
    } finally {
      if (hadOwnTouch) (window as any).ontouchstart = null;
      if (hadProtoTouch) (Window.prototype as any).ontouchstart = null;
    }
  });
});
