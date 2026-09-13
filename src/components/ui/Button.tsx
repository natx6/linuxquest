import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'magenta';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-accent-cyan text-[#001f25] font-semibold shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:brightness-110 active:scale-[0.98]',
  ghost: 'bg-surface-container hover:bg-surface-high text-text active:scale-[0.98]',
  magenta: 'bg-surface-high text-accent-magenta active:scale-[0.99]',
};

export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`min-h-[44px] rounded-btn flex items-center justify-center gap-2 px-4 transition-all ${styles[variant]} ${className}`}
    />
  );
}
