import type { LucideIcon } from 'lucide-react';

export default function StatTile({
  icon: Icon, label, value, unit, tone = 'gold',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  tone?: 'gold' | 'leaf';
}) {
  const toneMap = {
    gold: 'bg-gold-50 text-gold-700 border-gold-400/30',
    leaf: 'bg-emerald-50 text-leaf-700 border-leaf-500/30',
  } as const;
  return (
    <div className={`rounded-2xl border p-4 shadow-card ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-80">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium opacity-70">{unit}</span>}
      </div>
    </div>
  );
}
