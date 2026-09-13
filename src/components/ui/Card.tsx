import type { ReactNode } from 'react';

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`w-full bg-surface rounded-card p-4 border border-border ${className}`}
    >
      {children}
    </section>
  );
}
