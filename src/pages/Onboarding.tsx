import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { useUserStore } from '../store/userStore';

type DistroId = 'ubuntu' | 'arch' | 'fedora' | 'alpine';

const DISTROS: { id: DistroId; name: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'ubuntu',
    name: 'Ubuntu',
    desc: 'Beginner-friendly',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" fill="#E95420" r="10" />
        <circle cx="18" cy="12" fill="#fff" r="1.7" />
        <circle cx="9" cy="6.8" fill="#fff" r="1.7" />
        <circle cx="9" cy="17.2" fill="#fff" r="1.7" />
        <path
          d="M14.5 12a3.5 3.5 0 0 1-2.2 3.25m-1.3.15A3.5 3.5 0 0 1 8.5 12a3.5 3.5 0 0 1 2.5-3.4"
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      </svg>
    ),
  },
  {
    id: 'arch',
    name: 'Arch',
    desc: 'For tinkerers',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24">
        <path d="M12 3 5.5 18.5 8.5 18 10 14.5c.5 1 1.2 1.7 2 2.5.8-.8 1.5-1.5 2-2.5L15.5 18l3 .5L12 3Z" fill="#1793D1" />
        <path d="M12 8l1.8 5.5c-.6.4-1.2.6-1.8.6s-1.2-.2-1.8-.6L12 8Z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: 'fedora',
    name: 'Fedora',
    desc: 'Enterprise-ready',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" fill="#294172" r="10" />
        <path d="M13 6.5c-2.5 0-4.5 2-4.5 4.5v6.5H12v-4h2.5c2 0 3-1.5 3-3.5 0-2.2-1.8-3.5-4.5-3.5Z" fill="#3C6EB4" />
        <rect fill="#fff" height="1.8" rx="0.9" width="5" x="7" y="11" />
      </svg>
    ),
  },
  {
    id: 'alpine',
    name: 'Alpine',
    desc: 'Minimal & fast',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24">
        <path d="M4 17.5 9.5 8 13 14l2.5-4L20 17.5H4Z" fill="#0D597F" />
        <path d="M9.5 8l2 3.5L8 17.5H4L9.5 8Z" fill="#207CA8" />
        <path d="M15.5 10l2 3.5L15 17.5h-3.5l4-7.5Z" fill="#3894C2" />
      </svg>
    ),
  },
];

export default function Onboarding() {
  const [selected, setSelected] = useState<DistroId>('ubuntu');
  const [booting, setBooting] = useState(false);
  const setDistro = useUserStore((s) => s.setDistro);
  const setOnboarded = useUserStore((s) => s.setOnboarded);
  const navigate = useNavigate();

  const submit = (id: DistroId) => {
    setBooting(true);
    setDistro(id);
    setOnboarded(true);
    setTimeout(() => navigate('/', { replace: true }), 450);
  };

  return (
    <main className="min-h-dvh flex flex-col max-w-app mx-auto px-4 pt-4 pb-6">
      {/* Branding */}
      <div className="flex flex-col items-center text-center mt-1 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center font-mono font-bold text-accent-cyan text-lg border border-border">
            $_
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text tracking-tight text-lg">LinuxQuest</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-high text-accent-cyan font-semibold uppercase tracking-wider">
              PWA
            </span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-text mb-1">Choose your Linux</h1>
        <p className="text-sm text-text-muted">You can switch anytime.</p>
      </div>

      {/* 2x2 grid */}
      <div aria-label="Linux Distribution Selection" role="radiogroup" className="grid grid-cols-2 gap-3 mb-6 w-full">
        {DISTROS.map((d) => {
          const active = selected === d.id;
          return (
            <div
              key={d.id}
              role="radio"
              aria-checked={active}
              tabIndex={0}
              onClick={() => setSelected(d.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(d.id);
                }
              }}
              className={`relative p-4 rounded-xl cursor-pointer transition-all duration-200 select-none flex flex-col items-start bg-surface min-h-[44px] ${
                active ? 'ring-2 ring-accent-cyan' : 'hover:bg-surface-container border border-border'
              }`}
            >
              {active && <div className="absolute inset-0 rounded-xl bg-accent-cyan/10 pointer-events-none" />}
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-cyan flex items-center justify-center">
                  <Check size={14} strokeWidth={3} className="text-[#0D1117]" />
                </div>
              )}
              <div className="w-11 h-11 rounded-lg bg-surface-high flex items-center justify-center mb-3">
                {d.icon}
              </div>
              <span className="font-semibold text-text tracking-tight">{d.name}</span>
              <span className="text-xs text-text-muted mt-0.5 line-clamp-1">{d.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Terminal teaser */}
      <div className="w-full bg-terminal rounded-lg p-3 mb-6 border border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-state-error" />
          <span className="w-2 h-2 rounded-full bg-state-warning" />
          <span className="w-2 h-2 rounded-full bg-state-success" />
          <span className="font-mono text-[11px] text-text-muted ml-1">sandbox:init</span>
        </div>
        <div className="font-mono text-[13px] text-text flex items-center gap-1.5">
          <span className="text-accent-cyan font-bold">$</span>
          <span className="text-text-muted">env --distro=</span>
          <span className="text-accent-cyan font-semibold">{selected}</span>
          <span className="inline-block w-1.5 h-3.5 bg-accent-cyan ml-0.5" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center w-full gap-2 mt-auto">
        <button
          onClick={() => submit(selected)}
          disabled={booting}
          className="w-full h-12 rounded-btn bg-accent-cyan text-[#001f25] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[44px]"
        >
          <span>{booting ? `Booting ${selected}…` : 'Start Learning'}</span>
          {!booting && <ArrowRight size={18} />}
        </button>
        <button
          onClick={() => submit('ubuntu')}
          className="h-11 px-4 flex items-center justify-center text-sm text-text-muted hover:text-text min-h-[44px]"
        >
          Skip for now
        </button>
      </div>
    </main>
  );
}
