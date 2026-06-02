'use client';
import { useToast } from '@/lib/store';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <button key={t.id} onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-[slideDown_0.2s_ease] text-white
            ${t.type === 'success' ? 'bg-leaf-700' : t.type === 'error' ? 'bg-red-600' : 'bg-gold-600'}`}>
          {t.type === 'success' ? <CheckCircle size={18} /> : t.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
          {t.text}
        </button>
      ))}
    </div>
  );
}
