import type { ReactNode } from 'react';

export default function TrackRow({
  color,
  name,
  subtitle,
  pct,
  done,
  total,
  children,
}: {
  color: string;
  name: string;
  subtitle: string;
  pct: number;
  done: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col bg-surface-low rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="font-semibold text-text">{name}</span>
          <span
            className="font-mono text-[11px] px-1.5 py-0.5 rounded"
            style={{ color, background: `${color}22` }}
          >
            {subtitle}
          </span>
        </div>
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {pct}% <span className="font-normal text-text-muted">({done}/{total})</span>
        </span>
      </div>
      <div className="relative w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
        <div className="relative flex items-center gap-8 py-2 min-w-max">
          <div
            className="absolute top-1/2 left-7 right-7 h-0.5 -translate-y-1/2 pointer-events-none"
            style={{ background: `${color}44` }}
          />
          {children}
        </div>
      </div>
    </section>
  );
}
