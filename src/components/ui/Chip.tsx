export default function Chip({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
