'use client';
import { useState } from 'react';
import { Wheat, Cookie, Plus, Minus } from 'lucide-react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import type { Inventory } from '@/types';

export default function InventoryEditor({
  item, icon,
}: { item: Inventory; icon: 'wheat' | 'cookie' }) {
  const { lang } = useLang();
  const [stock, setStock] = useState(item?.current_stock ?? 0);
  const [delta, setDelta] = useState('');
  const [busy, setBusy]   = useState(false);
  const Icon = icon === 'wheat' ? Wheat : Cookie;
  const title = icon === 'wheat'
    ? (lang==='ta' ? 'தீவனம்' : 'Cattle feed')
    : (lang==='ta' ? 'பிஸ்கட்' : 'Biscuit');

  const applyDelta = async (sign: 1 | -1) => {
    const n = Number(delta); if (!n) return;
    setBusy(true);
    const sb = createBrowser();
    const next = stock + sign * n;
    const { error } = await sb.from('inventory')
      .update({ current_stock: next, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (!error) {
      await sb.from('inventory_movements').insert({
        inventory_id: item.id, change: sign * n, reason: 'restock',
      });
      setStock(next); setDelta('');
    }
    setBusy(false);
  };

  const low = stock <= (item?.low_stock_alert ?? 5);

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-11 h-11 rounded-full grid place-items-center
          ${icon==='wheat' ? 'bg-emerald-50 text-leaf-700' : 'bg-gold-50 text-gold-700'}`}>
          <Icon size={22}/>
        </span>
        <div className="flex-1">
          <p className="text-sm text-ink/60">{title}</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {stock} <span className="text-sm font-medium text-ink/50">{item?.unit}</span>
          </p>
        </div>
        {low && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
            {lang==='ta' ? 'குறைவான கையிருப்பு' : 'Low'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="number" min="1" inputMode="numeric"
          placeholder={lang==='ta' ? 'எண்ணிக்கை' : 'Amount'}
          value={delta} onChange={e=>setDelta(e.target.value)}
          className="tap flex-1 rounded-xl border border-gold-400/30 bg-milk px-4 tabular-nums"/>
        <button disabled={busy || !delta} onClick={()=>applyDelta(1)}
          className="tap w-12 rounded-xl bg-leaf-700 text-white disabled:opacity-50 grid place-items-center">
          <Plus size={20}/>
        </button>
        <button disabled={busy || !delta} onClick={()=>applyDelta(-1)}
          className="tap w-12 rounded-xl bg-red-600 text-white disabled:opacity-50 grid place-items-center">
          <Minus size={20}/>
        </button>
      </div>
    </div>
  );
}
