import { Check, Lock } from 'lucide-react';
import type { SkillNode as Node, NodeState } from '../data/skillTree';

export default function SkillNode({
  node,
  state,
  trackColor,
  onTap,
}: {
  node: Node;
  state: NodeState;
  trackColor: string;
  onTap: () => void;
}) {
  const locked = state === 'locked';
  return (
    <div className="relative z-10 flex flex-col items-center gap-1.5 shrink-0">
      <button
        onClick={onTap}
        disabled={locked}
        aria-label={`${node.command} — ${state}`}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 min-w-[56px] min-h-[56px] border ${
          state === 'completed'
            ? ''
            : locked
              ? 'bg-surface-high border-border cursor-not-allowed opacity-60'
              : 'bg-surface border-border'
        }`}
        style={
          state === 'completed'
            ? { background: trackColor, borderColor: trackColor }
            : state === 'locked'
              ? {}
              : { borderColor: trackColor }
        }
      >
        {state === 'completed' ? (
          <Check size={24} strokeWidth={3} className="text-bg" />
        ) : locked ? (
          <Lock size={20} className="text-text-muted" />
        ) : state === 'in-progress' ? (
          <>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="25" fill="none" stroke="#21262D" strokeWidth="3" />
              <circle
                cx="28"
                cy="28"
                r="25"
                fill="none"
                stroke={trackColor}
                strokeDasharray="157"
                strokeDashoffset="60"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <span className="relative font-mono font-bold text-sm" style={{ color: trackColor }}>
              {node.command.split(' ')[0].slice(0, 2)}
            </span>
          </>
        ) : (
          <span className="font-mono font-bold text-sm" style={{ color: trackColor }}>
            {node.command.split(' ')[0].slice(0, 2)}
          </span>
        )}
      </button>
      <span
        className={`font-mono text-[11px] text-center max-w-[64px] truncate ${
          locked ? 'text-text-muted' : state === 'completed' ? 'text-text' : 'font-bold'
        }`}
        style={locked ? {} : state !== 'completed' ? { color: trackColor } : {}}
      >
        {node.command}
      </span>
    </div>
  );
}
