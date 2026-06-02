import { createServer } from '@/lib/supabase-server';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle, Pencil, TrendingDown, TrendingUp, History } from 'lucide-react';
import CustomerActions from '@/components/CustomerActions';

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const sb = createServer();
  const { data: c } = await sb.from('customers').select('*').eq('id', params.id).single();
  if (!c) return <div className="p-6">Not found</div>;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: entries } = await sb.from('entries')
    .select('*').eq('customer_id', params.id).order('entry_date', { ascending: false }).limit(60);

  // Rate change history (Feature #29)
  const { data: rateHistory } = await sb.from('rate_history')
    .select('*').eq('customer_id', params.id).order('changed_at', { ascending: false }).limit(10);

  const total = (entries ?? []).reduce((s, e) =>
    s + Number(e.morning_litres) + Number(e.evening_litres), 0);

  // This-month totals for customer actions
  const monthEntries = (entries ?? []).filter(e => e.entry_date >= monthStart);
  const monthLitres = monthEntries.reduce((s, e) => s + Number(e.morning_litres) + Number(e.evening_litres), 0);
  const monthFeed   = monthEntries.reduce((s, e) => s + Number(e.biscuit_amount) + Number(e.thivanam_amount), 0);

  // Advance ledger: entries with advance_amount != 0
  const advanceLedger = (entries ?? []).filter(e => Number(e.advance_amount) !== 0);

  return (
    <section className="pt-3 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/customers" className="tap inline-flex items-center gap-1 text-ink/60">
          <ArrowLeft size={18} /> Back
        </Link>
        <Link href={`/customers/${params.id}/edit`}
          className="tap flex items-center gap-1 px-3 rounded-full bg-gold-50 text-gold-700 text-sm font-semibold">
          <Pencil size={14} /> Edit
        </Link>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-12 h-12 rounded-full bg-gold-50 text-gold-700 font-bold grid place-items-center text-lg flex-shrink-0">
            {c.code}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold truncate">{c.name}</h1>
            <p className="text-sm text-ink/60">{c.phone ?? '—'}</p>
          </div>
        </div>
        {c.phone && (
          <div className="flex gap-2 mt-3">
            <a href={`tel:${c.phone}`}
              className="tap flex-1 rounded-xl bg-leaf-700 text-white font-semibold flex items-center justify-center gap-2">
              <Phone size={16} /> Call
            </a>
            {c.whatsapp_enabled && (
              <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                className="tap flex-1 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
                <MessageCircle size={16} /> WhatsApp
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
            <p className={`font-bold tabular-nums ${Number(c.advance_balance) > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
              ₹{Number(c.advance_balance).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-ink/50">This month L</p>
            <p className="font-bold tabular-nums">{monthLitres.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Quick actions: quick entry, WhatsApp summary, PDF */}
      <CustomerActions customer={c} monthLitres={monthLitres} rate={Number(c.default_rate)} feed={monthFeed} />

      {/* Rate change history (Feature #29) */}
      {(rateHistory ?? []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-4">
          <h2 className="font-display font-bold text-sm flex items-center gap-1 mb-2">
            <History size={15} /> Rate history
          </h2>
          <div className="space-y-1">
            {(rateHistory ?? []).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs text-ink/60">
                <span>{new Date(r.changed_at).toLocaleDateString('en-IN')}</span>
                <span className="tabular-nums">
                  ₹{Number(r.old_rate ?? 0).toFixed(1)} → <b className="text-ink/80">₹{Number(r.new_rate).toFixed(1)}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milk entries */}
      <h2 className="font-display font-bold">Recent milk entries</h2>
      <div className="bg-white rounded-2xl shadow-card divide-y divide-cream">
        {(entries ?? []).length === 0 && (
          <p className="p-4 text-center text-ink/50 text-sm">No entries yet.</p>
        )}
        {(entries ?? []).slice(0, 30).map(e => (
          <div key={e.id} className="p-3 grid grid-cols-5 text-sm items-center">
            <span className="col-span-2 text-ink/70">{e.entry_date}</span>
            <span className="text-right tabular-nums">{Number(e.morning_litres).toFixed(1)}</span>
            <span className="text-right tabular-nums">{Number(e.evening_litres).toFixed(1)}</span>
            <span className="text-right tabular-nums font-semibold">
              {(Number(e.morning_litres) + Number(e.evening_litres)).toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Advance ledger */}
      {advanceLedger.length > 0 && (
        <>
          <h2 className="font-display font-bold">Advance ledger</h2>
          <div className="bg-white rounded-2xl shadow-card divide-y divide-cream">
            {advanceLedger.map(e => {
              const amt = Number(e.advance_amount);
              return (
                <div key={e.id} className="p-3 flex items-center justify-between text-sm">
                  <span className="text-ink/70">{e.entry_date}</span>
                  <span className={`flex items-center gap-1 font-semibold tabular-nums ${amt > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
                    {amt > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {amt > 0 ? `+₹${amt.toLocaleString('en-IN')}` : `-₹${Math.abs(amt).toLocaleString('en-IN')}`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
