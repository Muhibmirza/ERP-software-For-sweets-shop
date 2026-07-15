import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ open, title, message, onCancel, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#031716]/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-600" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="touch rounded-md border px-4 text-sm dark:border-slate-700" onClick={onCancel}>
            Cancel
          </button>
          <button className="touch rounded-md bg-red-600 px-4 text-sm text-white" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
