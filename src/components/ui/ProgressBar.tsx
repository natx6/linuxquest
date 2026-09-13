export default function ProgressBar({
  value,
  max = 100,
  colorClass = 'bg-accent-cyan',
}: {
  value: number;
  max?: number;
  colorClass?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-[#0A0E14] h-2 rounded-full overflow-hidden">
      <div
        className={`${colorClass} h-full rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
