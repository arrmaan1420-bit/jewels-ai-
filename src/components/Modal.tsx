import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Modal({ open, title, onClose, children, maxWidthClass = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Solid Luxury High-Contrast Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 my-auto flex max-h-[90vh] w-full ${maxWidthClass} flex-col rounded-2xl border border-champagne/40 bg-[#08130e] shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(214,181,109,0.2)] ring-1 ring-white/10`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-4 rounded-t-2xl">
          <h2 id="modal-title" className="font-serif text-2xl font-normal text-white tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-6 py-6 text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}
