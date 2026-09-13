import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Zap, ChevronRight, Download, X } from 'lucide-react';
import BottomNav from '../components/ui/BottomNav';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';
import { lessonById } from '../data/lessons';
import { TRACKS, trackProgress } from '../data/skillTree';
import { progressToNextLevel, titleForLevel } from '../lib/xp';
import { get, set } from '../lib/storage';

function InstallBanner({ doneCount }: { doneCount: number }) {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<Event | null>(null);

  useEffect(() => {
    if (doneCount < 3 || get('install-dismissed', false)) return;
    setVisible(true);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [doneCount]);

  if (!visible) return null;
  return (
    <div className="w-full bg-surface-high border border-accent-cyan/40 rounded-card p-3 flex items-center gap-3">
      <Download size={20} className="text-accent-cyan shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install LinuxQuest</p>
        <p className="text-xs text-text-muted">Offline lessons, fullscreen terminal.</p>
      </div>
      <button
        className="min-h-[44px] px-3 rounded-btn bg-accent-cyan text-[#001f25] text-sm font-bold"
        onClick={async () => {
          const d = deferred as unknown as { prompt?: () => void };
          d?.prompt?.();
          setVisible(false);
          set('install-dismissed', true);
        }}
      >
        Install
      </button>
      <button
        aria-label="Dismiss"
        className="w-11 h-11 flex items-center justify-center text-text-muted"
        onClick={() => {
          setVisible(false);
          set('install-dismissed', true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function Hub() {
  const { xp, streak, distro } = useUserStore();
  const { currentLessonId, completedLessons } = useProgressStore();
  const prog = progressToNextLevel(xp);
  const current = lessonById(currentLessonId);

  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24 flex flex-col gap-4">
      <section className="flex items-center justify-between pt-2">
        <div className="min-w-0">
          <h1 className="font-semibold text-lg tracking-tight truncate">Welcome back, hacker</h1>
          <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-track-basics animate-pulse" />
            <span className="capitalize">{distro ?? 'Linux'} • Daily streak active</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-high px-3 py-1.5 rounded-full shrink-0 min-h-[44px]">
          <Flame size={18} className="text-track-sysadmin" />
          <span className="font-mono text-xs text-track-sysadmin font-bold">{streak} days</span>
        </div>
      </section>

      <InstallBanner doneCount={completedLessons.length} />

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-accent-magenta text-[#570067] px-2.5 py-0.5 rounded-full font-mono text-[11px] uppercase shrink-0">
              Level {prog.level}
            </span>
            <span className="font-semibold truncate">{titleForLevel(prog.level)}</span>
          </div>
          <span className="font-mono text-xs text-text-muted shrink-0">
            {prog.current} / {prog.needed} XP
          </span>
        </div>
        <ProgressBar value={prog.current} max={prog.needed} />
        <p className="mt-2 text-xs text-text-muted">
          {prog.needed - prog.current} XP to Level {prog.level + 1} ({titleForLevel(prog.level + 1)})
        </p>
      </Card>

      <Card>
        <p className="font-mono text-[11px] uppercase text-accent-cyan mb-1">Current quest</p>
        <h2 className="font-semibold mb-1">
          {current ? `Lesson ${current.index}: ${current.title}` : 'All basics complete'}
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {current ? current.prompt : 'You finished the Basics track. Explore the skill tree.'}
        </p>
        {current && (
          <Link
            to={`/lesson/${current.id}`}
            className="w-full h-11 bg-accent-cyan text-[#001f25] font-semibold rounded-btn flex items-center justify-center gap-2 min-h-[44px]"
          >
            Resume <ChevronRight size={18} />
          </Link>
        )}
      </Card>

      <Card className="!border !border-accent-magenta/30">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} className="text-accent-magenta" />
          <h3 className="font-semibold">Daily Challenge</h3>
        </div>
        <p className="text-sm text-text-muted mb-3">
          Speed run: chain <code className="font-mono text-accent-magenta">ls | grep</code> in under
          30s for +50 XP.
        </p>
        <Link
          to="/lesson/basics.pipes"
          className="w-full h-11 bg-surface-high text-accent-magenta font-semibold rounded-btn flex items-center justify-center min-h-[44px]"
        >
          Accept Challenge
        </Link>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Your Tracks</h3>
          <span className="text-xs text-text-muted">4 Available</span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {TRACKS.map((t) => {
            const p = trackProgress(t, completedLessons);
            return (
              <Link
                key={t.id}
                to="/tree"
                className="min-w-[200px] w-[200px] bg-surface-container rounded-card p-3.5 shrink-0 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: t.color }} />
                <p className="font-semibold text-sm mb-0.5">{t.name}</p>
                <p className="text-xs text-text-muted">
                  {p.done}/{p.total} completed • {p.pct}%
                </p>
                <div className="mt-3 w-full bg-terminal h-1.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: t.color }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
