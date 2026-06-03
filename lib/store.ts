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

// ── Toast notifications (Feature #39) ──────────────────────────────────────
export type Toast = { id: number; text: string; type: 'success' | 'error' | 'info' };
type ToastState = {
  toasts: Toast[];
  show: (text: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
};
export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (text, type = 'success') => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, text, type }] });
    setTimeout(() => get().dismiss(id), 3000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));

// ── PIN lock (Feature #42) ─────────────────────────────────────────────────
type PinState = {
  pin: string | null;          // hashed PIN
  locked: boolean;
  setPin: (pin: string | null) => void;
  unlock: (attempt: string) => boolean;
  lock: () => void;
};
const hashPin = (p: string) => {
  // Simple hash — not cryptographic, just to avoid plaintext storage
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h << 5) - h + p.charCodeAt(i);
  return String(h);
};
export const usePin = create<PinState>()(
  persist(
    (set, get) => ({
      pin: null,
      locked: false,
      setPin: (pin) => set({ pin: pin ? hashPin(pin) : null, locked: false }),
      unlock: (attempt) => {
        if (get().pin === hashPin(attempt)) { set({ locked: false }); return true; }
        return false;
      },
      lock: () => { if (get().pin) set({ locked: true }); },
    }),
    { name: 'aps-pin' }
  )
);

// ── Staff mode (Feature #41) ───────────────────────────────────────────────
// When on, money-sensitive screens (reports, analytics) are hidden so the
// owner can safely hand the phone to an assistant for entry only.
type StaffState = { staff: boolean; setStaff: (v: boolean) => void };
export const useStaff = create<StaffState>()(
  persist(
    (set) => ({ staff: false, setStaff: (staff) => set({ staff }) }),
    { name: 'aps-staff' }
  )
);
