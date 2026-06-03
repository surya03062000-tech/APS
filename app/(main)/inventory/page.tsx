import { createServer } from '@/lib/supabase-server';
import InventoryEditor from './InventoryEditor';
import { AlertTriangle, CalendarClock } from 'lucide-react';

export default async function InventoryPage() {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  let { data: inv } = await sb.from('inventory').select('*').order('item_type');

  // Seed defaults if missing
  if (user && (inv?.length ?? 0) < 2) {
    const existing = new Set(inv?.map(i => i.item_type));
    const rows = [] as any[];
    if (!existing.has('thivanam')) rows.push({ owner_id: user.id, item_type: 'thivanam', current_stock: 0, unit: 'bag' });
    if (!existing.has('biscuit'))  rows.push({ owner_id: user.id, item_type: 'biscuit',  current_stock: 0, unit: 'packet' });
    if (rows.length) {
      await sb.from('inventory').insert(rows);
      ({ data: inv } = await sb.from('inventory').select('*').order('item_type'));
    }
  }

  const thiv = inv?.find(i => i.item_type === 'thivanam');
  const bisc = inv?.find(i => i.item_type === 'biscuit');

  // Consumption over last 30 days → predicted depletion date (Feature #46)
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: recent } = await sb.from('entries').select('biscuit_qty, thivanam_qty').gte('entry_date', since);
  const biscUsed = (recent ?? []).reduce((s, e) => s + Number(e.biscuit_qty), 0);
  const thivUsed = (recent ?? []).reduce((s, e) => s + Number(e.thivanam_qty), 0);

  const predict = (stock: number, used30: number) => {
    if (used30 <= 0) return null;
    const perDay = used30 / 30;
    const days = Math.floor(stock / perDay);
    return { days, perDay: perDay.toFixed(1) };
  };

  const items = [
    { item: thiv, label: 'Thivanam (cattle feed)', used: thivUsed, icon: 'wheat' as const },
    { item: bisc, label: 'Biscuit', used: biscUsed, icon: 'cookie' as const },
  ].filter(x => x.item);

  const lowStock = items.filter(x => Number(x.item!.current_stock) <= Number(x.item!.low_stock_alert ?? 5));

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">Inventory</h1>

      {/* Low stock alerts (Feature #35) */}
      {lowStock.map(x => (
        <div key={x.item!.id} className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-3 py-2 text-sm font-medium">
          <AlertTriangle size={16} />
          {x.label}: only {Number(x.item!.current_stock)} {x.item!.unit} left — restock soon!
        </div>
      ))}

      {items.map(x => {
        const p = predict(Number(x.item!.current_stock), x.used);
        return (
          <div key={x.item!.id} className="space-y-1">
            <InventoryEditor item={x.item!} icon={x.icon} />
            {p && (
              <p className="text-xs text-ink/50 flex items-center gap-1 px-1">
                <CalendarClock size={13} />
                ~{x.used.toFixed(0)} used /30d ({p.perDay}/day) ·
                {p.days > 0
                  ? ` will last ~${p.days} more days`
                  : ' out of stock!'}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
