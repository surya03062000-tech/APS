'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import type { Lang } from '@/lib/i18n';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Bilingual monthly customer statement — rendered as HTML so Tamil glyphs
// display correctly, then saved to PDF via the browser's native print dialog.

const MONTHS: Record<Lang, string[]> = {
  ta: ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};

const L = {
  subtitle:   { ta: 'பால் வாடா சிட்டா — மாதாந்திர அறிக்கை', en: 'Milk Supply Statement — Monthly Report' },
  to:         { ta: 'முதல்', en: 'to' },
  toEnd:      { ta: 'வரை', en: '' },
  code:       { ta: 'குறியீடு', en: 'Code' },
  name:       { ta: 'பெயர்', en: 'Name' },
  month:      { ta: 'மாதம்', en: 'Month' },
  firstHalf:  { ta: 'முதல் பாதி', en: 'First Half' },
  secondHalf: { ta: 'இரண்டாம் பாதி', en: 'Second Half' },
  date:       { ta: 'தேதி', en: 'Date' },
  morning:    { ta: 'காலை', en: 'Morning' },
  evening:    { ta: 'மாலை', en: 'Evening' },
  dayTotal:   { ta: 'நாள் மொத்தம்', en: 'Day Total' },
  subtotal:   { ta: 'உப மொத்தம்', en: 'Subtotal' },
  totalMilk:  { ta: 'மொத்த பால் அளவு', en: 'Total Milk Quantity' },
  days:       { ta: 'நாட்கள்', en: 'days' },
  litreShort: { ta: 'லி.', en: 'L' },
  finance:    { ta: 'நிதி சுருக்கம்', en: 'Financial Summary' },
  saleValue:  { ta: 'மொத்த விற்பனை மதிப்பு', en: 'Total Sale Value' },
  feed:       { ta: 'தீவனம் + பிஸ்கட் மாவு', en: 'Feed + Biscuit' },
  advance:    { ta: 'முன்பணம்', en: 'Advance' },
  remaining:  { ta: 'மீதம் உள்ள தொகை', en: 'Remaining Amount' },
  netPayable: { ta: 'பட்டு வாடா தாகை (செலுத்த வேண்டிய தொகை)', en: 'Net Payable (Amount Due)' },
  supplier:   { ta: 'பால்காரர் கையொப்பம்', en: 'Supplier Signature' },
  collector:  { ta: 'சேகரிப்பாளர் கையொப்பம்', en: 'Collector Signature' },
  officer:    { ta: 'அங்கீகரிப்பு / அதிகாரி', en: 'Authorised / Officer' },
  signature:  { ta: 'கையொப்பம்', en: 'Signature' },
  page:       { ta: 'பக்கம்', en: 'Page' },
  print:      { ta: 'PDF சேமி / அச்சிடு', en: 'Save PDF / Print' },
  back:       { ta: 'பின்', en: 'Back' },
  loading:    { ta: 'ஏற்றுகிறது…', en: 'Loading…' },
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtL(n: number) { return n.toFixed(3); }
function fmtRs(n: number) { return '₹ ' + Math.round(n).toLocaleString('en-IN'); }

type DayRow = { day: number; m: number; e: number };

function HalfTable({ title, rows, subtotal, headColor, lang }: {
  title: string; rows: DayRow[]; subtotal: number; headColor: string; lang: Lang;
}) {
  return (
    <div style={{ flex: 1, border: '1px solid #d8dee6', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: headColor, color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 10px', textAlign: 'center' }}>
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#33415510', color: '#33415e' }}>
            <th style={th}>{L.date[lang]}</th>
            <th style={th}>{L.morning[lang]}</th>
            <th style={th}>{L.evening[lang]}</th>
            <th style={th}>{L.dayTotal[lang]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.day} style={{ background: i % 2 ? '#f3faf5' : '#fff' }}>
              <td style={td}>{pad(r.day)}</td>
              <td style={tdNum}>{fmtL(r.m)}</td>
              <td style={tdNum}>{fmtL(r.e)}</td>
              <td style={{ ...tdNum, color: '#2f7d4f', fontWeight: 700 }}>{fmtL(r.m + r.e)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#1e3a5f', color: '#fff', padding: '7px 10px', fontWeight: 700, fontSize: 12 }}>
        <span>{L.subtotal[lang]} ({pad(rows[0]?.day ?? 1)}–{pad(rows[rows.length - 1]?.day ?? 1)})</span>
        <span>{fmtL(subtotal)}</span>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 4px', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #e2e8f0' };
const td: React.CSSProperties = { padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #eef2f6' };
const tdNum: React.CSSProperties = { ...td, fontVariantNumeric: 'tabular-nums' };

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '1px solid #e7ecf2', borderLeft: `4px solid ${color}`,
      borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: '#5b6776', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function SignBox({ role, name, signLabel }: { role: string; name: string; signLabel: string }) {
  return (
    <div style={{ flex: 1, border: '1px solid #e7ecf2', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#33415e', marginBottom: 22 }}>{role}</div>
      <div style={{ borderTop: '1px dotted #9aa7b4', paddingTop: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 10, color: '#8a96a3' }}>{signLabel}</div>
      </div>
    </div>
  );
}

function ReportInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const { lang: appLang } = useLang();
  const sb = createBrowser();

  const lang = (search.get('lang') as Lang) || appLang;
  const now = new Date();
  const year = Number(search.get('year')) || now.getFullYear();
  const month = Number(search.get('month')) || now.getMonth() + 1;
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({ en: 'APS Milk Center, Mungilaru', ta: 'APS பால்பண்ணை, மூங்கிலாறு' });

  useEffect(() => {
    (async () => {
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      const [{ data: c }, { data: es }, { data: { user } }] = await Promise.all([
        sb.from('customers').select('*').eq('id', customerId).single(),
        sb.from('entries').select('*').eq('customer_id', customerId).gte('entry_date', start).lte('entry_date', end),
        sb.auth.getUser(),
      ]);
      if (user) {
        const { data: s } = await sb.from('user_settings').select('shop_name, shop_name_ta').eq('owner_id', user.id).maybeSingle();
        if (s) setShop({ en: s.shop_name || shop.en, ta: s.shop_name_ta || shop.ta });
      }
      setCustomer(c);
      setEntries(es ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, year, month]);

  const data = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDate: Record<string, any> = {};
    for (const e of entries) byDate[e.entry_date] = e;
    const all: DayRow[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month)}-${pad(d)}`;
      const e = byDate[key];
      all.push({ day: d, m: e ? Number(e.morning_litres) : 0, e: e ? Number(e.evening_litres) : 0 });
    }
    const first = all.filter(r => r.day <= 15);
    const second = all.filter(r => r.day > 15);
    const sub1 = first.reduce((s, r) => s + r.m + r.e, 0);
    const sub2 = second.reduce((s, r) => s + r.m + r.e, 0);
    const totalLitres = sub1 + sub2;
    const rate = Number(customer?.default_rate ?? 0);
    const feed = entries.reduce((s, e) => s + Number(e.biscuit_amount || 0) + Number(e.thivanam_amount || 0), 0);
    const advanceBalance = Number(customer?.advance_balance ?? 0);
    const saleValue = totalLitres * rate;
    const remaining = saleValue - feed - advanceBalance;
    return { daysInMonth, first, second, sub1, sub2, totalLitres, rate, feed, advanceBalance, saleValue, remaining };
  }, [entries, customer, year, month]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{L.loading[lang]}</div>;
  if (!customer) return <div style={{ padding: 40, textAlign: 'center' }}>Customer not found</div>;

  const monthName = MONTHS[lang][month - 1];
  const shopName = lang === 'ta' ? shop.ta : shop.en;
  const start = `${pad(1)}.${pad(month)}.${year}`;
  const end = `${pad(data.daysInMonth)}.${pad(month)}.${year}`;

  return (
    <div style={{ background: '#eef1f5', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Action bar — hidden when printing */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff',
        borderBottom: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={btnGhost}>
          <ArrowLeft size={16} /> {L.back[lang]}
        </button>
        <button onClick={() => window.print()} style={btnPrimary}>
          <Printer size={16} /> {L.print[lang]}
        </button>
      </div>

      {/* A4 sheet */}
      <div id="sheet" style={{ width: '210mm', maxWidth: '100%', margin: '14px auto', background: '#fff',
        boxShadow: '0 2px 14px #00000018', padding: '0', overflow: 'hidden', borderRadius: 4 }}>
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
              <div style={{ fontSize: 11, color: '#9fb2c9', marginTop: 2 }}>
                {start} {L.to[lang]} {end} {L.toEnd[lang]}
              </div>
            </div>
          </div>
          <div style={{ background: '#E8B24A', color: '#16293f', borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 9, fontWeight: 600 }}>{L.code[lang]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{customer.code}</div>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{customer.name}</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Info cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { l: L.name[lang], v: customer.name, c: '#2563eb' },
              { l: L.code[lang], v: String(customer.code), c: '#16a34a' },
              { l: L.month[lang], v: `${monthName} ${year}`, c: '#1e3a5f' },
            ].map((it, i) => (
              <div key={i} style={{ flex: 1, background: '#f8fafc', borderLeft: `4px solid ${it.c}`, borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>{it.l}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{it.v}</div>
              </div>
            ))}
          </div>

          {/* Two halves */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <HalfTable title={`${L.firstHalf[lang]} (01 – 15 ${monthName})`} rows={data.first} subtotal={data.sub1} headColor="#2563eb" lang={lang} />
            <HalfTable title={`${L.secondHalf[lang]} (16 – ${data.daysInMonth} ${monthName})`} rows={data.second} subtotal={data.sub2} headColor="#1e3a5f" lang={lang} />
          </div>

          {/* Total milk bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg,#1e3a5f,#16293f)', color: '#fff', borderRadius: 8, padding: '12px 18px', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{L.totalMilk[lang]} ({data.daysInMonth} {L.days[lang]})</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#E8B24A' }}>{fmtL(data.totalLitres)} {L.litreShort[lang]}</span>
          </div>

          {/* Financial summary */}
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a5f', marginBottom: 8 }}>{L.finance[lang]}</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <SummaryCard label={L.saleValue[lang]} value={fmtRs(data.saleValue)} color="#2563eb" />
            <SummaryCard label={L.feed[lang]} value={fmtRs(data.feed)} color="#dc2626" />
            <SummaryCard label={L.advance[lang]} value={fmtRs(data.advanceBalance)} color="#7c3aed" />
            <SummaryCard label={L.remaining[lang]} value={fmtRs(data.remaining)} color="#B8862B" />
          </div>

          {/* Net payable */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg,#15803d,#166534)', color: '#fff', borderRadius: 8, padding: '14px 18px', marginBottom: 18 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{L.netPayable[lang]}</span>
            <span style={{ fontWeight: 800, fontSize: 24 }}>{fmtRs(data.remaining)}</span>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 10 }}>
            <SignBox role={L.supplier[lang]} name={customer.name} signLabel={L.signature[lang]} />
            <SignBox role={L.collector[lang]} name="" signLabel={L.signature[lang]} />
            <SignBox role={L.officer[lang]} name={shopName} signLabel={L.signature[lang]} />
          </div>
        </div>

        {/* Footer */}
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

const btnPrimary: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: '#1e3a5f',
  color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 };
const btnGhost: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9',
  color: '#334155', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 };

export default function CustomerReportPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>…</div>}>
      <ReportInner />
    </Suspense>
  );
}
