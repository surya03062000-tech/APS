'use client';
import { useEffect, useMemo, useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';
import { FileText, FileSpreadsheet, MessageCircle, Phone } from 'lucide-react';
import type { Customer } from '@/types';

type Row = {
  customer: Customer;
  litres: number;
  feed: number;          // thivanam + biscuit amount
  advanceGiven: number;
  rate: number;
  milkAmount: number;
  balance: number;       // milk - feed - advanceGiven - customer.advance_balance
};

export default function ReportsPage() {
  const { lang } = useLang();
  const sb = createBrowser();

  const today = new Date();
  const [mode, setMode]   = useState<'daily'|'monthly'>('monthly');
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);   // 1-12
  const [date,  setDate]  = useState(today.toISOString().slice(0,10));

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    sb.from('customers').select('*').order('code').then(({ data }) => setCustomers(data ?? []));
  }, []);

  const monthBounds = (y:number, m:number) => ({
    start: new Date(y, m-1, 1).toISOString().slice(0,10),
    end:   new Date(y, m,   0).toISOString().slice(0,10),
  });

  const load = async () => {
    setLoading(true);
    const { start, end } = mode === 'monthly' ? monthBounds(year, month) : { start: date, end: date };
    const { data: entries } = await sb.from('entries')
      .select('*').gte('entry_date', start).lte('entry_date', end);

    // Load per-customer monthly rate overrides for this month
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
      // balance customer owes (+) or we owe customer (−)
      // Money flow: customer delivers milk → we owe milkAmount. They owe feed + current advance balance.
      // Payable to customer = milkAmount − feed − customer.advance_balance
      r.balance = r.milkAmount - r.feed - Number(r.customer.advance_balance);
    });

    setRows(Object.values(grouped).filter(r => r.litres > 0 || r.feed > 0 || r.advanceGiven !== 0));
    setLoading(false);
  };

  useEffect(() => { if (customers.length) load(); /* eslint-disable-next-line */ }, [customers, mode, year, month, date]);

  const totals = useMemo(() => ({
    litres: rows.reduce((s,r)=>s+r.litres, 0),
    milkAmount: rows.reduce((s,r)=>s+r.milkAmount, 0),
    feed: rows.reduce((s,r)=>s+r.feed, 0),
    balance: rows.reduce((s,r)=>s+r.balance, 0),
  }), [rows]);

  const updateRate = async (customerId: string, rate: number) => {
    setRows(rs => rs.map(r => r.customer.id === customerId
      ? { ...r, rate, milkAmount: r.litres * rate, balance: r.litres*rate - r.feed - Number(r.customer.advance_balance) }
      : r));
    // persist monthly override
    if (mode === 'monthly') {
      await sb.from('monthly_rates').upsert(
        { customer_id: customerId, year, month, rate },
        { onConflict: 'customer_id,year,month' }
      );
    }
  };

  const call = async (path: string, body: any) => {
    setMsg(null);
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(()=>({}));
    setMsg(j.message || (res.ok ? '✓ Done' : `✗ ${j.error || 'Failed'}`));
  };

  const downloadFile = async (path: string, body: any, filename: string) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setMsg('✗ Export failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const reportPayload = {
    mode, year, month, date,
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
      <h1 className="font-display text-xl font-bold">{t('reports', lang)}</h1>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-2xl shadow-card">
        {(['daily','monthly'] as const).map(m => (
          <button key={m} onClick={()=>setMode(m)}
            className={`tap rounded-xl text-sm font-semibold ${mode===m ? 'bg-gold-400 text-white' : 'text-ink/60'}`}>
            {m==='daily' ? t('dailyReport', lang) : t('monthlyReport', lang)}
          </button>
        ))}
      </div>

      {/* Period picker */}
      {mode === 'monthly' ? (
        <div className="grid grid-cols-2 gap-2">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            className="tap rounded-xl border border-gold-400/30 bg-white px-3">
            {Array.from({length:12}, (_,i)=>i+1).map(m=>(
              <option key={m} value={m}>{new Date(2000, m-1, 1).toLocaleString(lang==='ta'?'ta-IN':'en-IN', { month:'long' })}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))}
            className="tap rounded-xl border border-gold-400/30 bg-white px-3 tabular-nums"/>
        </div>
      ) : (
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className="tap w-full rounded-xl border border-gold-400/30 bg-white px-3"/>
      )}

      {/* Totals strip */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white rounded-xl p-2 shadow-card">
          <p className="text-[10px] text-ink/50">{lang==='ta'?'லிட்டர்':'Litres'}</p>
          <p className="font-bold tabular-nums text-sm">{totals.litres.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-card">
          <p className="text-[10px] text-ink/50">{lang==='ta'?'பால் விலை':'Milk ₹'}</p>
          <p className="font-bold tabular-nums text-sm">{Math.round(totals.milkAmount).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-card">
          <p className="text-[10px] text-ink/50">{lang==='ta'?'தீவனம் ₹':'Feed ₹'}</p>
          <p className="font-bold tabular-nums text-sm">{Math.round(totals.feed).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-card">
          <p className="text-[10px] text-ink/50">{lang==='ta'?'கொடுக்க ₹':'Payable ₹'}</p>
          <p className="font-bold tabular-nums text-sm">{Math.round(totals.balance).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={()=>downloadFile('/api/export/excel', reportPayload,
                 mode==='monthly' ? `APS_${year}_${month}.xlsx` : `APS_${date}.xlsx`)}
          className="tap rounded-xl bg-leaf-700 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <FileSpreadsheet size={18}/> Excel
        </button>
        <button onClick={()=>downloadFile('/api/export/pdf', reportPayload,
                 mode==='monthly' ? `APS_${year}_${month}.pdf` : `APS_${date}.pdf`)}
          className="tap rounded-xl bg-gold-700 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <FileText size={18}/> PDF
        </button>
        <button onClick={()=>call('/api/whatsapp/send', reportPayload)}
          className="tap rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <MessageCircle size={18}/> WhatsApp
        </button>
        <button onClick={()=>call('/api/voice/call-all', { session:'morning', lang })}
          className="tap rounded-xl bg-gold-400 text-white font-semibold flex items-center justify-center gap-2 shadow-card">
          <Phone size={18}/> {t('callAll', lang)}
        </button>
      </div>

      {msg && <p className="text-sm text-center text-ink/70">{msg}</p>}

      {/* Rows table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-12 text-[11px] font-semibold text-ink/60 px-3 py-2 bg-cream">
          <span className="col-span-1">#</span>
          <span className="col-span-4">{t('name', lang)}</span>
          <span className="col-span-2 text-right">{lang==='ta'?'லிட்':'L'}</span>
          <span className="col-span-2 text-right">{t('rate', lang)}</span>
          <span className="col-span-3 text-right">{lang==='ta'?'₹':'₹'}</span>
        </div>
        {loading && <div className="p-6 text-center text-ink/50">…</div>}
        {!loading && rows.length === 0 && (
          <div className="p-6 text-center text-ink/50">{lang==='ta'?'தரவு இல்லை':'No data'}</div>
        )}
        {rows.map(r => (
          <div key={r.customer.id} className="grid grid-cols-12 items-center px-3 py-2 border-t border-cream text-sm">
            <span className="col-span-1 tabular-nums">{r.customer.code}</span>
            <span className="col-span-4 truncate">{r.customer.name}</span>
            <span className="col-span-2 text-right tabular-nums">{r.litres.toFixed(1)}</span>
            <span className="col-span-2 text-right">
              {mode==='monthly' ? (
                <input type="number" step="0.5" value={r.rate}
                  onChange={e=>updateRate(r.customer.id, Number(e.target.value))}
                  className="w-full text-right rounded border border-gold-400/30 bg-milk px-1 tabular-nums"/>
              ) : <span className="tabular-nums">{r.rate.toFixed(1)}</span>}
            </span>
            <span className="col-span-3 text-right tabular-nums font-semibold">
              {Math.round(r.balance).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
