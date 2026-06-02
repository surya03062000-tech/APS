'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import Link from 'next/link';

function ResetPasswordForm() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // If Supabase redirects back here with a recovery token, the session is set automatically.
  // We show the "set new password" form in that case.
  const isRecovery = searchParams.get('type') === 'recovery';
  const [mode, setMode] = useState<'request' | 'set'>(isRecovery ? 'set' : 'request');

  useEffect(() => {
    if (isRecovery) setMode('set');
  }, [isRecovery]);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = createBrowser();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password?type=recovery`,
    });
    setBusy(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: t('resetSent', lang), ok: true });
  };

  const setNewPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg({ text: lang === 'ta' ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் வேண்டும்' : 'Password must be at least 6 characters', ok: false });
      return;
    }
    setBusy(true); setMsg(null);
    const sb = createBrowser();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: lang === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password updated successfully!', ok: true });
    setTimeout(() => router.replace('/dashboard'), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <form onSubmit={mode === 'request' ? sendReset : setNewPwd}
        className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-card">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔑</div>
          <h1 className="font-display text-2xl font-bold text-gold-700">
            {t('resetPassword', lang)}
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            {mode === 'request'
              ? (lang === 'ta' ? 'மீட்டமை இணைப்பு மின்னஞ்சலில் அனுப்பப்படும்' : 'A reset link will be sent to your email')
              : (lang === 'ta' ? 'புதிய கடவுச்சொல் உள்ளிடவும்' : 'Enter your new password')}
          </p>
        </div>

        {mode === 'request' ? (
          <>
            <label className="block text-sm font-medium mb-1">{t('email', lang)}</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="tap w-full rounded-xl border border-gold-400/30 bg-milk px-4 mb-4 focus:border-gold-400 focus:outline-none"
            />
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-1">{t('newPassword', lang)}</label>
            <input
              type="password" required minLength={6} value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="tap w-full rounded-xl border border-gold-400/30 bg-milk px-4 mb-4 focus:border-gold-400 focus:outline-none"
            />
          </>
        )}

        {msg && (
          <p className={`text-sm mb-3 ${msg.ok ? 'text-leaf-700' : 'text-red-600'}`}>
            {msg.text}
          </p>
        )}

        <button disabled={busy}
          className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60">
          {busy ? '…' : mode === 'request' ? t('sendResetLink', lang) : t('updatePassword', lang)}
        </button>

        <div className="text-center mt-4">
          <Link href="/auth/signin" className="text-sm text-gold-700 underline">
            {t('backToSignIn', lang)}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
