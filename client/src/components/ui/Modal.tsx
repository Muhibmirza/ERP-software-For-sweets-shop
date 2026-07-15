import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      style={{ backdropFilter: 'blur(5px)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-scroll max-h-[92vh] w-full ${sizeClasses[size]} overflow-y-auto rounded-2xl border border-[#ead8bb] bg-[#fffaf0] shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ead8bb] bg-[#fffaf0]/95 px-5 py-4 backdrop-blur">
          <h2 className="font-serif text-xl font-semibold text-[#0f615d]">{title}</h2>
          <button className="touch grid place-items-center rounded-xl text-[#55716d] hover:bg-[#f1e3cb]" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
