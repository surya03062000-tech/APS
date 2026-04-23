import { createServer } from '@/lib/supabase-server';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const sb = createServer();
  const { data: c } = await sb.from('customers').select('*').eq('id', params.id).single();
  if (!c) return <div className="p-6">Not found</div>;

  const { data: entries } = await sb.from('entries')
    .select('*').eq('customer_id', params.id).order('entry_date', { ascending: false }).limit(30);

  const total = (entries ?? []).reduce((s, e) =>
    s + Number(e.morning_litres) + Number(e.evening_litres), 0);

  return (
    <section className="pt-3 space-y-4">
      <Link href="/customers" className="tap inline-flex items-center gap-1 text-ink/60">
        <ArrowLeft size={18}/> Back
      </Link>

      <div className="bg-white rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-12 h-12 rounded-full bg-gold-50 text-gold-700 font-bold grid place-items-center text-lg">
            {c.code}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold truncate">{c.name}</h1>
            <p className="text-sm text-ink/60">{c.phone ?? '—'}</p>
          </div>
        </div>
        {c.phone && (
          <div className="flex gap-2 mt-3">
            <a href={`tel:${c.phone}`} className="tap flex-1 rounded-xl bg-leaf-700 text-white font-semibold flex items-center justify-center gap-2">
              <Phone size={16}/> Call
            </a>
            {c.whatsapp_enabled && (
              <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                className="tap flex-1 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
                <MessageCircle size={16}/> WhatsApp
              </a>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <p className="text-[10px] text-ink/50">Rate ₹/L</p>
            <p className="font-bold tabular-nums">{Number(c.default_rate).toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] text-ink/50">Advance</p>
            <p className={`font-bold tabular-nums ${c.advance_balance > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
              ₹{Number(c.advance_balance).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-ink/50">Last 30d L</p>
            <p className="font-bold tabular-nums">{total.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <h2 className="font-display font-bold">Recent entries</h2>
      <div className="bg-white rounded-2xl shadow-card divide-y divide-cream">
        {(entries ?? []).length === 0 && (
          <p className="p-4 text-center text-ink/50 text-sm">No entries yet.</p>
        )}
        {(entries ?? []).map(e => (
          <div key={e.id} className="p-3 grid grid-cols-5 text-sm items-center">
            <span className="col-span-2 text-ink/70">{e.entry_date}</span>
            <span className="text-right tabular-nums">
              {Number(e.morning_litres).toFixed(1)}
            </span>
            <span className="text-right tabular-nums">
              {Number(e.evening_litres).toFixed(1)}
            </span>
            <span className="text-right tabular-nums font-semibold">
              {(Number(e.morning_litres) + Number(e.evening_litres)).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
