import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  isDanger?: boolean;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'danger';
  confirmText: string;
  cancelText: string;
  resolveRef: ((val: any) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'alert',
  confirmText: 'Aceptar',
  cancelText: 'Cancelar',
  resolveRef: null,

  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: options.title || 'Confirmación',
        message: options.message,
        type: options.isDanger ? 'danger' : 'confirm',
        confirmText: options.confirmText || (options.isDanger ? 'Eliminar' : 'Confirmar'),
        cancelText: options.cancelText || 'Cancelar',
        resolveRef: resolve,
      });
    });
  },

  alert: (message: string, title: string = 'Aviso') => {
    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        title,
        message,
        type: 'alert',
        confirmText: 'Aceptar',
        cancelText: '',
        resolveRef: resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolveRef, type } = get();
    set({ isOpen: false });
    if (resolveRef) {
      resolveRef(type === 'alert' ? undefined : true);
    }
  },

  handleCancel: () => {
    const { resolveRef, type } = get();
    set({ isOpen: false });
    if (resolveRef) {
      resolveRef(type === 'alert' ? undefined : false);
    }
  },
}));

