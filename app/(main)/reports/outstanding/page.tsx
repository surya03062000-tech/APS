import { createServer } from '@/lib/supabase-server';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';

export default async function OutstandingPage() {
  const sb = createServer();
  const { data: customers } = await sb
    .from('customers').select('*').gt('advance_balance', 0)
    .order('advance_balance', { ascending: false });

  const total = (customers ?? []).reduce((s, c) => s + Number(c.advance_balance), 0);

  return (
    <section className="pt-3 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="tap inline-flex items-center gap-1 text-ink/60">
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Outstanding Balances</h1>
        <span className="text-sm font-bold text-red-600">
          Total: ₹{total.toLocaleString('en-IN')}
        </span>
      </div>

      {(customers ?? []).length === 0 && (
        <div className="text-center py-16 text-ink/50">
          <p className="text-4xl mb-2">✅</p>
          <p>No outstanding balances!</p>
        </div>
      )}

      <div className="space-y-2">
        {(customers ?? []).map((c, i) => (
          <div key={c.id} className="bg-white rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold grid place-items-center text-sm flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <Link href={`/customers/${c.id}`} className="font-semibold truncate block">
                  #{c.code} {c.name}
                </Link>
                <p className="text-xs text-ink/50">{c.phone ?? '—'}</p>
              </div>
              <span className="text-red-600 font-bold tabular-nums text-lg">
                ₹{Number(c.advance_balance).toLocaleString('en-IN')}
              </span>
            </div>
            {c.phone && (
              <div className="flex gap-2 mt-3">
                <a href={`tel:${c.phone}`}
                  className="tap flex-1 rounded-xl bg-leaf-700 text-white font-semibold text-sm flex items-center justify-center gap-1">
                  <Phone size={14} /> Call
                </a>
                {c.whatsapp_enabled && (
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                    className="tap flex-1 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-1">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
