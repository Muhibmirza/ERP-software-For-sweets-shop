import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  danger = true,
  isLoading = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[#55716d]">{message}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="touch rounded-xl border border-[#dac197] bg-white/75 font-semibold text-[#0f615d]" onClick={onClose}>
          Cancel
        </button>
        <button
          className={`touch rounded-xl font-semibold text-white shadow-lg disabled:opacity-60 ${danger ? 'bg-red-600 shadow-red-600/20' : 'bg-[#0f615d] shadow-[#0f615d]/20'}`}
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
