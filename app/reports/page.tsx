'use client';
import { useEffect, useMemo, useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import { FileText, FileSpreadsheet, MessageCircle, Phone, TrendingUp, MessageSquare, Lock, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import type { Customer } from '@/types';

type Row = {
  customer: Customer;
  litres: number;
  feed: number;
  advanceGiven: number;
  rate: number;
  milkAmount: number;
  balance: number;
};

export default function ReportsPage() {
  const { lang } = useLang();
  const sb = createBrowser();

  const today = new Date();
  const [mode, setMode]   = useState<'daily' | 'monthly'>('monthly');
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [date, setDate]   = useState(today.toISOString().slice(0, 10));

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows]   = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]     = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [callSession, setCallSession] = useState<'morning' | 'evening'>('morning');
  const [bulkRate, setBulkRate] = useState('');
  const [settling, setSettling] = useState<string | null>(null);
  const [exportPwd, setExportPwd] = useState('');   // Feature #43

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id); });
    sb.from('customers').select('*').order('code').then(({ data }) => setCustomers(data ?? []));
  }, []);

  const monthBounds = (y: number, m: number) => ({
    start: new Date(y, m - 1, 1).toISOString().slice(0, 10),
    end:   new Date(y, m, 0).toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    const { start, end } = mode === 'monthly' ? monthBounds(year, month) : { start: date, end: date };
    const { data: entries } = await sb.from('entries')
      .select('*').gte('entry_date', start).lte('entry_date', end);

    let rateOverrides: Record<string, number> = {};
    if (mode === 'monthly') {
      const { data: rates } = await sb.from('monthly_rates')
        .select('*').eq('year', year).eq('month', month);
      rateOverrides = Object.fromEntries((rates ?? []).map(r => [r.customer_id, Number(r.rate)]));
    }

    const grouped: Record<string, Row> = {};
    customers.forEach(c => {
      grouped[c.id] = {
        customer: c, litres: 0, feed: 0, advanceGiven: 0,
        rate: rateOverrides[c.id] ?? Number(c.default_rate),
        milkAmount: 0, balance: 0,
      };
    });
    (entries ?? []).forEach(e => {
      const r = grouped[e.customer_id]; if (!r) return;
      r.litres       += Number(e.morning_litres) + Number(e.evening_litres);
      r.feed         += Number(e.biscuit_amount) + Number(e.thivanam_amount);
      r.advanceGiven += Number(e.advance_amount);
    });
    Object.values(grouped).forEach(r => {
      r.milkAmount = r.litres * r.rate;
      r.balance = r.milkAmount - r.feed - Number(r.customer.advance_balance);
    });

    setRows(Object.values(grouped).filter(r => r.litres > 0 || r.feed > 0 || r.advanceGiven !== 0));
    setLoading(false);
  };

  useEffect(() => { if (customers.length) load(); /* eslint-disable-next-line */ }, [customers, mode, year, month, date]);

  const totals = useMemo(() => ({
    litres:     rows.reduce((s, r) => s + r.litres, 0),
    milkAmount: rows.reduce((s, r) => s + r.milkAmount, 0),
    feed:       rows.reduce((s, r) => s + r.feed, 0),
    balance:    rows.reduce((s, r) => s + r.balance, 0),
  }), [rows]);

  const updateRate = async (customerId: string, rate: number) => {
    setRows(rs => rs.map(r => r.customer.id === customerId
      ? { ...r, rate, milkAmount: r.litres * rate, balance: r.litres * rate - r.feed - Number(r.customer.advance_balance) }
      : r));
    if (mode === 'monthly') {
      await sb.from('monthly_rates').upsert(
        { customer_id: customerId, year, month, rate },
        { onConflict: 'customer_id,year,month' }
      );
    }
  };

  const applyBulkRate = async () => {
    const rate = parseFloat(bulkRate);
    if (!rate || isNaN(rate)) return;
    for (const r of rows) await updateRate(r.customer.id, rate);
    setBulkRate('');
    setMsg(lang === 'ta' ? '✅ எல்லா விலையும் மாற்றப்பட்டது' : '✅ All rates updated');
  };

  // Monthly settlement: clear advance balance for a customer
  const settle = async (customerId: string, currentBalance: number) => {
    setSettling(customerId);
    // Record settlement as negative advance entry (clears the balance)
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSettling(null); return; }
    const today2 = new Date().toISOString().slice(0, 10);
    await sb.from('entries').upsert({
      owner_id: user.id,
      customer_id: customerId,
      entry_date: today2,
      advance_amount: -currentBalance, // negate to clear
    }, { onConflict: 'customer_id,entry_date' });
    await sb.from('customers').update({ advance_balance: 0 }).eq('id', customerId);
    setSettling(null);
    setMsg(lang === 'ta' ? '✅ தீர்வு பதிவு செய்யப்பட்டது' : '✅ Settlement recorded');
    load();
  };

  const callApi = async (path: string, body: any) => {
    setMsg(null);
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    const errDetail = j.errors?.length ? ` — ${j.errors[0]}` : '';
    setMsg((j.message || (res.ok ? '✓ Done' : `✗ ${j.error || 'Failed'}`)) + errDetail);
  };

  const downloadFile = async (path: string, body: any, filename: string) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setMsg('✗ Export failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // Smart rate suggestion (Feature #47): most common rate among active customers
  const suggestedRate = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => {
      const r = Number(c.default_rate).toFixed(1);
      counts[r] = (counts[r] ?? 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? parseFloat(top[0]) : null;
  }, [customers]);

  const reportPayload = {
    mode, year, month, date,
    password: exportPwd || undefined,
    rows: rows.map(r => ({
      customer_id: r.customer.id, code: r.customer.code, name: r.customer.name,
      phone: r.customer.phone, whatsapp_enabled: r.customer.whatsapp_enabled,
      litres: r.litres, rate: r.rate, milkAmount: r.milkAmount,
      feed: r.feed, advanceBalance: Number(r.customer.advance_balance), balance: r.balance,
    })),
    totals, lang,
  };

  return (
    <section className="pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t('reports', lang)}</h1>
        <Link href="/reports/outstanding"
          className="tap px-3 rounded-full bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1">
          <TrendingUp size={13} /> {lang === 'ta' ? 'மீதம்' : 'Outstanding'}
        </Link>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-2xl shadow-card">
        {(['daily', 'monthly'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`tap rounded-xl text-sm font-semibold ${mode === m ? 'bg-gold-400 text-white' : 'text-ink/60'}`}>
            {m === 'daily' ? t('dailyReport', lang) : t('monthlyReport', lang)}
          </button>
        ))}
      </div>

      {/* Period picker */}
      {mode === 'monthly' ? (
        <div className="grid grid-cols-2 gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="tap rounded-xl border border-gold-400/30 bg-white px-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { month: 'long' })}
              </option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            className="tap rounded-xl border border-gold-400/30 bg-white px-3 tabular-nums" />
        </div>
      ) : (
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="tap w-full rounded-xl border border-gold-400/30 bg-white px-3" />
      )}

      {/* Totals */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: lang === 'ta' ? 'லிட்டர்' : 'Litres', val: totals.litres.toFixed(1) },
          { label: lang === 'ta' ? 'பால் ₹' : 'Milk ₹', val: Math.round(totals.milkAmount).toLocaleString('en-IN') },
          { label: lang === 'ta' ? 'தீவனம் ₹' : 'Feed ₹', val: Math.round(totals.feed).toLocaleString('en-IN') },
          { label: lang === 'ta' ? 'கொடுக்க ₹' : 'Payable ₹', val: Math.round(totals.balance).toLocaleString('en-IN') },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white rounded-xl p-2 shadow-card">
            <p className="text-[10px] text-ink/50">{label}</p>
            <p className="font-bold tabular-nums text-sm">{val}</p>
          </div>
        ))}
      </div>

      {/* Bulk rate update */}
      {mode === 'monthly' && (
        <div className="flex gap-2 items-center bg-white rounded-xl p-3 shadow-card">
          <span className="text-sm text-ink/60 flex-shrink-0">
            {lang === 'ta' ? 'எல்லா விலை:' : 'Bulk rate:'}
          </span>
          <input type="number" step="0.5" value={bulkRate} onChange={e => setBulkRate(e.target.value)}
            placeholder="₹/L"
            className="flex-1 rounded-lg border border-gold-400/30 bg-milk px-3 text-sm focus:outline-none tabular-nums" style={{ minHeight: 36 }} />
          <button onClick={applyBulkRate}
            className="tap px-4 rounded-lg bg-gold-400 text-white text-sm font-semibold" style={{ minHeight: 36 }}>
            {lang === 'ta' ? 'அனைத்தும்' : 'Apply all'}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => downloadFile('/api/export/excel', reportPayload,
          mode === 'monthly' ? `APS_${year}_${month}.xlsx` : `APS_${date}.xlsx`)}
          className="tap rounded-xl bg-leaf-700 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <FileSpreadsheet size={18} /> Excel
        </button>
        <button onClick={() => downloadFile('/api/export/pdf', reportPayload,
          mode === 'monthly' ? `APS_${year}_${month}.pdf` : `APS_${date}.pdf`)}
          className="tap rounded-xl bg-gold-700 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <FileText size={18} /> PDF
        </button>
        <button onClick={() => callApi('/api/whatsapp/send', reportPayload)}
          className="tap rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <MessageCircle size={18} /> WhatsApp
        </button>
        <div className="rounded-xl bg-gold-400 shadow-card overflow-hidden flex">
          <button onClick={() => callApi('/api/voice/call-all', { session: callSession, lang, owner_id: userId })}
            className="tap flex-1 text-white font-semibold flex items-center justify-center gap-2 px-2">
            <Phone size={18} /> {t('callAll', lang)}
          </button>
          <select value={callSession} onChange={e => setCallSession(e.target.value as 'morning' | 'evening')}
            className="bg-gold-500 text-white text-xs font-semibold px-2 border-l border-gold-300/40 focus:outline-none">
            <option value="morning">{t('morningSession', lang)}</option>
            <option value="evening">{t('eveningSession', lang)}</option>
          </select>
        </div>
      </div>

      {/* SMS fallback (Feature #52) */}
      <button onClick={() => callApi('/api/sms/send', reportPayload)}
        className="tap w-full rounded-xl bg-slate-600 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
        <MessageSquare size={18} /> {lang === 'ta' ? 'SMS அனுப்பு (WhatsApp இல்லாதவர்களுக்கு)' : 'Send SMS (non-WhatsApp customers)'}
      </button>

      {/* Google Sheets sync (Feature #49) */}
      {mode === 'monthly' && (
        <button onClick={() => callApi('/api/export/sheets', reportPayload)}
          className="tap w-full rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <FileSpreadsheet size={18} /> {lang === 'ta' ? 'Google Sheets-க்கு ஒத்திசை' : 'Sync to Google Sheets'}
        </button>
      )}

      {/* Export password protection (Feature #43) */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-card">
        <Lock size={16} className="text-ink/50 flex-shrink-0" />
        <input type="text" value={exportPwd} onChange={e => setExportPwd(e.target.value)}
          placeholder={lang === 'ta' ? 'PDF கடவுச்சொல் (விரும்பினால்)' : 'PDF password (optional)'}
          className="flex-1 rounded-lg border border-gold-400/30 bg-milk px-3 text-sm focus:outline-none" style={{ minHeight: 36 }} />
      </div>

      {/* Smart rate suggestion (Feature #47) */}
      {mode === 'monthly' && suggestedRate && (
        <div className="flex items-center justify-between bg-gold-50 rounded-xl p-3 text-sm">
          <span className="flex items-center gap-1 text-gold-700">
            <Lightbulb size={15} /> {lang === 'ta' ? 'பரிந்துரைக்கப்பட்ட விலை' : 'Suggested rate'}: <b>₹{suggestedRate}/L</b>
          </span>
          <button onClick={() => { setBulkRate(String(suggestedRate)); }}
            className="text-xs text-gold-700 underline font-semibold">
            {lang === 'ta' ? 'பயன்படுத்து' : 'Use'}
          </button>
        </div>
      )}

      {msg && <p className="text-sm text-center text-ink/70 bg-white rounded-xl p-3 shadow-card">{msg}</p>}

      {/* Rows table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-12 text-[11px] font-semibold text-ink/60 px-3 py-2 bg-cream">
          <span className="col-span-1">#</span>
          <span className="col-span-3">{t('name', lang)}</span>
          <span className="col-span-2 text-right">{lang === 'ta' ? 'லிட்' : 'L'}</span>
          <span className="col-span-2 text-right">{lang === 'ta' ? 'விலை' : 'Rate'}</span>
          <span className="col-span-2 text-right">₹</span>
          <span className="col-span-2 text-right">{lang === 'ta' ? 'தீர்வு' : 'Settle'}</span>
        </div>
        {loading && <div className="p-6 text-center text-ink/50">…</div>}
        {!loading && rows.length === 0 && (
          <div className="p-6 text-center text-ink/50">{lang === 'ta' ? 'தரவு இல்லை' : 'No data'}</div>
        )}
        {rows.map(r => (
          <div key={r.customer.id} className="grid grid-cols-12 items-center px-3 py-2 border-t border-cream text-sm">
            <span className="col-span-1 tabular-nums text-ink/60">{r.customer.code}</span>
            <span className="col-span-3 truncate">{r.customer.name}</span>
            <span className="col-span-2 text-right tabular-nums">{r.litres.toFixed(1)}</span>
            <span className="col-span-2 text-right">
              {mode === 'monthly' ? (
                <input type="number" step="0.5" value={r.rate}
                  onChange={e => updateRate(r.customer.id, Number(e.target.value))}
                  className="w-full text-right rounded border border-gold-400/30 bg-milk px-1 tabular-nums text-xs" />
              ) : <span className="tabular-nums">{r.rate.toFixed(1)}</span>}
            </span>
            <span className={`col-span-2 text-right tabular-nums font-semibold text-xs ${r.balance < 0 ? 'text-leaf-700' : ''}`}>
              {Math.round(r.balance).toLocaleString('en-IN')}
            </span>
            <span className="col-span-2 text-right">
              {Number(r.customer.advance_balance) > 0 && (
                <button
                  onClick={() => settle(r.customer.id, Number(r.customer.advance_balance))}
                  disabled={settling === r.customer.id}
                  className="text-[10px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold disabled:opacity-50">
                  {settling === r.customer.id ? '…' : (lang === 'ta' ? 'தீர்' : 'Clear')}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
