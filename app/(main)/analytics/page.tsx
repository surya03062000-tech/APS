'use client';
import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import BarChart from '@/components/BarChart';
import { Sparkles, Loader2, TrendingUp, Award, Calendar } from 'lucide-react';
import type { Customer, Entry } from '@/types';

export default function AnalyticsPage() {
  const { lang } = useLang();
  const sb = createBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const [{ data: cust }, { data: ent }] = await Promise.all([
        sb.from('customers').select('*').order('code'),
        sb.from('entries').select('*').gte('entry_date', since),
      ]);
      setCustomers(cust ?? []);
      setEntries(ent ?? []);
      setLoading(false);
    })();
  }, []);

  const litresOf = (e: Entry) => Number(e.morning_litres) + Number(e.evening_litres);

  // ── Monthly comparison (Feature #31) ──
  const monthTotals: Record<string, number> = {};
  entries.forEach(e => {
    const key = e.entry_date.slice(0, 7); // yyyy-mm
    monthTotals[key] = (monthTotals[key] ?? 0) + litresOf(e);
  });
  const monthData = Object.entries(monthTotals).sort().slice(-3).map(([k, v]) => ({
    label: new Date(k + '-01').toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { month: 'short' }),
    value: v,
  }));

  // ── Daily trend last 14 days (Feature #34) ──
  const dayTotals: Record<string, number> = {};
  entries.forEach(e => { dayTotals[e.entry_date] = (dayTotals[e.entry_date] ?? 0) + litresOf(e); });
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { label: d.slice(8), value: dayTotals[d] ?? 0 };
  });

  // ── Top customers (Feature #32) ──
  const custLitres: Record<string, number> = {};
  entries.forEach(e => { custLitres[e.customer_id] = (custLitres[e.customer_id] ?? 0) + litresOf(e); });
  const topCustomers = customers
    .map(c => ({ customer: c, litres: custLitres[c.id] ?? 0 }))
    .sort((a, b) => b.litres - a.litres)
    .slice(0, 5);

  // ── Daily average (Feature #33) ──
  const daysWithData = new Set(entries.map(e => e.entry_date)).size || 1;
  const totalLitres = entries.reduce((s, e) => s + litresOf(e), 0);
  const dailyAvg = totalLitres / daysWithData;

  // ── AI summary (Feature #45) ──
  const genAiSummary = async () => {
    setAiLoading(true); setAiSummary('');
    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang }),
    });
    const j = await res.json();
    setAiSummary(j.summary || j.error || 'No summary');
    setAiLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-ink/50">…</div>;

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">
        {lang === 'ta' ? 'பகுப்பாய்வு' : 'Analytics'}
      </h1>

      {/* AI Summary */}
      <div className="bg-gradient-to-br from-gold-50 to-leaf-50 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-sm flex items-center gap-1">
            <Sparkles size={16} className="text-gold-600" /> {lang === 'ta' ? 'AI சுருக்கம்' : 'AI Summary'}
          </h2>
          <button onClick={genAiSummary} disabled={aiLoading}
            className="tap px-3 rounded-full bg-gold-400 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {lang === 'ta' ? 'உருவாக்கு' : 'Generate'}
          </button>
        </div>
        {aiSummary
          ? <p className="text-sm text-ink/80 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
          : <p className="text-xs text-ink/40">{lang === 'ta' ? 'பொத்தானை அழுத்தி AI சுருக்கம் பெறுங்கள்' : 'Tap Generate for an AI-written summary of this month.'}</p>}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <Calendar size={18} className="text-gold-600 mb-1" />
          <p className="text-xs text-ink/50">{lang === 'ta' ? 'தினசரி சராசரி' : 'Daily average'}</p>
          <p className="font-bold text-lg tabular-nums">{dailyAvg.toFixed(1)} <span className="text-xs">L</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <TrendingUp size={18} className="text-leaf-700 mb-1" />
          <p className="text-xs text-ink/50">{lang === 'ta' ? '90 நாள் மொத்தம்' : '90-day total'}</p>
          <p className="font-bold text-lg tabular-nums">{totalLitres.toFixed(0)} <span className="text-xs">L</span></p>
        </div>
      </div>

      {/* Monthly comparison */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <h2 className="font-display font-bold text-sm mb-2">
          {lang === 'ta' ? 'மாதாந்திர ஒப்பீடு' : 'Monthly comparison'}
        </h2>
        <BarChart data={monthData} unit="Litres / month" color="#5a8a3c" />
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <h2 className="font-display font-bold text-sm mb-2">
          {lang === 'ta' ? 'கடந்த 14 நாள் போக்கு' : 'Last 14 days trend'}
        </h2>
        <BarChart data={last14} unit="Litres / day" />
      </div>

      {/* Top customers */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-1">
          <Award size={16} className="text-gold-600" /> {lang === 'ta' ? 'சிறந்த 5 வாடிக்கையாளர்கள்' : 'Top 5 customers'}
        </h2>
        <div className="space-y-2">
          {topCustomers.map((tc, i) => (
            <div key={tc.customer.id} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold
                ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gold-50 text-gold-700'}`}>
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-medium">{tc.customer.name}</span>
              <span className="text-sm font-bold tabular-nums">{tc.litres.toFixed(1)} L</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
