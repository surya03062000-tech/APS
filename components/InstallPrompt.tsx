'use client';
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLang } from '@/lib/store';

export default function InstallPrompt() {
  const { lang } = useLang();
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      if (!localStorage.getItem('aps-install-dismissed')) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('aps-install-dismissed', '1');
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gold-400/30">
      <span className="text-3xl">🥛</span>
      <div className="flex-1">
        <p className="font-semibold text-sm">
          {lang === 'ta' ? 'APS-ஐ நிறுவவா?' : 'Install APS app?'}
        </p>
        <p className="text-xs text-ink/50">
          {lang === 'ta' ? 'முகப்புத் திரையில் சேர்க்கவும்' : 'Add to home screen for quick access'}
        </p>
      </div>
      <button onClick={install} className="tap px-3 rounded-xl bg-gold-400 text-white text-sm font-semibold flex items-center gap-1">
        <Download size={15} /> {lang === 'ta' ? 'நிறுவு' : 'Install'}
      </button>
      <button onClick={dismiss} className="text-ink/40"><X size={18} /></button>
    </div>
  );
}
