'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function EditCustomerPage() {
  const { lang } = useLang();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sb = createBrowser();

  const [f, setF] = useState({
    code: '', name: '', phone: '', whatsapp_enabled: false, notes: '', default_rate: '60',
  });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from('customers').select('*').eq('id', params.id).single().then(({ data }) => {
      if (data) setF({
        code: String(data.code), name: data.name, phone: data.phone ?? '',
        whatsapp_enabled: data.whatsapp_enabled ?? false, notes: data.notes ?? '',
        default_rate: String(data.default_rate ?? 60),
      });
      setLoading(false);
    });
  }, [params.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await sb.from('customers').update({
      code: Number(f.code), name: f.name, phone: f.phone || null,
      whatsapp_enabled: f.whatsapp_enabled, notes: f.notes || null,
      default_rate: Number(f.default_rate),
    }).eq('id', params.id);
    setBusy(false);
    if (error) return setErr(error.message);
    router.push(`/customers/${params.id}`);
    router.refresh();
  };

  const onDelete = async () => {
    setDeleting(true);
    await sb.from('entries').delete().eq('customer_id', params.id);
    await sb.from('customers').delete().eq('id', params.id);
    router.replace('/customers');
    router.refresh();
  };

  const field = 'tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none';
  if (loading) return <div className="p-6 text-center text-ink/50">…</div>;

  return (
    <form onSubmit={onSubmit} className="pt-3 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <Link href={`/customers/${params.id}`} className="tap inline-flex items-center gap-1 text-ink/60">
          <ArrowLeft size={18} /> {t('cancel', lang)}
        </Link>
        <button type="button" onClick={() => setConfirmDel(true)}
          className="tap flex items-center gap-1 px-3 rounded-full bg-red-50 text-red-600 text-sm font-semibold">
          <Trash2 size={14} /> {t('delete', lang)}
        </button>
      </div>
      <h1 className="font-display text-xl font-bold">{t('edit', lang)}</h1>

      <div>
        <label className="text-sm font-medium mb-1 block">{t('code', lang)}</label>
        <input type="number" required value={f.code} onChange={e => setF({ ...f, code: e.target.value })} className={field} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('name', lang)}</label>
        <input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={field} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('phone', lang)}</label>
        <input type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className={field} />
      </div>
      <label className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gold-400/30">
        <input type="checkbox" checked={f.whatsapp_enabled}
          onChange={e => setF({ ...f, whatsapp_enabled: e.target.checked })}
          className="w-5 h-5 accent-gold-400" />
        <span className="text-sm">{t('whatsapp', lang)}?</span>
      </label>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('rate', lang)}</label>
        <input type="number" step="0.1" value={f.default_rate}
          onChange={e => setF({ ...f, default_rate: e.target.value })} className={field} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">{t('notes', lang)}</label>
        <textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })}
          className={field + ' py-2'} />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy}
        className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60">
        {busy ? '…' : t('save', lang)}
      </button>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h2 className="font-display text-lg font-bold text-red-600">
              {lang === 'ta' ? 'நிச்சயமாக நீக்கவா?' : 'Delete customer?'}
            </h2>
            <p className="text-sm text-ink/70">
              {lang === 'ta'
                ? 'இந்த வாடிக்கையாளரின் எல்லா பதிவுகளும் நிரந்தரமாக நீக்கப்படும்.'
                : 'All entries for this customer will be permanently deleted.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmDel(false)}
                className="tap rounded-xl border border-gold-400/30 font-semibold">
                {t('cancel', lang)}
              </button>
              <button type="button" onClick={onDelete} disabled={deleting}
                className="tap rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60">
                {deleting ? '…' : t('delete', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
