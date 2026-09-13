import BottomNav from '../components/ui/BottomNav';
import { useUserStore } from '../store/userStore';

export default function Stats() {
  const { xp, streak, distro } = useUserStore();
  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24 flex flex-col gap-4">
      <h1 className="font-semibold text-lg">Terminal Profile</h1>
      <section className="bg-surface rounded-card p-4">
        <p className="font-mono text-accent-cyan">root@hacker</p>
        <p className="text-sm text-text-muted">
          {xp} XP • {streak} day streak • {distro ?? 'no distro yet'}
        </p>
      </section>
      <p className="text-sm text-text-muted">
        Streak calendar, badges, mastery ring land in step 7.
      </p>
      <BottomNav />
    </main>
  );
}
