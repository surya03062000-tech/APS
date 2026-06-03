import { createServer } from '@/lib/supabase-server';
import StatTile from '@/components/StatTile';
import { Users, Calendar, Droplets, Milk, Cookie, Wheat, IndianRupee } from 'lucide-react';
import DashboardLangHeader from './LangHeader';
import Link from 'next/link';

const today = () => new Date().toISOString().slice(0, 10);
const monthBounds = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

export default async function Dashboard() {
  const sb = createServer();
  const { start, end } = monthBounds();
  const t0 = today();

  const [{ data: customers }, { data: todayRows }, { data: monthRows }] = await Promise.all([
    sb.from('customers').select('id, name, code, advance_balance').order('code'),
    sb.from('entries').select('customer_id').eq('entry_date', t0),
    sb.from('entries').select('*').gte('entry_date', start).lte('entry_date', end),
  ]);

  const todayEntryIds = new Set((todayRows ?? []).map(r => r.customer_id));

  const todayMilk = (monthRows ?? [])
    .filter(r => r.entry_date === t0)
    .reduce((s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0);
  const monthMilk = (monthRows ?? []).reduce(
    (s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0);
  const monthBisc = (monthRows ?? []).reduce((s, r) => s + Number(r.biscuit_qty), 0);
  const monthThiv = (monthRows ?? []).reduce((s, r) => s + Number(r.thivanam_qty), 0);
  const monthAdv  = (monthRows ?? []).reduce((s, r) => s + Number(r.advance_amount), 0);

  // High balance customers (outstanding > 0)
  const highBalance = (customers ?? [])
    .filter(c => Number(c.advance_balance) > 0)
    .sort((a, b) => Number(b.advance_balance) - Number(a.advance_balance))
    .slice(0, 5);

  return (
    <section>
      <DashboardLangHeader />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatTile icon={Users}       label="Customers"    value={customers?.length ?? 0} tone="leaf" />
        <StatTile icon={Calendar}    label="Today entries" value={todayRows?.length ?? 0} />
        <StatTile icon={Droplets}    label="Today milk"   value={todayMilk.toFixed(1)} unit="L" />
        <StatTile icon={Milk}        label="This month"   value={monthMilk.toFixed(1)} unit="L" tone="leaf" />
        <StatTile icon={Cookie}      label="Biscuits"     value={monthBisc} unit="pkt" />
        <StatTile icon={Wheat}       label="Thivanam"     value={monthThiv} unit="bag" tone="leaf" />
        <StatTile icon={IndianRupee} label="Advance"      value={`₹${monthAdv.toLocaleString('en-IN')}`} />
      </div>

      {/* Today's entry status */}
      {(customers ?? []).length > 0 && (
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-card">
          <h2 className="font-display font-bold mb-3 text-sm">
            Today&apos;s entry status
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {(customers ?? []).map(c => (
              <Link key={c.id} href={`/customers/${c.id}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-cream">
                <span className={`w-8 h-8 rounded-full text-xs font-bold grid place-items-center
                  ${todayEntryIds.has(c.id) ? 'bg-leaf-700 text-white' : 'bg-red-100 text-red-600'}`}>
                  {c.code}
                </span>
                <span className="text-[9px] text-ink/50 truncate w-full text-center">{c.name}</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-ink/40 mt-2 text-center">
            ✅ {todayEntryIds.size} / {customers?.length ?? 0} entered today
          </p>
        </div>
      )}

      {/* Outstanding balances */}
      {highBalance.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-card">
          <h2 className="font-display font-bold mb-3 text-sm">⚠️ Outstanding balances</h2>
          <div className="space-y-2">
            {highBalance.map(c => (
              <Link key={c.id} href={`/customers/${c.id}`}
                className="flex items-center justify-between text-sm">
                <span className="font-medium">#{c.code} {c.name}</span>
                <span className="text-red-600 font-bold tabular-nums">
                  ₹{Number(c.advance_balance).toLocaleString('en-IN')}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/reports/outstanding"
            className="block text-xs text-gold-600 underline text-center mt-3">
            View all outstanding →
          </Link>
        </div>
      )}
    </section>
  );
}
