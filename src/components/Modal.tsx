import { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  title,
  open,
  onClose,
  children,
  wide,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={`mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#3b8fc4] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button aria-label="Close modal" onClick={onClose} className="text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
