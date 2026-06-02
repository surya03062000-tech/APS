'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useLang, useDark, useStaff } from '@/lib/store';
import { LogOut, Languages, UserCircle, Moon, Sun, BarChart3 } from 'lucide-react';

export default function TopBar() {
  const { lang, toggle } = useLang();
  const { dark, toggleDark } = useDark();
  const { staff } = useStaff();

  // Apply dark class on mount and whenever dark changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

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
          <button onClick={toggleDark}
            className="tap w-9 h-9 flex items-center justify-center rounded-full bg-gold-50 text-gold-700"
            aria-label="Toggle dark mode">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button onClick={toggle}
            className="tap px-3 rounded-full bg-gold-50 text-gold-700 text-sm font-semibold flex items-center gap-1"
            aria-label="Switch language">
            <Languages size={16} />
            {lang === 'ta' ? 'EN' : 'த'}
          </button>
          {!staff && (
            <Link href="/analytics"
              className="tap flex items-center justify-center text-ink/60"
              aria-label="Analytics">
              <BarChart3 size={20} />
            </Link>
          )}
          <Link href="/profile"
            className="tap flex items-center justify-center text-ink/60"
            aria-label="Profile">
            <UserCircle size={22} />
          </Link>
          <Link href="/auth/signout" className="tap flex items-center justify-center text-ink/60">
            <LogOut size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
