import { useNavigate } from 'react-router-dom';
import { Flame, Check, Lock, Settings } from 'lucide-react';
import BottomNav from '../components/ui/BottomNav';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';
import { progressToNextLevel, titleForLevel } from '../lib/xp';
import { LESSONS } from '../data/lessons';

const BADGES = [
  { id: 'first', name: 'First Steps', desc: 'Complete pwd', need: ['basics.pwd'], icon: 'shield' },
  { id: 'explorer', name: 'Explorer', desc: 'Complete 3 lessons', needCount: 3, icon: 'folder' },
  { id: 'builder', name: 'Builder', desc: 'Create files', need: ['basics.mkdir-touch'], icon: 'hammer' },
  { id: 'searcher', name: 'Grep Pro', desc: 'Master grep', need: ['basics.grep'], icon: 'search' },
  { id: 'piper', name: 'Pipe Master', desc: 'Chain commands', need: ['basics.pipes'], icon: 'spline' },
  { id: 'finisher', name: 'Basics Hero', desc: 'Finish Basics', needCount: LESSONS.length, icon: 'trophy' },
];

const COMMANDS_PER_LESSON: Record<string, number> = {
  'basics.pwd': 1, 'basics.ls': 1, 'basics.ls-a': 1, 'hidden.prove': 1,
  'basics.cd': 1, 'moving.prove': 1, 'basics.cat': 1,
  'basics.mkdir-touch': 2, 'creating.prove': 2, 'basics.cp-mv': 2,
  'basics.rm': 1, 'basics.grep': 1, 'basics.pipes': 2, 'chaining.prove': 2, 'reading.chain': 1, 'organizing.chain': 1, 'chaining.capstone': 1, 'permissions.drill': 1, 'permissions.prove': 1, 'output.drill': 1, 'output.prove': 1, 'manual.drill': 1, 'logs.drill': 1, 'logs.prove': 1, 'ps.drill': 1, 'ps.prove': 1, 'svc.drill': 1, 'svc.prove': 1, 'cron.drill': 1, 'cron.prove': 1, 'git.drill': 1, 'git.prove': 1, 'text.drill': 1, 'text.prove': 1, 'finding.drill': 1, 'finding.prove': 1, 'streams.drill': 1, 'streams.prove': 1, 'reach.drill': 1, 'reach.prove': 1, 'sockets.drill': 1, 'sockets.prove': 1, 'ssh.drill': 1, 'ssh.prove': 1, 'firewall.drill': 1, 'firewall.prove': 1,
};
const COMMAND_TOTAL = Object.values(COMMANDS_PER_LESSON).reduce((a, n) => a + n, 0);

function activityLevel(seed: number): number {
  // deterministic 0..3 pseudo-activity
  const x = Math.sin(seed * 999) * 10000;
  const f = x - Math.floor(x);
  return f > 0.8 ? 3 : f > 0.55 ? 2 : f > 0.3 ? 1 : 0;
}

