import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import BottomNav from '../components/ui/BottomNav';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';

export default function Hub() {
  const { xp, streak, distro } = useUserStore();
  const { currentLessonId } = useProgressStore();
  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24 flex flex-col gap-4">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-semibold text-lg tracking-tight">Welcome back, hacker</h1>
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

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-accent-magenta text-[#570067] px-2.5 py-0.5 rounded-full font-mono text-[11px] uppercase">
              Level 3
            </span>
            <span className="font-semibold">Root Novice</span>
          </div>
          <span className="font-mono text-xs text-text-muted">{xp} / 500 XP</span>
        </div>
        <ProgressBar value={xp} max={500} />
        <p className="mt-2 text-xs text-text-muted">160 XP to Level 4 (Sudoer)</p>
      </Card>

      <Card>
        <p className="font-mono text-[11px] uppercase text-accent-cyan mb-1">Current quest</p>
        <h2 className="font-semibold mb-1">Lesson: {currentLessonId}</h2>
        <p className="text-sm text-text-muted mb-4">Basics track — resume where you left off.</p>
        <Link
          to={`/lesson/${currentLessonId}`}
          className="w-full h-11 bg-accent-cyan text-[#001f25] font-semibold rounded-btn flex items-center justify-center gap-2 min-h-[44px]"
        >
          Resume →
        </Link>
      </Card>

      <Card className="!border !border-accent-magenta/30">
        <h3 className="font-semibold mb-1">Daily Challenge</h3>
        <p className="text-sm text-text-muted mb-3">Speed run — full logic lands in step 6+.</p>
        <button className="w-full h-11 bg-surface-high text-accent-magenta font-semibold rounded-btn min-h-[44px]">
          Accept Challenge
        </button>
      </Card>

      <section>
        <h3 className="font-semibold mb-2">Your Tracks</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {(['basics', 'sysadmin', 'dev', 'network'] as const).map((t) => (
            <div key={t} className="min-w-[200px] bg-surface-container rounded-card p-3.5 shrink-0">
              <p className="font-semibold capitalize">{t}</p>
              <p className="text-xs text-text-muted">Track progress wires up in step 8.</p>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
