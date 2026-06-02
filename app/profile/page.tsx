'use client';
import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Check, Clock, Shield } from 'lucide-react';

type ActivityLog = { id: string; action: string; ip_address: string; created_at: string };

export default function ProfilePage() {
  const { lang } = useLang();
  const sb = createBrowser();

  const [f, setF] = useState({ shop_name: '', shop_name_ta: '', admin_email: '', default_milk_rate: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? '');
      sb.from('user_settings').select('*').eq('owner_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) setF({
            shop_name:        data.shop_name ?? '',
            shop_name_ta:     data.shop_name_ta ?? '',
            admin_email:      data.admin_email ?? '',
            default_milk_rate:String(data.default_milk_rate ?? ''),
          });
        });
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await sb.from('user_settings').upsert({
      owner_id: userId,
      shop_name: f.shop_name || null,
      shop_name_ta: f.shop_name_ta || null,
      admin_email: f.admin_email || null,
      default_milk_rate: f.default_milk_rate ? Number(f.default_milk_rate) : null,
    }, { onConflict: 'owner_id' });
    setBusy(false);
    setMsg(error ? error.message : t('profileSaved', lang));
  };

  const loadLogs = async () => {
    const res = await fetch('/api/log/activity');
    const j = await res.json();
    setLogs(j.logs ?? []);
    setShowLogs(true);
  };

  const field = 'tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none';

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">{t('profile', lang)}</h1>

      {userEmail && (
        <div className="bg-gold-50 rounded-2xl p-3 text-sm text-gold-700 flex items-center gap-2">
          <Shield size={16} /> {userEmail}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">{t('shopName', lang)}</label>
          <input value={f.shop_name} onChange={e => setF({ ...f, shop_name: e.target.value })} className={field} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t('shopNameTa', lang)}</label>
          <input value={f.shop_name_ta} onChange={e => setF({ ...f, shop_name_ta: e.target.value })} className={field} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t('adminEmail', lang)}</label>
          <input type="email" value={f.admin_email} onChange={e => setF({ ...f, admin_email: e.target.value })} className={field} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t('defaultRate', lang)}</label>
          <input type="number" step="0.5" value={f.default_milk_rate}
            onChange={e => setF({ ...f, default_milk_rate: e.target.value })} className={field} />
        </div>

        {msg && (
          <p className={`text-sm flex items-center gap-1 ${msg === t('profileSaved', lang) ? 'text-leaf-700' : 'text-red-600'}`}>
            {msg === t('profileSaved', lang) && <Check size={14} />} {msg}
          </p>
        )}

        <button disabled={busy}
          className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60">
          {busy ? '…' : t('save', lang)}
        </button>
      </form>

      <div className="bg-white rounded-2xl p-4 shadow-card">
        <button onClick={loadLogs}
          className="tap w-full flex items-center justify-between text-sm font-semibold text-ink/70">
          <span className="flex items-center gap-2">
            <Clock size={16} /> {lang === 'ta' ? 'உள்நுழைவு வரலாறு' : 'Login activity'}
          </span>
          <span className="text-gold-600">{showLogs ? '▲' : '▼'}</span>
        </button>
        {showLogs && (
          <div className="mt-3 space-y-2">
            {logs.length === 0 && <p className="text-xs text-ink/50 text-center">No logs yet</p>}
            {logs.map(l => (
              <div key={l.id} className="text-xs text-ink/60 flex justify-between">
                <span>{l.action} · {l.ip_address}</span>
                <span>{new Date(l.created_at).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
