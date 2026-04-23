'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Droplets, IndianRupee, Cookie, Wheat, Check } from 'lucide-react';
import type { Customer } from '@/types';

type Tab = 'milk' | 'advance' | 'biscuit' | 'thivanam';

export default function AddEntryPage() {
  const { lang } = useLang();
  const router = useRouter();
  const sb = createBrowser();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [tab, setTab] = useState<Tab>('milk');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string|null>(null);
  const [ok,   setOk]   = useState(false);

  // Form fields — one shared entry per (customer, date)
  const [f, setF] = useState({
    morning_litres: '', evening_litres: '',
    advance_amount: '',
    biscuit_qty: '', biscuit_amount: '',
    thivanam_qty: '', thivanam_amount: '',
  });

  // Load customers
  useEffect(() => {
    sb.from('customers').select('*').order('code').then(({ data }) => {
      setCustomers(data ?? []);
      if (data?.length && !customerId) setCustomerId(data[0].id);
    });
  }, []);

  // When (customer, date) changes, load any existing entry for that pair
  useEffect(() => {
    if (!customerId) return;
    sb.from('entries').select('*')
      .eq('customer_id', customerId).eq('entry_date', date).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setF({
            morning_litres: String(data.morning_litres ?? ''),
            evening_litres: String(data.evening_litres ?? ''),
            advance_amount: String(data.advance_amount ?? ''),
            biscuit_qty: String(data.biscuit_qty ?? ''),
            biscuit_amount: String(data.biscuit_amount ?? ''),
            thivanam_qty: String(data.thivanam_qty ?? ''),
            thivanam_amount: String(data.thivanam_amount ?? ''),
          });
        } else {
          setF({
            morning_litres: '', evening_litres: '', advance_amount: '',
            biscuit_qty: '', biscuit_amount: '', thivanam_qty: '', thivanam_amount: '',
          });
        }
      });
  }, [customerId, date]);

  const save = async () => {
    if (!customerId) return;
    setBusy(true); setErr(null); setOk(false);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return; }

    const payload = {
      owner_id: user.id, customer_id: customerId, entry_date: date,
      morning_litres: Number(f.morning_litres) || 0,
      evening_litres: Number(f.evening_litres) || 0,
      advance_amount: Number(f.advance_amount) || 0,
      biscuit_qty:    Number(f.biscuit_qty) || 0,
      biscuit_amount: Number(f.biscuit_amount) || 0,
      thivanam_qty:   Number(f.thivanam_qty) || 0,
      thivanam_amount:Number(f.thivanam_amount) || 0,
    };

    // upsert on (customer_id, entry_date)
    const { error } = await sb.from('entries')
      .upsert(payload, { onConflict: 'customer_id,entry_date' });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
    router.refresh();
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'milk',     icon: Droplets,    label: lang==='ta' ? 'பால்' : 'Milk' },
    { id: 'advance',  icon: IndianRupee, label: t('advance', lang) },
    { id: 'biscuit',  icon: Cookie,      label: t('biscuit', lang) },
    { id: 'thivanam', icon: Wheat,       label: t('thivanam', lang) },
  ];
  const field = 'tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none text-lg tabular-nums';

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">{t('addEntry', lang)}</h1>

      {/* Customer + Date */}
      <div className="grid grid-cols-5 gap-2">
        <select value={customerId} onChange={e=>setCustomerId(e.target.value)}
          className={field + ' col-span-3 text-base'}>
          {customers.map(c => (
            <option key={c.id} value={c.id}>#{c.code} — {c.name}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className={field + ' col-span-2 text-base'} />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 shadow-card">
        {tabs.map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              className={`tap flex flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium transition
                ${active ? 'bg-gold-400 text-white shadow-card' : 'text-ink/60'}`}>
              <Icon size={18}/>{label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
        {tab === 'milk' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('morning', lang)} ({t('litres', lang)})</label>
            <input type="number" step="0.001" inputMode="decimal"
              value={f.morning_litres} onChange={e=>setF({...f, morning_litres:e.target.value})}
              className={field}/>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('evening', lang)} ({t('litres', lang)})</label>
            <input type="number" step="0.001" inputMode="decimal"
              value={f.evening_litres} onChange={e=>setF({...f, evening_litres:e.target.value})}
              className={field}/>
          </div>
          <p className="text-sm text-ink/60">
            {t('litres', lang)}: <b className="tabular-nums">
            {((Number(f.morning_litres)||0)+(Number(f.evening_litres)||0)).toFixed(3)}</b>
          </p>
        </>)}

        {tab === 'advance' && (
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t('advance', lang)} (₹) —
              <span className="text-xs text-ink/50"> + given / − repaid</span>
            </label>
            <input type="number" step="1" inputMode="decimal"
              value={f.advance_amount} onChange={e=>setF({...f, advance_amount:e.target.value})}
              className={field}/>
          </div>
        )}

        {tab === 'biscuit' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('qty', lang)}</label>
            <input type="number" min="0" inputMode="numeric"
              value={f.biscuit_qty} onChange={e=>setF({...f, biscuit_qty:e.target.value})}
              className={field}/>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('amount', lang)} (₹)</label>
            <input type="number" step="1" inputMode="decimal"
              value={f.biscuit_amount} onChange={e=>setF({...f, biscuit_amount:e.target.value})}
              className={field}/>
          </div>
          <p className="text-xs text-ink/50">
            {lang==='ta' ? 'சேமிக்கும் போது கையிருப்பு தானாக குறையும்' : 'Stock auto-deducts on save'}
          </p>
        </>)}

        {tab === 'thivanam' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('qty', lang)} ({lang==='ta'?'மூட்டை':'bags'})</label>
            <input type="number" min="0" inputMode="numeric"
              value={f.thivanam_qty} onChange={e=>setF({...f, thivanam_qty:e.target.value})}
              className={field}/>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('amount', lang)} (₹)</label>
            <input type="number" step="1" inputMode="decimal"
              value={f.thivanam_amount} onChange={e=>setF({...f, thivanam_amount:e.target.value})}
              className={field}/>
          </div>
          <p className="text-xs text-ink/50">
            {lang==='ta' ? 'சேமிக்கும் போது கையிருப்பு தானாக குறையும்' : 'Stock auto-deducts on save'}
          </p>
        </>)}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={save} disabled={busy || !customerId}
        className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60 flex items-center justify-center gap-2">
        {ok ? <><Check size={18}/> {lang==='ta'?'சேமிக்கப்பட்டது':'Saved'}</> : busy ? '…' : t('save', lang)}
      </button>
    </section>
  );
}
