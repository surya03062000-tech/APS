'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';

export default function NewCustomer() {
  const { lang } = useLang();
  const router = useRouter();
  const [f, setF] = useState({
    code: '', name: '', phone: '', whatsapp_enabled: false, notes: '', default_rate: '60',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const sb = createBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from('customers').insert({
      owner_id: user.id,
      code: Number(f.code),
      name: f.name,
      phone: f.phone || null,
      whatsapp_enabled: f.whatsapp_enabled,
      notes: f.notes || null,
      default_rate: Number(f.default_rate),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push('/customers');
    router.refresh();
  };

  const field = 'tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">{t('addCustomer', lang)}</h1>

      <div>
        <label className="text-sm font-medium mb-1 block">{t('code', lang)}</label>
        <input type="number" required value={f.code}
          onChange={e=>setF({...f, code:e.target.value})} className={field}/>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('name', lang)}</label>
        <input required value={f.name}
          onChange={e=>setF({...f, name:e.target.value})} className={field}/>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('phone', lang)}</label>
        <input type="tel" value={f.phone}
          onChange={e=>setF({...f, phone:e.target.value})} className={field}/>
      </div>
      <label className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gold-400/30">
        <input type="checkbox" checked={f.whatsapp_enabled}
          onChange={e=>setF({...f, whatsapp_enabled:e.target.checked})}
          className="w-5 h-5 accent-gold-400"/>
        <span className="text-sm">{t('whatsapp', lang)}?</span>
      </label>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('rate', lang)}</label>
        <input type="number" step="0.1" value={f.default_rate}
          onChange={e=>setF({...f, default_rate:e.target.value})} className={field}/>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('notes', lang)}</label>
        <textarea rows={2} value={f.notes}
          onChange={e=>setF({...f, notes:e.target.value})}
          className={field + ' py-2'}/>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy}
        className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60">
        {busy ? '…' : t('save', lang)}
      </button>
    </form>
  );
}
