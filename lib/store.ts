'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from './i18n';

type LangState = { lang: Lang; setLang: (l: Lang) => void; toggle: () => void };
type DarkState = { dark: boolean; toggleDark: () => void };

export const useLang = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'ta',
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === 'ta' ? 'en' : 'ta' }),
    }),
    { name: 'aps-lang' }
  )
);

export const useDark = create<DarkState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggleDark: () => {
        const next = !get().dark;
        set({ dark: next });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next);
        }
      },
    }),
    { name: 'aps-dark' }
  )
);
