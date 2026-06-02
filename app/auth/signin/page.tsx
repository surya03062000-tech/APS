'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';

export default function SignIn() {
  const { lang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = createBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-card">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🥛</div>
          <h1 className="font-display text-2xl font-bold text-gold-700">
            {lang === 'ta' ? 'APS பால்பண்ணை' : 'APS MILK CENTER'}
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            {lang === 'ta' ? 'கணக்கில் உள்நுழை' : 'Sign in to your account'}
          </p>
        </div>

        <label className="block text-sm font-medium mb-1">{t('email', lang)}</label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="tap w-full rounded-xl border border-gold-400/30 bg-milk px-4 mb-3 focus:border-gold-400 focus:outline-none"
        />

        <label className="block text-sm font-medium mb-1">{t('password', lang)}</label>
        <div className="relative mb-4">
          <input
            type={showPwd ? 'text' : 'password'} required value={password}
            onChange={e => setPassword(e.target.value)}
            className="tap w-full rounded-xl border border-gold-400/30 bg-milk px-4 pr-12 focus:border-gold-400 focus:outline-none"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70">
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <button disabled={busy}
          className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60">
          {busy ? '…' : t('signIn', lang)}
        </button>

        <div className="text-center mt-4">
          <Link href="/auth/reset-password" className="text-sm text-gold-600 underline">
            {t('forgotPassword', lang)}
          </Link>
        </div>
      </form>
    </div>
  );
}
