'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import type { Lang } from '@/lib/i18n';
import { Printer, ArrowLeft } from 'lucide-react';

// Bilingual monthly milk report for ALL customers (one page summary).

const MONTHS: Record<Lang, string[]> = {
  ta: ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};

const L = {
  subtitle:  { ta: 'மாதாந்திர பால் அறிக்கை — அனைத்து வாடிக்கையாளர்கள்', en: 'Monthly Milk Report — All Customers' },
  month:     { ta: 'மாதம்', en: 'Month' },
  sno:       { ta: 'வ.எண்', en: 'S.No' },
  code:      { ta: 'குறியீடு', en: 'Code' },
  name:      { ta: 'பெயர்', en: 'Name' },
  litres:    { ta: 'லிட்டர்', en: 'Litres' },
  rate:      { ta: 'விலை', en: 'Rate' },
  milk:      { ta: 'பால் ₹', en: 'Milk ₹' },
  feed:      { ta: 'தீவனம் ₹', en: 'Feed ₹' },
  advance:   { ta: 'முன்பணம் ₹', en: 'Advance ₹' },
  payable:   { ta: 'செலுத்த ₹', en: 'Payable ₹' },
  total:     { ta: 'மொத்தம்', en: 'TOTAL' },
  custCount: { ta: 'வாடிக்கையாளர்கள்', en: 'Customers' },
  totLitres: { ta: 'மொத்த பால்', en: 'Total Milk' },
  totSale:   { ta: 'மொத்த விற்பனை', en: 'Total Sale' },
  totPay:    { ta: 'மொத்த செலுத்த', en: 'Total Payable' },
  page:      { ta: 'பக்கம்', en: 'Page' },
  print:     { ta: 'PDF சேமி / அச்சிடு', en: 'Save PDF / Print' },
  back:      { ta: 'பின்', en: 'Back' },
  loading:   { ta: 'ஏற்றுகிறது…', en: 'Loading…' },
};

const rs = (n: number) => Math.round(n).toLocaleString('en-IN');

function ReportInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { lang: appLang } = useLang();
  const sb = createBrowser();

  const lang = (search.get('lang') as Lang) || appLang;
  const now = new Date();
  const year = Number(search.get('year')) || now.getFullYear();
  const month = Number(search.get('month')) || now.getMonth() + 1;

  const [customers, setCustomers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({ en: 'APS Milk Center, Mungilaru', ta: 'APS பால்பண்ணை, மூங்கிலாறு' });

  useEffect(() => {
    (async () => {
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      const [{ data: cs }, { data: es }, { data: { user } }] = await Promise.all([
        sb.from('customers').select('*').order('code'),
        sb.from('entries').select('*').gte('entry_date', start).lte('entry_date', end),
        sb.auth.getUser(),
      ]);
      if (user) {
        const { data: s } = await sb.from('user_settings').select('shop_name, shop_name_ta').eq('owner_id', user.id).maybeSingle();
        if (s) setShop({ en: s.shop_name || shop.en, ta: s.shop_name_ta || shop.ta });
      }
      setCustomers(cs ?? []);
      setEntries(es ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const rows = useMemo(() => {
    return customers.map(c => {
      const ce = entries.filter(e => e.customer_id === c.id);
      const litres = ce.reduce((s, e) => s + Number(e.morning_litres || 0) + Number(e.evening_litres || 0), 0);
      const feed = ce.reduce((s, e) => s + Number(e.biscuit_amount || 0) + Number(e.thivanam_amount || 0), 0);
      const advance = ce.reduce((s, e) => s + Number(e.advance_amount || 0), 0);
      const rate = Number(c.default_rate || 0);
      const milk = litres * rate;
      const payable = milk - feed - advance;
      return { c, litres, rate, milk, feed, advance, payable };
    }).filter(r => r.litres > 0 || r.feed > 0 || r.advance > 0);
  }, [customers, entries]);

  const totals = useMemo(() => ({
    litres: rows.reduce((s, r) => s + r.litres, 0),
    milk: rows.reduce((s, r) => s + r.milk, 0),
    feed: rows.reduce((s, r) => s + r.feed, 0),
    advance: rows.reduce((s, r) => s + r.advance, 0),
    payable: rows.reduce((s, r) => s + r.payable, 0),
  }), [rows]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{L.loading[lang]}</div>;

  const monthName = MONTHS[lang][month - 1];
  const shopName = lang === 'ta' ? shop.ta : shop.en;

  return (
    <div style={{ background: '#eef1f5', minHeight: '100vh', paddingBottom: 40 }}>
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff',
        borderBottom: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={btnGhost}><ArrowLeft size={16} /> {L.back[lang]}</button>
        <button onClick={() => window.print()} style={btnPrimary}><Printer size={16} /> {L.print[lang]}</button>
      </div>

      <div id="sheet" style={{ width: '210mm', maxWidth: '100%', margin: '14px auto', background: '#fff',
        boxShadow: '0 2px 14px #00000018', overflow: 'hidden', borderRadius: 4 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#16293f)', color: '#fff', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid #E8B24A',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#E8B24A', lineHeight: 1 }}>APS</span>
              <span style={{ fontSize: 7, color: '#E8B24A', letterSpacing: 1 }}>DAIRY</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 19 }}>{shopName}</div>
              <div style={{ fontSize: 12, color: '#cdd8e6' }}>{L.subtitle[lang]}</div>
            </div>
          </div>
          <div style={{ background: '#E8B24A', color: '#16293f', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 600 }}>{L.month[lang]}</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{monthName} {year}</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                {[L.sno, L.code, L.name, L.litres, L.rate, L.milk, L.feed, L.advance, L.payable].map((h, i) => (
                  <th key={i} style={{ ...thM, textAlign: i < 3 ? 'left' : 'right' }}>{h[lang]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.c.id} style={{ background: i % 2 ? '#f6f9fc' : '#fff' }}>
                  <td style={tdM}>{i + 1}</td>
                  <td style={tdM}>{r.c.code}</td>
                  <td style={tdM}>{r.c.name}</td>
                  <td style={tdMNum}>{r.litres.toFixed(3)}</td>
                  <td style={tdMNum}>{r.rate.toFixed(1)}</td>
                  <td style={tdMNum}>{rs(r.milk)}</td>
                  <td style={tdMNum}>{rs(r.feed)}</td>
                  <td style={tdMNum}>{rs(r.advance)}</td>
                  <td style={{ ...tdMNum, fontWeight: 700, color: '#15803d' }}>{rs(r.payable)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#fff8e1', fontWeight: 700 }}>
                <td style={tdM} colSpan={3}>{L.total[lang]}</td>
                <td style={tdMNum}>{totals.litres.toFixed(3)}</td>
                <td style={tdMNum}></td>
                <td style={tdMNum}>{rs(totals.milk)}</td>
                <td style={tdMNum}>{rs(totals.feed)}</td>
                <td style={tdMNum}>{rs(totals.advance)}</td>
                <td style={tdMNum}>{rs(totals.payable)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {[
              { l: L.custCount[lang], v: String(rows.length), c: '#2563eb' },
              { l: L.totLitres[lang], v: `${totals.litres.toFixed(1)} L`, c: '#16a34a' },
              { l: L.totSale[lang], v: `₹ ${rs(totals.milk)}`, c: '#B8862B' },
              { l: L.totPay[lang], v: `₹ ${rs(totals.payable)}`, c: '#15803d' },
            ].map((it, i) => (
              <div key={i} style={{ flex: 1, background: '#fff', border: '1px solid #e7ecf2', borderLeft: `4px solid ${it.c}`,
                borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#5b6776', marginBottom: 4 }}>{it.l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: it.c }}>{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1e3a5f', color: '#9fb2c9', fontSize: 10, padding: '8px 20px',
          display: 'flex', justifyContent: 'space-between' }}>
          <span>{shopName} • {L.subtitle[lang]} • {monthName} {year}</span>
          <span>{L.page[lang]} 1 / 1</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          #sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
          @page { size: A4; margin: 8mm; }
        }
      `}</style>
    </div>
  );
}

const thM: React.CSSProperties = { padding: '8px 6px', fontWeight: 600, fontSize: 11 };
const tdM: React.CSSProperties = { padding: '6px', textAlign: 'left', borderBottom: '1px solid #eef2f6' };
const tdMNum: React.CSSProperties = { padding: '6px', textAlign: 'right', borderBottom: '1px solid #eef2f6', fontVariantNumeric: 'tabular-nums' };
const btnPrimary: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: '#1e3a5f',
  color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 };
const btnGhost: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9',
  color: '#334155', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 };

export default function MonthlyReportPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>…</div>}>
      <ReportInner />
    </Suspense>
  );
}
