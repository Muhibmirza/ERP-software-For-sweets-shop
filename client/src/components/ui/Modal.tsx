import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: '400px',
  md: '560px',
  lg: '768px',
  xl: '1024px'
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        overscrollBehavior: 'contain'
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-scroll overflow-y-auto border border-[#ead8bb] bg-[#fffaf0]"
        style={{
          width: '100%',
          maxWidth: sizeMap[size],
          maxHeight: 'calc(100dvh - 32px)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative'
        }}
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
    </div>,
    document.body
  );
}
