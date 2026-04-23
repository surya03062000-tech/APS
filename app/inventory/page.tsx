import { createServer } from '@/lib/supabase-server';
import InventoryEditor from './InventoryEditor';
import { Wheat, Cookie } from 'lucide-react';

export default async function InventoryPage() {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  let { data: inv } = await sb.from('inventory').select('*').order('item_type');

  // Seed defaults if missing
  if (user && (inv?.length ?? 0) < 2) {
    const existing = new Set(inv?.map(i => i.item_type));
    const rows = [] as any[];
    if (!existing.has('thivanam')) rows.push({ owner_id: user.id, item_type:'thivanam', current_stock:0, unit:'bag' });
    if (!existing.has('biscuit'))  rows.push({ owner_id: user.id, item_type:'biscuit',  current_stock:0, unit:'packet' });
    if (rows.length) {
      await sb.from('inventory').insert(rows);
      ({ data: inv } = await sb.from('inventory').select('*').order('item_type'));
    }
  }

  const thiv = inv?.find(i => i.item_type === 'thivanam');
  const bisc = inv?.find(i => i.item_type === 'biscuit');

  return (
    <section className="pt-3 space-y-4">
      <h1 className="font-display text-xl font-bold">Inventory</h1>

      <InventoryEditor item={thiv!} icon="wheat" />
      <InventoryEditor item={bisc!} icon="cookie" />
    </section>
  );
}
