'use client';
import Link from 'next/link';
import { useLang } from '@/lib/store';
import { LogOut, Languages } from 'lucide-react';

export default function TopBar() {
  const { lang, toggle } = useLang();
  return (
    <header
      className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-gold-400/20"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🥛</span>
          <span className="font-display font-bold text-lg text-gold-700 leading-none">
            {lang === 'ta' ? 'APS பால்பண்ணை' : 'APS MILK CENTER'}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="tap px-3 rounded-full bg-gold-50 text-gold-700 text-sm font-semibold flex items-center gap-1"
            aria-label="Switch language"
          >
            <Languages size={16} />
            {lang === 'ta' ? 'EN' : 'த'}
          </button>
          <Link href="/auth/signout" className="tap flex items-center justify-center text-ink/60">
            <LogOut size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
