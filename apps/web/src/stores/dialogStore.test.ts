import { describe, it, expect } from 'vitest';
import { useDialogStore } from './dialogStore.js';

describe('useDialogStore', () => {
  it('should initialize with dialog closed', () => {
    const state = useDialogStore.getState();
    expect(state.isOpen).toBe(false);
  });

  it('should open confirm dialog with custom options', async () => {
    const promise = useDialogStore.getState().confirm({
      title: 'Eliminar cuenta',
      message: '¿Estás seguro?',
      isDanger: true,
      confirmText: 'Sí, borrar',
    });

    const state = useDialogStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Eliminar cuenta');
    expect(state.message).toBe('¿Estás seguro?');
    expect(state.type).toBe('danger');
    expect(state.confirmText).toBe('Sí, borrar');

    // Confirm it
    state.handleConfirm();
    const result = await promise;
    expect(result).toBe(true);
    expect(useDialogStore.getState().isOpen).toBe(false);
  });

  it('should handle cancel in confirm dialog', async () => {
    const promise = useDialogStore.getState().confirm({
      title: 'Aviso',
      message: '¿Continuar?',
    });

    useDialogStore.getState().handleCancel();
    const result = await promise;
    expect(result).toBe(false);
    expect(useDialogStore.getState().isOpen).toBe(false);
  });
});

