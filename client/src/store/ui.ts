import { create } from 'zustand';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  sidebarOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  toast: (message: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toast: (message, type = 'success') => {
    const id = Date.now();
    set({ toasts: [...get().toasts, { id, type, message }] });
    window.setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((toast) => toast.id !== id) }))
}));