export default function Stats() {
  const navigate = useNavigate();
  const { xp, streak, distro } = useUserStore();
  const { completedLessons } = useProgressStore();
  const prog = progressToNextLevel(xp);

  const mastered = Object.entries(COMMANDS_PER_LESSON)
    .filter(([id]) => completedLessons.includes(id))
    .reduce((a, [, n]) => a + n, 0);
  const ringPct = Math.min(100, (mastered / COMMAND_TOTAL) * 100);
  const circ = 2 * Math.PI * 40;

  const badgeEarned = (b: (typeof BADGES)[number]) => {
    if (b.need) return b.need.every((l) => completedLessons.includes(l));
    if (b.needCount) return completedLessons.length >= b.needCount;
    return false;
  };

  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24 flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-semibold text-lg tracking-tight">Terminal Profile</h1>
        <button
          aria-label="Settings"
          onClick={() => navigate('/onboarding')}
          className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-text-muted min-w-[44px]"
        >
          <Settings size={20} />
        </button>
      </div>

      <section className="w-full bg-surface rounded-card p-4 border border-border relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-lg bg-terminal flex items-center justify-center font-mono font-bold text-track-basics">
              $_
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-state-success rounded-full ring-2 ring-surface" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-accent-cyan truncate">root@hacker</p>
            <p className="text-xs text-text-muted mt-0.5">Level {prog.level} • {titleForLevel(prog.level)}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-surface-high border border-border">
              <span className="w-2 h-2 rounded-full bg-track-basics" />
              <span className="font-mono text-[11px] text-accent-cyan">{xp} XP total</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 bg-surface-low/60 rounded-lg p-2.5">
          <div>
            <p className="text-[11px] text-text-muted">To next level</p>
            <p className="font-mono font-bold">{prog.needed - prog.current} XP</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted">Streak</p>
            <p className="font-mono font-bold flex items-center gap-1">
              <Flame size={15} className="text-track-sysadmin" /> {streak} days
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface rounded-card p-4 border border-border">
        <h2 className="font-semibold">Terminal Activity</h2>
        <p className="text-xs text-text-muted mb-3">
          {completedLessons.length === 0
            ? 'Complete your first lesson to light up the grid'
            : `${completedLessons.length * 6} commands this month`}
        </p>
        <div className="bg-terminal p-3 rounded-lg flex gap-2 overflow-x-auto no-scrollbar border border-border">
          {Array.from({ length: 30 }).map((_, i) => {
            const lvl = completedLessons.length === 0 ? 0 : activityLevel(i + completedLessons.length * 7);
            const bg = lvl === 0 ? '#1c2026' : lvl === 1 ? 'rgba(34,211,238,0.25)' : lvl === 2 ? 'rgba(34,211,238,0.5)' : '#22D3EE';
            return <span key={i} title={`${lvl} activity`} className="w-4 h-4 rounded-sm shrink-0" style={{ background: bg }} />;
          })}
        </div>
      </section>

      <section className="w-full bg-surface rounded-card p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Command Mastery</h2>
          <span className="font-mono text-xs font-bold text-track-basics">{Math.round(ringPct)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1c2026" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="transparent" stroke="#22D3EE"
                strokeDasharray={circ} strokeDashoffset={circ - (circ * ringPct) / 100}
                strokeLinecap="round" strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-[15px]">{mastered}/{COMMAND_TOTAL}</span>
              <span className="text-[10px] text-text-muted uppercase">Mastered</span>
            </div>
          </div>
          <div className="flex-1 text-xs space-y-2">
            <p>Core utilities <span className="font-mono text-track-basics">{Math.min(mastered, 10)}/10</span></p>
            <p>Pipes & streams <span className="font-mono text-text">{completedLessons.includes('basics.pipes') ? '2/8' : '0/8'}</span></p>
            <p>Search <span className="font-mono text-track-network">{completedLessons.includes('basics.grep') ? '1/12' : '0/12'}</span></p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Badges ({BADGES.filter(badgeEarned).length}/{BADGES.length})</h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const earned = badgeEarned(b);
            return (
              <div key={b.id} className={`rounded-card p-3 ${earned ? 'bg-surface' : 'bg-surface-low opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-accent-cyan">{b.icon.slice(0, 2).toUpperCase()}</span>
                  {earned ? <Check size={16} className="text-track-basics" /> : <Lock size={16} className="text-text-muted" />}
                </div>
                <p className="font-mono text-xs font-bold">{b.name}</p>
                <p className="text-[11px] text-text-muted">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="w-full bg-surface rounded-card p-4 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-text-muted">Active distro</p>
            <p className="font-mono font-bold capitalize">{distro ?? 'none'}</p>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="min-h-[44px] px-4 rounded-btn bg-surface-high text-accent-cyan font-mono text-xs"
          >
            Switch ›
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
