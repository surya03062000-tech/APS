'use client';
import { useEffect, useState } from 'react';
import { usePin, useLang } from '@/lib/store';
import { Delete, Lock } from 'lucide-react';

// PIN lock screen + auto-lock on idle (Features #42 + #44)
export default function PinLock() {
  const { lang } = useLang();
  const { pin, locked, unlock, lock } = usePin();
  const [entry, setEntry] = useState('');
  const [err, setErr] = useState(false);

  // Auto-lock after 30 min idle (Feature #44)
  useEffect(() => {
    if (!pin) return;
    let timer: any;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => lock(), 30 * 60 * 1000); };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [pin, lock]);

  // Lock when tab hidden then revealed
  useEffect(() => {
    if (!pin) return;
    const onVis = () => { if (document.visibilityState === 'hidden') lock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pin, lock]);

  useEffect(() => {
    if (entry.length === 4) {
      if (unlock(entry)) { setEntry(''); setErr(false); }
      else { setErr(true); setTimeout(() => { setEntry(''); setErr(false); }, 600); }
    }
  }, [entry]);

  if (!locked || !pin) return null;

  const press = (d: string) => entry.length < 4 && setEntry(entry + d);

  return (
    <div className="fixed inset-0 z-[200] bg-cream flex flex-col items-center justify-center px-8">
      <Lock size={40} className="text-gold-600 mb-3" />
      <h1 className="font-display font-bold text-xl mb-1">
        {lang === 'ta' ? 'PIN உள்ளிடவும்' : 'Enter PIN'}
      </h1>
      <div className={`flex gap-3 my-6 ${err ? 'animate-[shake_0.4s]' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < entry.length ? 'bg-gold-400 border-gold-400' : 'border-gold-400/40'} ${err ? 'border-red-500' : ''}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} onClick={() => press(d)}
            className="w-16 h-16 rounded-full bg-white shadow-card text-2xl font-semibold active:bg-gold-50">
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}
          className="w-16 h-16 rounded-full bg-white shadow-card text-2xl font-semibold active:bg-gold-50">0</button>
        <button onClick={() => setEntry(entry.slice(0, -1))}
          className="w-16 h-16 rounded-full grid place-items-center text-ink/50">
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
