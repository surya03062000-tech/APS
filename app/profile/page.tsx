'use client';
import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Check, User } from 'lucide-react';

export default function ProfilePage() {
  const { lang } = useLang();
  const sb = createBrowser();

  const [email, setEmail] = useState('');
  const [f, setF] = useState({
    shop_name: 'APS MILK CENTER',
    shop_name_ta: 'APS பால்பண்ணை',
    admin_email: '',
    default_milk_rate: '60',
  });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');

      const { data } = await sb.from('user_settings').select('*').eq('owner_id', user.id).maybeSingle();
      if (data) {
        setF({
          shop_name: data.shop_name ?? 'APS MILK CENTER',
          shop_name_ta: data.shop_name_ta ?? 'APS பால்பண்ணை',
          admin_email: data.admin_email ?? '',
          default_milk_rate: String(data.default_milk_rate ?? '60'),
        });
      }
    })();
  }, []);

  const save = async () => {
    setBusy(true); setErr(null); setOk(false);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return; }

    const { error } = await sb.from('user_settings').upsert({
      owner_id: user.id,
      shop_name: f.shop_name,
      shop_name_ta: f.shop_name_ta,
      admin_email: f.admin_email || null,
      default_milk_rate: Number(f.default_milk_rate) || 60,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' });

    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };

  const field = 'tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none';

  // Initials avatar from email
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">{t('profile', lang)}</h1>

      {/* Avatar + email */}
      <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-4">
        <span className="w-14 h-14 rounded-full bg-gold-400 text-white font-bold text-xl grid place-items-center flex-shrink-0">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-ink/50">{lang === 'ta' ? 'மின்னஞ்சல்' : 'Email'}</p>
          <p className="font-semibold truncate text-sm">{email}</p>
        </div>
      </div>

      {/* Settings form */}
      <div className="bg-white rounded-2xl p-4 shadow-card space-y-4">
        <h2 className="font-semibold text-sm text-ink/70">{lang === 'ta' ? 'கடை விவரங்கள்' : 'Shop details'}</h2>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('shopName', lang)}</label>
          <input value={f.shop_name} onChange={e => setF({ ...f, shop_name: e.target.value })}
            className={field} placeholder="APS MILK CENTER" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('shopNameTa', lang)}</label>
          <input value={f.shop_name_ta} onChange={e => setF({ ...f, shop_name_ta: e.target.value })}
            className={field} placeholder="APS பால்பண்ணை" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('adminEmail', lang)}</label>
          <input type="email" value={f.admin_email} onChange={e => setF({ ...f, admin_email: e.target.value })}
            className={field} placeholder="admin@example.com" />
          <p className="text-xs text-ink/40 mt-1">
            {lang === 'ta' ? 'மாதாந்திர அறிக்கை இந்த மின்னஞ்சலுக்கு அனுப்பப்படும்' : 'Monthly reports will be sent to this email'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t('defaultRate', lang)}</label>
          <input type="number" step="0.5" value={f.default_milk_rate}
            onChange={e => setF({ ...f, default_milk_rate: e.target.value })}
            className={field} />
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={save} disabled={busy}
        className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60 flex items-center justify-center gap-2">
        {ok ? <><Check size={18} /> {t('profileSaved', lang)}</> : busy ? '…' : t('save', lang)}
      </button>
    </section>
  );
}
