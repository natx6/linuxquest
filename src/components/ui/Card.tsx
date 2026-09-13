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
      className={`w-full bg-surface-container rounded-card p-4 shadow-md relative overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}
