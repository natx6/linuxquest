import type { ReactNode } from 'react';

export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <aside className="relative w-full max-w-app bg-surface-high rounded-t-sheet px-4 pt-3 pb-5 flex flex-col gap-3">
        <div className="w-10 h-1 bg-[#353940] rounded-full mx-auto mb-1" />
        {children}
      </aside>
    </div>
  );
}
