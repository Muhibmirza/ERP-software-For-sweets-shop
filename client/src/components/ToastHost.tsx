import { X } from 'lucide-react';
import { useUiStore } from '../store/ui';

export function ToastHost() {
  const { toasts, dismiss } = useUiStore();
  return (
    <div className="fixed right-3 top-3 z-50 flex w-[calc(100%-24px)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-slate-800' : 'bg-emerald-600'
          }`}
        >
          <span>{toast.message}</span>
          <button className="touch grid place-items-center" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
