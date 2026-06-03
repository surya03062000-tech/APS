'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang, useToast } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Droplets, IndianRupee, Cookie, Wheat, Check, Camera, X, AlertTriangle } from 'lucide-react';
import SmartVoiceEntry, { type ParsedCommand } from '@/components/SmartVoiceEntry';
import VoiceMicButton from '@/components/VoiceMicButton';
import type { Customer } from '@/types';

type Tab = 'milk' | 'advance' | 'biscuit' | 'thivanam';

function AddEntryInner() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const sb = createBrowser();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab]     = useState<Tab>('milk');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const [ok, setOk]       = useState(false);
  const [voiceBanner, setVoiceBanner] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);   // Feature #48 duplicate warning

  const [f, setF] = useState({
    morning_litres: '', evening_litres: '', advance_amount: '',
    biscuit_qty: '', biscuit_amount: '', thivanam_qty: '', thivanam_amount: '',
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    sb.from('customers').select('*').order('code').then(({ data }) => {
      setCustomers(data ?? []);
      if (data?.length && !customerId) setCustomerId(data[0].id);
    });
  }, []);

  // Home-screen shortcut: ?session=evening switches focus (Feature #36)
  useEffect(() => {
    if (searchParams.get('session')) setTab('milk');
  }, [searchParams]);

  useEffect(() => {
    if (!customerId) return;
    sb.from('entries').select('*').eq('customer_id', customerId).eq('entry_date', date).maybeSingle()
      .then(({ data }) => {
        setHasExisting(!!data);
        setF(data ? {
          morning_litres: String(data.morning_litres ?? ''),
          evening_litres: String(data.evening_litres ?? ''),
          advance_amount: String(data.advance_amount ?? ''),
          biscuit_qty:    String(data.biscuit_qty ?? ''),
          biscuit_amount: String(data.biscuit_amount ?? ''),
          thivanam_qty:   String(data.thivanam_qty ?? ''),
          thivanam_amount:String(data.thivanam_amount ?? ''),
        } : {
          morning_litres: '', evening_litres: '', advance_amount: '',
          biscuit_qty: '', biscuit_amount: '', thivanam_qty: '', thivanam_amount: '',
        });
      });
  }, [customerId, date]);

  const save = useCallback(async (overrideCid?: string, overrideF?: typeof f) => {
    const cid = overrideCid ?? customerId;
    const fields = overrideF ?? f;
    if (!cid) return;
    setBusy(true); setErr(null); setOk(false);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return; }

    const payload = {
      owner_id: user.id, customer_id: cid, entry_date: date,
      morning_litres:  Number(fields.morning_litres)  || 0,
      evening_litres:  Number(fields.evening_litres)  || 0,
      advance_amount:  Number(fields.advance_amount)  || 0,
      biscuit_qty:     Number(fields.biscuit_qty)     || 0,
      biscuit_amount:  Number(fields.biscuit_amount)  || 0,
      thivanam_qty:    Number(fields.thivanam_qty)    || 0,
      thivanam_amount: Number(fields.thivanam_amount) || 0,
    };

    const { data: entry, error } = await sb.from('entries')
      .upsert(payload, { onConflict: 'customer_id,entry_date' })
      .select().single();
    if (error) { setBusy(false); return setErr(error.message); }

    // Upload photo to Supabase Storage if present
    if (photo && entry) {
      const ext = photo.name.split('.').pop();
      await sb.storage.from('entry-photos').upload(`${entry.id}.${ext}`, photo, { upsert: true });
    }

    setBusy(false); setOk(true);
    const cust = customers.find(c => c.id === cid);
    toast.show(
      lang === 'ta' ? `${cust?.name ?? ''} சேமிக்கப்பட்டது ✅` : `${cust?.name ?? 'Entry'} saved ✅`,
      'success'
    );
    setHasExisting(true);
    setTimeout(() => setOk(false), 2000);
    router.refresh();
  }, [customerId, f, date, photo, customers, lang, toast]);

  const handleVoiceCommand = useCallback((cmd: ParsedCommand) => {
    let newCid = customerId;
    let newF = { ...f };
    const parts: string[] = [];

    if (cmd.customer) { newCid = cmd.customer.id; setCustomerId(cmd.customer.id); parts.push(cmd.customer.name); }
    if (cmd.field && cmd.value !== undefined) {
      newF = { ...newF, [cmd.field]: String(cmd.value) };
      setF(prev => ({ ...prev, [cmd.field!]: String(cmd.value) }));
      if (cmd.session === 'morning') setTab('milk');
      else if (cmd.session === 'evening') setTab('milk');
      else if (cmd.field?.startsWith('biscuit')) setTab('biscuit');
      else if (cmd.field?.startsWith('thivanam')) setTab('thivanam');
      else if (cmd.field === 'advance_amount') setTab('advance');
      const sl = cmd.session === 'morning' ? (lang === 'ta' ? 'காலை' : 'Morning') : cmd.session === 'evening' ? (lang === 'ta' ? 'மாலை' : 'Evening') : '';
      if (sl) parts.push(sl);
      parts.push(`${cmd.value} ${lang === 'ta' ? 'லிட்டர்' : 'L'}`);
    }
    setVoiceBanner(parts.join(' · '));
    setTimeout(() => setVoiceBanner(''), 3000);
    if ((cmd.customer || newCid) && cmd.field && cmd.value !== undefined) {
      setTimeout(() => save(newCid, newF), 300);
    }
  }, [customerId, f, lang, save]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const field = 'tap flex-1 rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none text-lg tabular-nums';

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'milk',     icon: Droplets,    label: lang === 'ta' ? 'பால்' : 'Milk' },
    { id: 'advance',  icon: IndianRupee, label: t('advance', lang) },
    { id: 'biscuit',  icon: Cookie,      label: t('biscuit', lang) },
    { id: 'thivanam', icon: Wheat,       label: t('thivanam', lang) },
  ];

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">{t('addEntry', lang)}</h1>

      {/* Smart voice section */}
      <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">
            🎤 {lang === 'ta' ? 'குரல் பதிவு' : 'Voice Entry'}
          </p>
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input type="checkbox" checked={continuousMode} onChange={e => setContinuousMode(e.target.checked)}
              className="accent-gold-400" />
            {lang === 'ta' ? 'தொடர் முறை' : 'Continuous'}
          </label>
        </div>
        <SmartVoiceEntry lang={lang} customers={customers} onParsed={handleVoiceCommand} continuous={continuousMode} />
        {voiceBanner && (
          <div className="text-center text-sm font-semibold bg-leaf-50 text-leaf-700 rounded-xl py-2 px-3">
            ✅ {voiceBanner}
          </div>
        )}
      </div>

      {/* Customer + Date */}
      <div className="space-y-2">
        <select value={customerId} onChange={e => setCustomerId(e.target.value)}
          className="tap w-full rounded-xl border border-gold-400/30 bg-white px-4 focus:border-gold-400 focus:outline-none text-base">
          {customers.map(c => <option key={c.id} value={c.id}>#{c.code} — {c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDate(todayStr)}
            className={`tap px-4 rounded-xl text-sm font-semibold border ${date === todayStr ? 'bg-gold-400 text-white border-gold-400' : 'bg-white border-gold-400/30 text-ink/60'}`}>
            {lang === 'ta' ? 'இன்று' : 'Today'}
          </button>
          <button type="button" onClick={() => setDate(yesterdayStr)}
            className={`tap px-4 rounded-xl text-sm font-semibold border ${date === yesterdayStr ? 'bg-gold-400 text-white border-gold-400' : 'bg-white border-gold-400/30 text-ink/60'}`}>
            {lang === 'ta' ? 'நேற்று' : 'Yesterday'}
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="tap flex-1 rounded-xl border border-gold-400/30 bg-white px-3 focus:border-gold-400 focus:outline-none text-sm" />
        </div>
      </div>

      {/* Duplicate entry warning (Feature #48) */}
      {hasExisting && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-sm">
          <AlertTriangle size={16} />
          {lang === 'ta'
            ? 'இந்த தேதிக்கு ஏற்கனவே பதிவு உள்ளது — சேமித்தால் புதுப்பிக்கப்படும்'
            : 'Entry already exists for this date — saving will update it'}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 shadow-card">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tap flex flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium transition
              ${tab === id ? 'bg-gold-400 text-white shadow-card' : 'text-ink/60'}`}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
        {tab === 'milk' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('morning', lang)} ({t('litres', lang)})</label>
            <div className="flex gap-2 items-center">
              <input type="number" step="0.001" inputMode="decimal" value={f.morning_litres}
                onChange={e => setF({ ...f, morning_litres: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, morning_litres: v }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('evening', lang)} ({t('litres', lang)})</label>
            <div className="flex gap-2 items-center">
              <input type="number" step="0.001" inputMode="decimal" value={f.evening_litres}
                onChange={e => setF({ ...f, evening_litres: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, evening_litres: v }))} />
            </div>
          </div>
          <p className="text-sm text-ink/60">
            {t('litres', lang)}: <b className="tabular-nums">
              {((Number(f.morning_litres) || 0) + (Number(f.evening_litres) || 0)).toFixed(3)}
            </b>
          </p>
        </>)}

        {tab === 'advance' && (
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t('advance', lang)} (₹) — <span className="text-xs text-ink/50">+ given / − repaid</span>
            </label>
            <div className="flex gap-2 items-center">
              <input type="number" step="1" inputMode="decimal" value={f.advance_amount}
                onChange={e => setF({ ...f, advance_amount: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, advance_amount: v }))} />
            </div>
          </div>
        )}

        {tab === 'biscuit' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('qty', lang)}</label>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" inputMode="numeric" value={f.biscuit_qty}
                onChange={e => setF({ ...f, biscuit_qty: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, biscuit_qty: v }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('amount', lang)} (₹)</label>
            <div className="flex gap-2 items-center">
              <input type="number" step="1" inputMode="decimal" value={f.biscuit_amount}
                onChange={e => setF({ ...f, biscuit_amount: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, biscuit_amount: v }))} />
            </div>
          </div>
        </>)}

        {tab === 'thivanam' && (<>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('qty', lang)} ({lang === 'ta' ? 'மூட்டை' : 'bags'})</label>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" inputMode="numeric" value={f.thivanam_qty}
                onChange={e => setF({ ...f, thivanam_qty: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, thivanam_qty: v }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('amount', lang)} (₹)</label>
            <div className="flex gap-2 items-center">
              <input type="number" step="1" inputMode="decimal" value={f.thivanam_amount}
                onChange={e => setF({ ...f, thivanam_amount: e.target.value })} className={field} />
              <VoiceMicButton lang={lang} onValue={v => setF(p => ({ ...p, thivanam_amount: v }))} />
            </div>
          </div>
        </>)}
      </div>

      {/* Photo attachment */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <Camera size={16} /> {lang === 'ta' ? 'புகைப்படம் இணை (விரும்பினால்)' : 'Attach photo (optional)'}
        </label>
        <div className="flex gap-3 items-center">
          <label className="tap px-4 rounded-xl bg-gold-50 text-gold-700 text-sm font-semibold cursor-pointer flex items-center gap-2">
            <Camera size={16} />
            {lang === 'ta' ? 'புகைப்படம்' : 'Choose photo'}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
          {photoPreview && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={() => save()} disabled={busy || !customerId}
        className="tap w-full rounded-xl bg-gold-400 text-white font-semibold shadow-card disabled:opacity-60 flex items-center justify-center gap-2">
        {ok ? <><Check size={18} /> {lang === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved'}</> :
          busy ? '…' : t('save', lang)}
      </button>
    </section>
  );
}

export default function AddEntryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink/50">…</div>}>
      <AddEntryInner />
    </Suspense>
  );
}
