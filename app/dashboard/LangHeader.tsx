'use client';
import { useLang } from '@/lib/store';

export default function DashboardLangHeader() {
  const { lang } = useLang();
  const today = new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return (
    <div className="pt-2">
      <h1 className="font-display text-2xl font-bold text-ink">
        {lang === 'ta' ? 'வணக்கம்' : 'Welcome'} 👋
      </h1>
      <p className="text-ink/60 text-sm">{today}</p>
    </div>
  );
}
