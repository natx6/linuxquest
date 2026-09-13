import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Flame, Lightbulb, RotateCcw, Check, Zap, ArrowRight } from 'lucide-react';
import Terminal, { type TerminalHandle } from '../components/Terminal';
import BottomNav from '../components/ui/BottomNav';
import { lessonById, nextLesson } from '../data/lessons';
import { TRACKS } from '../data/skillTree';
import { validate } from '../lib/validator';
import { lessonXp, levelForXp } from '../lib/xp';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';

export default function Lesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lesson = lessonById(id ?? '');
  const termRef = useRef<TerminalHandle>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [earned, setEarned] = useState(0);
  const [leveled, setLeveled] = useState(false);
  const [streakStarted, setStreakStarted] = useState(false);
  const [, forceTick] = useState(0);

  const distro = useUserStore((s) => s.distro);
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const addXp = useUserStore((s) => s.addXp);
  const bumpCompleted = useUserStore((s) => s.completeLesson);
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const completedLessons = useProgressStore((s) => s.completedLessons);

  const next = useMemo(() => (lesson ? nextLesson(lesson.id) : undefined), [lesson]);

  if (!lesson) {
    return (
      <main className="min-h-dvh max-w-app mx-auto px-4 pt-6 pb-24">
        <p className="text-sm text-text-muted">Lesson not found.</p>
        <Link to="/" className="text-accent-cyan text-sm">← Back to Hub</Link>
        <BottomNav />
      </main>
    );
  }

  const alreadyDone = completedLessons.includes(lesson.id);

  const showHint = () => {
    setHintOpen((v) => {
      if (!v) setHintsUsed((h) => h + 1);
      return !v;
    });
  };

  const handleCheck = () => {
    const last = termRef.current?.getLastCommand() ?? '';
    const out = termRef.current?.getOutputBuffer() ?? '';
    const snap = termRef.current?.getSnapshot() ?? {};
    const res = validate(lesson, last, out, snap);
    if (res.pass) {
      if (!passed) {
        const gain = alreadyDone ? 5 : lessonXp(hintsUsed, lesson.xp);
        const before = levelForXp(xp);
        const wasFresh = streak === 0;
        addXp(gain);
        bumpCompleted();
        setEarned(gain);
        setLeveled(levelForXp(xp + gain) > before);
        setStreakStarted(wasFresh);
        // unlocks: if node's lessons all done (including this), unlock node.unlocks
        const node = TRACKS.flatMap((t) => t.nodes).find((n) => n.id === lesson.nodeId);
        let unlocks: string[] = [];
        if (node) {
          const allDone = node.lessonIds.every(
            (l) => l === lesson.id || completedLessons.includes(l),
          );
          if (allDone) unlocks = node.unlocks;
        }
        completeLesson(lesson.id, next?.id, unlocks);
      }
      setPassed(true);
      setFeedback(null);
    } else {
      setFeedback(res.partial >= 0.4 ? `${res.reason} (+partial credit if you Check again after fixing)` : res.reason);
    }
    forceTick((x) => x + 1);
  };

  const handleReset = () => {
    termRef.current?.reset();
    setPassed(false);
    setFeedback(null);
  };

  const chips = ['-la', '-a', '-l', '~', '| grep '];

  return (
    <main className="min-h-dvh max-w-app mx-auto px-3 pt-16 pb-40 flex flex-col gap-3 bg-bg">
      {/* Top bar */}
      <section className="fixed top-0 inset-x-0 z-30 bg-surface border-b border-border">
        <div className="max-w-app mx-auto h-14 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <button
              aria-label="Back"
              onClick={() => navigate('/')}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-text hover:bg-surface-high min-w-[44px]"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="w-2 h-2 rounded-full bg-track-basics shrink-0" />
            <span className="text-sm text-text truncate">{lesson.track}</span>
            <span className="text-text-muted text-xs">›</span>
            <span className="font-mono text-sm font-bold text-accent-cyan truncate">
              {lesson.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 bg-surface-high px-2 py-1 rounded-full text-track-sysadmin">
              <Flame size={14} />
              <span className="font-mono text-[11px] font-bold">{streak}</span>
            </span>
            <span className="flex items-center gap-1 bg-surface-high px-2 py-1 rounded-full text-accent-cyan">
              <Zap size={13} />
              <span className="font-mono text-[11px] font-bold">+{lesson.xp} XP</span>
            </span>
          </div>
        </div>
      </section>

      {/* Prompt card */}
      <section className="w-full bg-surface border border-border rounded-xl p-3 mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-accent-cyan">
            Lesson {lesson.index} of 10
          </span>
          <span className="text-[11px] text-text-muted">~2m</span>
        </div>
        <p className="text-[15px] leading-snug font-medium">{lesson.prompt}</p>
        {hintOpen && (
          <div className="mt-2 p-2.5 bg-surface-high rounded-lg text-sm">
            <p className="text-state-warning font-semibold text-xs mb-1 flex items-center gap-1">
              <Lightbulb size={14} /> Hint {hintsUsed}
            </p>
            {lesson.hints.map((h, i) => (
              <p key={i} className={`text-sm ${i < hintsUsed ? 'text-text' : 'text-text-muted blur-[1px] select-none'}`}>
                {i + 1}. {h}
              </p>
            ))}
            <p className="text-[11px] text-text-muted mt-1">Each hint −5 XP (min 5 XP).</p>
          </div>
        )}
      </section>

      {/* Terminal */}
      <section className="w-full bg-terminal rounded-card border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] select-none border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-state-error/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-state-warning/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-state-success/70" />
          </div>
          <span className="font-mono text-[11px] text-text-muted">user@linuxquest: ~</span>
          <span className="w-6" />
        </div>
        <div className="p-3 h-[300px]">
          <Terminal
            ref={termRef}
            startingFS={lesson.startingFS}
            startingCwd={lesson.startingCwd}
            distro={distro}
            onExecute={() => {
              setFeedback(null);
              forceTick((x) => x + 1);
            }}
          />
        </div>
        <div className="px-3 py-2 bg-surface-container flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="font-mono text-[11px] text-text-muted pr-1 shrink-0">Keys:</span>
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => termRef.current?.insertText(c.startsWith('|') ? ' | grep ' : ` ${c.trim()} `)}
              className="bg-surface-highest px-2.5 py-1 rounded font-mono text-[11px] font-bold text-accent-cyan shrink-0 min-h-[32px]"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {feedback && (
        <p className="text-xs text-state-warning bg-surface-low rounded-lg p-2.5">{feedback}</p>
      )}

      {passed && (
        <div className="flex flex-col items-center gap-2 p-4 bg-surface-high rounded-xl text-center">
          <div className="w-12 h-12 rounded-full bg-state-success/20 text-state-success flex items-center justify-center">
            <Check size={28} />
          </div>
          <h3 className="font-bold">Challenge Solved!</h3>
          <p className="text-sm text-text-muted">+{earned} XP {leveled && '• Level up!'}{streakStarted && ' • Streak started!'}</p>
          {next ? (
            <button
              onClick={() => navigate(`/lesson/${next.id}`)}
              className="w-full min-h-[44px] rounded-btn bg-accent-cyan text-[#001f25] font-bold flex items-center justify-center gap-2"
            >
              Next: {next.title} <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/tree')}
              className="w-full min-h-[44px] rounded-btn bg-accent-cyan text-[#001f25] font-bold"
            >
              View Skill Tree
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <footer className="fixed bottom-14 inset-x-0 z-30 bg-bg border-t border-border">
        <div className="max-w-app mx-auto px-3 py-2 flex items-center gap-2">
          <button
            onClick={showHint}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-surface-container text-text text-sm"
          >
            <Lightbulb size={16} className="text-state-warning" /> Hint
          </button>
          <button
            onClick={handleReset}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-surface-container text-text text-sm"
          >
            <RotateCcw size={16} className="text-text-muted" /> Reset
          </button>
          <button
            onClick={handleCheck}
            className="flex-[1.4] min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-accent-cyan text-[#001f25] font-bold"
          >
            Check <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </footer>

      <BottomNav />
    </main>
  );
}
