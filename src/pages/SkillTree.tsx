import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Play } from 'lucide-react';
import BottomNav from '../components/ui/BottomNav';
import BottomSheet from '../components/ui/BottomSheet';
import SkillNode from '../components/SkillNode';
import TrackRow from '../components/TrackRow';
import { TRACKS, nodeState, trackProgress, type SkillNode as Node } from '../data/skillTree';
import { lessonById } from '../data/lessons';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';
import { progressToNextLevel } from '../lib/xp';

export default function SkillTree() {
  const navigate = useNavigate();
  const { xp, streak, distro } = useUserStore();
  const { unlockedNodes, completedLessons } = useProgressStore();
  const [selected, setSelected] = useState<Node | null>(null);
  const prog = progressToNextLevel(xp);

  const startNode = (node: Node) => {
    const nextLesson = node.lessonIds.find((l) => !completedLessons.includes(l)) ?? node.lessonIds[0];
    if (nextLesson && lessonById(nextLesson)) navigate(`/lesson/${nextLesson}`);
    setSelected(null);
  };

  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-16 pb-32 bg-bg">
      <header className="fixed top-0 inset-x-0 z-30 bg-surface border-b border-border">
        <div className="max-w-app mx-auto h-14 px-4 flex items-center justify-between">
          <h1 className="font-semibold">Skill Tree</h1>
          <span className="flex items-center gap-1 bg-surface-high px-2.5 py-1 rounded-full text-track-sysadmin">
            <Flame size={15} /> <span className="font-mono text-xs font-bold">{streak}</span>
          </span>
        </div>
      </header>

      <section className="bg-surface border border-border p-3 rounded-xl flex items-center justify-between mb-4">
        <p className="font-mono text-xs">
          Lvl {prog.level} • {xp} XP <span className="text-text-muted">• {distro}</span>
        </p>
        <div className="flex gap-1">
          {TRACKS.map((t) => (
            <span key={t.id} className="w-2 h-2 rounded-full" style={{ background: t.color }} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-4">
        {TRACKS.map((t) => {
          const p = trackProgress(t, completedLessons);
          return (
            <TrackRow
              key={t.id}
              color={t.color}
              name={t.name}
              subtitle={t.subtitle}
              pct={p.pct}
              done={p.done}
              total={p.total}
            >
              {t.nodes.map((n) => (
                <SkillNode
                  key={n.id}
                  node={n}
                  trackColor={t.color}
                  state={nodeState(n, unlockedNodes, completedLessons)}
                  onTap={() => setSelected(n)}
                />
              ))}
            </TrackRow>
          );
        })}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase text-accent-cyan">
                  {selected.trackId} track
                </p>
                <h2 className="font-bold text-lg">Node: {selected.command}</h2>
                <p className="text-sm text-text-muted">{selected.title} • +{selected.xp} XP</p>
              </div>
            </div>
            <div className="bg-terminal p-2.5 rounded-lg font-mono text-xs space-y-1">
              {selected.lessonIds.length === 0 && (
                <p className="text-text-muted">Coming soon — finish Basics to unlock.</p>
              )}
              {selected.lessonIds.map((lid) => {
                const l = lessonById(lid);
                const done = completedLessons.includes(lid);
                return (
                  <div key={lid} className="flex items-center justify-between">
                    <span className={done ? 'text-state-success' : 'text-text'}>
                      {done ? '✓' : '○'} {l?.title ?? lid}
                    </span>
                    <span className="text-text-muted">{done ? 'Done' : `${l?.xp ?? 25} XP`}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => startNode(selected)}
              disabled={selected.lessonIds.length === 0}
              className="w-full h-12 bg-accent-cyan text-bg font-bold rounded-btn flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-40"
            >
              <Play size={18} /> {selected.lessonIds.length ? 'Start' : 'Locked'}
            </button>
          </>
        )}
      </BottomSheet>

      <BottomNav />
    </main>
  );
}
