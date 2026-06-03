'use client';
import { useState } from 'react';
import { createBrowser } from '@/lib/supabase';
import { useLang, useToast } from '@/lib/store';
import { whatsappTemplate } from '@/lib/i18n';
import { FileText, MessageCircle, Zap, Check } from 'lucide-react';

interface Props {
  customer: any;
  monthLitres: number;
  rate: number;
  feed: number;
}

// Customer PDF (#26), individual WhatsApp (#27), quick entry (#30)
export default function CustomerActions({ customer, monthLitres, rate, feed }: Props) {
  const { lang } = useLang();
  const toast = useToast();
  const sb = createBrowser();
  const now = new Date();

  const [quickOpen, setQuickOpen] = useState(false);
  const [qMorning, setQMorning] = useState('');
  const [qEvening, setQEvening] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [qDone, setQDone] = useState(false);

  const milkAmount = monthLitres * rate;
  const balance = milkAmount - feed - Number(customer.advance_balance);

  // Open the bilingual HTML statement (renders Tamil correctly, save as PDF via print)
  const openReport = () => {
    const url = `/reports/print/customer/${customer.id}?year=${now.getFullYear()}&month=${now.getMonth() + 1}&lang=${lang}`;
    window.open(url, '_blank');
  };

  // Open WhatsApp with prefilled monthly summary (no Twilio needed — uses wa.me)
  const whatsappSummary = () => {
    if (!customer.phone) return;
    const msg = whatsappTemplate(lang, {
      name: customer.name, litres: monthLitres,
      amount: Math.round(milkAmount), balance: Math.round(balance),
    });
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const quickSave = async () => {
    setQBusy(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setQBusy(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    await sb.from('entries').upsert({
      owner_id: user.id, customer_id: customer.id, entry_date: today,
      morning_litres: Number(qMorning) || 0, evening_litres: Number(qEvening) || 0,
    }, { onConflict: 'customer_id,entry_date' });
    setQBusy(false); setQDone(true);
    toast.show(lang === 'ta' ? 'பால் சேமிக்கப்பட்டது ✅' : 'Milk saved ✅', 'success');
    setTimeout(() => { setQuickOpen(false); setQDone(false); setQMorning(''); setQEvening(''); }, 1200);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setQuickOpen(!quickOpen)}
          className="tap rounded-xl bg-gold-400 text-white text-sm font-semibold flex items-center justify-center gap-1">
          <Zap size={15} /> {lang === 'ta' ? 'விரைவு' : 'Quick'}
        </button>
        {customer.phone && (
          <button onClick={whatsappSummary}
            className="tap rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <MessageCircle size={15} /> {lang === 'ta' ? 'சுருக்கம்' : 'Summary'}
          </button>
        )}
        <button onClick={openReport}
          className="tap rounded-xl bg-gold-700 text-white text-sm font-semibold flex items-center justify-center gap-1">
          <FileText size={15} /> PDF
        </button>
      </div>

      {/* Quick entry popover (Feature #30) */}
      {quickOpen && (
        <div className="bg-gold-50 rounded-2xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gold-700">
            {lang === 'ta' ? 'இன்றைய பால் (லிட்டர்)' : "Today's milk (litres)"}
          </p>
          <div className="flex gap-2">
            <input type="number" step="0.001" inputMode="decimal" value={qMorning}
              onChange={e => setQMorning(e.target.value)}
              placeholder={lang === 'ta' ? 'காலை' : 'Morning'}
              className="flex-1 rounded-lg border border-gold-400/30 bg-white px-3 text-sm tabular-nums" style={{ minHeight: 40 }} />
            <input type="number" step="0.001" inputMode="decimal" value={qEvening}
              onChange={e => setQEvening(e.target.value)}
              placeholder={lang === 'ta' ? 'மாலை' : 'Evening'}
              className="flex-1 rounded-lg border border-gold-400/30 bg-white px-3 text-sm tabular-nums" style={{ minHeight: 40 }} />
            <button onClick={quickSave} disabled={qBusy}
              className="tap px-4 rounded-lg bg-leaf-700 text-white text-sm font-semibold" style={{ minHeight: 40 }}>
              {qDone ? <Check size={16} /> : qBusy ? '…' : (lang === 'ta' ? 'சேமி' : 'Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
