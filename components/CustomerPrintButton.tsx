'use client';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useLang } from '@/lib/store';

const MONTHS_TA = ['','ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];
const MONTHS_EN = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CustomerPrintButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const { lang } = useLang();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const months = lang === 'ta' ? MONTHS_TA : MONTHS_EN;
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const open = () => {
    window.open(`/reports/print/customer/${customerId}?year=${year}&month=${month}&lang=${lang}`, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
      <p className="text-sm font-semibold text-ink/70">
        {lang === 'ta' ? 'மாதாந்திர அறிக்கை' : 'Monthly Statement'}
      </p>
      <div className="flex gap-2">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="flex-1 rounded-xl border border-gold-400/30 bg-milk px-3 text-sm focus:outline-none focus:border-gold-400" style={{ minHeight: 44 }}>
          {months.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="w-24 rounded-xl border border-gold-400/30 bg-milk px-3 text-sm focus:outline-none focus:border-gold-400" style={{ minHeight: 44 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={open}
          className="tap px-4 rounded-xl bg-[#1e3a5f] text-white font-semibold text-sm flex items-center gap-2">
          <FileText size={16} />
          {lang === 'ta' ? 'PDF' : 'PDF'}
        </button>
      </div>
      <p className="text-xs text-ink/40">
        {lang === 'ta'
          ? 'புதிய tab-ல் திறக்கும் → Print → Save as PDF'
          : 'Opens in new tab → Print → Save as PDF'}
      </p>
    </div>
  );
}
