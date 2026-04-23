import { createServer } from '@/lib/supabase-server';
import StatTile from '@/components/StatTile';
import {
  Users, Calendar, Droplets, Milk, Cookie, Wheat, IndianRupee,
} from 'lucide-react';
import DashboardLangHeader from './LangHeader';

const today   = () => new Date().toISOString().slice(0, 10);
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

  const [{ count: customerCount }, { data: todayRows }, { data: monthRows }] = await Promise.all([
    sb.from('customers').select('*', { count: 'exact', head: true }),
    sb.from('entries').select('*').eq('entry_date', t0),
    sb.from('entries').select('*').gte('entry_date', start).lte('entry_date', end),
  ]);

  const todayMilk = (todayRows ?? []).reduce(
    (s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0
  );
  const monthMilk = (monthRows ?? []).reduce(
    (s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0
  );
  const monthBisc = (monthRows ?? []).reduce((s, r) => s + Number(r.biscuit_qty), 0);
  const monthThiv = (monthRows ?? []).reduce((s, r) => s + Number(r.thivanam_qty), 0);
  const monthAdv  = (monthRows ?? []).reduce((s, r) => s + Number(r.advance_amount), 0);

  return (
    <section>
      <DashboardLangHeader />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatTile icon={Users}    label="Customers" value={customerCount ?? 0} tone="leaf" />
        <StatTile icon={Calendar} label="Today's entries" value={todayRows?.length ?? 0} />
        <StatTile icon={Droplets} label="Today's milk" value={todayMilk.toFixed(1)} unit="L" />
        <StatTile icon={Milk}     label="This month" value={monthMilk.toFixed(1)} unit="L" tone="leaf" />
        <StatTile icon={Cookie}   label="Biscuits" value={monthBisc} unit="pkt" />
        <StatTile icon={Wheat}    label="Thivanam" value={monthThiv} unit="bag" tone="leaf" />
        <StatTile
          icon={IndianRupee} label="Advance" value={`₹${monthAdv.toLocaleString('en-IN')}`}
        />
      </div>
    </section>
  );
}
