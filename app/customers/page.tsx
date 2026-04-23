import Link from 'next/link';
import { createServer } from '@/lib/supabase-server';
import { Plus } from 'lucide-react';

export default async function CustomersPage() {
  const sb = createServer();
  const { data: customers } = await sb
    .from('customers').select('*').order('code', { ascending: true });

  return (
    <section className="pt-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-xl font-bold">Customers</h1>
        <Link href="/customers/new"
          className="tap px-4 rounded-full bg-gold-400 text-white font-semibold flex items-center gap-1">
          <Plus size={18}/> New
        </Link>
      </div>

      <ul className="space-y-2">
        {(customers ?? []).map(c => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-card">
              <span className="w-10 h-10 rounded-full bg-gold-50 text-gold-700 font-bold grid place-items-center">
                {c.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs text-ink/50 truncate">{c.phone ?? '—'}</p>
              </div>
              <span className={`text-sm font-semibold ${c.advance_balance > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
                ₹{Number(c.advance_balance).toLocaleString('en-IN')}
              </span>
            </Link>
          </li>
        ))}
        {customers?.length === 0 && (
          <li className="text-center text-ink/50 py-10">No customers yet.</li>
        )}
      </ul>
    </section>
  );
}
