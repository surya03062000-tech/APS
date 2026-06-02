'use client';

// Lightweight dependency-free SVG bar chart (good for 2G — no chart library)
interface Props {
  data: { label: string; value: number }[];
  unit?: string;
  color?: string;
  height?: number;
}

export default function BarChart({ data, unit = '', color = '#E8B24A', height = 140 }: Props) {
  if (!data.length) return <p className="text-center text-ink/40 text-sm py-6">No data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(100 / data.length - 2, 4);

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
        className="overflow-visible">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 30);
          const x = (100 / data.length) * i + 1;
          return (
            <g key={i}>
              <rect x={x} y={height - 20 - h} width={barW} height={h} rx={1.5} fill={color} opacity={0.85} />
              <text x={x + barW / 2} y={height - 20 - h - 2} fontSize="5" textAnchor="middle" fill="#1B1A17">
                {d.value > 0 ? Math.round(d.value) : ''}
              </text>
              <text x={x + barW / 2} y={height - 8} fontSize="4.5" textAnchor="middle" fill="#1B1A17" opacity={0.6}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {unit && <p className="text-[10px] text-ink/40 text-center mt-1">{unit}</p>}
    </div>
  );
}
