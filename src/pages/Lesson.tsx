import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Flame, Lightbulb, RotateCcw, Check, Zap, ArrowRight, Lock } from 'lucide-react';
import Terminal, { type TerminalHandle } from '../components/Terminal';
import BottomNav from '../components/ui/BottomNav';
import { LESSONS, lessonById, nextLesson } from '../data/lessons';
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
  const [revealed, setRevealed] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [fails, setFails] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [earned, setEarned] = useState(0);
  const [leveled, setLeveled] = useState(false);
  const [streakStarted, setStreakStarted] = useState(false);

  const distro = useUserStore((s) => s.distro);
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const addXp = useUserStore((s) => s.addXp);
  const bumpCompleted = useUserStore((s) => s.completeLesson);
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const unlockedNodes = useProgressStore((s) => s.unlockedNodes);

  const next = useMemo(() => (lesson ? nextLesson(lesson.id) : undefined), [lesson]);

  if (!lesson) {
    return (
      <main className="min-h-dvh max-w-app mx-auto px-4 pt-6 pb-24">
        <p className="text-sm text-text-muted">Lesson not found.</p>
        <Link to="/" className="text-text text-sm">← Back to Hub</Link>
        <BottomNav />
      </main>
    );
  }

  if (!unlockedNodes.includes(lesson.nodeId)) {
    return (
      <main className="min-h-dvh max-w-app mx-auto px-4 pt-20 pb-24 flex flex-col items-center text-center gap-3">
        <Lock size={28} className="text-text-muted" />
        <h1 className="font-semibold text-lg">{lesson.title} is locked</h1>
        <p className="text-sm text-text-muted">
          Finish the earlier lessons to unlock it. Your current quest is waiting on the Hub.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 w-full min-h-[44px] rounded-btn bg-text text-bg font-bold"
        >
          Back to Hub
        </button>
        <button
          onClick={() => navigate('/tree')}
          className="w-full min-h-[44px] rounded-btn border border-border text-text"
        >
          View Skill Tree
        </button>
        <BottomNav />
      </main>
    );
  }

  const alreadyDone = completedLessons.includes(lesson.id);
  const hintsUsed = solutionShown ? lesson.hints.length : revealed;
  const solutionCmd =
    lesson.expected.command ?? lesson.expected.commandAlt?.[0] ?? '(see hints)';

  const openHints = () => {
    setHintOpen(true);
    setRevealed((r) => (r === 0 ? 1 : r));
  };

  const revealSolution = () => {
    setSolutionShown(true);
    setHintOpen(true);
    setRevealed(lesson.hints.length);
  };

  const handleCheck = () => {
    const last = termRef.current?.getLastCommand() ?? '';
    const out = termRef.current?.getOutputBuffer() ?? '';
    const snap = termRef.current?.getSnapshot() ?? {};
    const res = validate(lesson, last, out, snap);
    if (res.pass) {
      if (!passed) {
        if (alreadyDone) {
          setEarned(0);
        } else {
          const gain = lessonXp(hintsUsed, lesson.xp);
          const before = levelForXp(xp);
          const wasFresh = streak === 0;
          addXp(gain);
          bumpCompleted();
          setEarned(gain);
          setLeveled(levelForXp(xp + gain) > before);
          setStreakStarted(wasFresh);
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
      }
      setPassed(true);
      setFeedback(null);
      setFails(0);
    } else {
      setFails((f) => f + 1);
      setFeedback(res.reason);
    }
  };

  const handleReset = () => {
    termRef.current?.reset();
    setPassed(false);
    setFeedback(null);
    setFails(0);
  };

  return (
    <main className="min-h-dvh max-w-app mx-auto px-3 pt-16 pb-32 flex flex-col gap-3 bg-bg">
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
            <span className="font-mono text-sm font-bold text-text truncate">
              {lesson.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 border border-border px-2 py-1 rounded-full">
              <Flame size={14} className={streak > 0 ? 'text-track-sysadmin' : 'text-text-muted'} />
              <span className="font-mono text-[11px] font-bold">{streak}</span>
            </span>
            <span className="flex items-center gap-1 border border-border px-2 py-1 rounded-full">
              <Zap size={13} />
              <span className="font-mono text-[11px] font-bold">+{lesson.xp} XP</span>
            </span>
          </div>
        </div>
      </section>

      {/* Prompt + concept card */}
      <section className="w-full bg-surface border border-border rounded-xl p-3 mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-text-muted">
            Lesson {lesson.index} of {LESSONS.length}
            {alreadyDone && ' • Practice'}
          </span>
          <span className="text-[11px] text-text-muted">~2m</span>
        </div>
        <p className="text-[15px] leading-snug font-medium mb-2">{lesson.prompt}</p>
        <p className="text-[13px] text-text-muted leading-snug mb-2">{lesson.concept}</p>
        <div className="font-mono text-[13px] bg-terminal border border-border rounded px-2.5 py-2 text-text">
          <span className="text-text-muted select-none">$ </span>{lesson.example}
        </div>
        {hintOpen && (
          <div className="mt-2 p-2.5 bg-surface-high border border-border rounded-lg text-sm">
            <p className="text-xs mb-1 flex items-center gap-1 font-semibold">
              <Lightbulb size={14} /> Hints ({hintsUsed} used · −5 XP each)
            </p>
            {lesson.hints.slice(0, Math.max(1, revealed)).map((h, i) => (
              <p key={i} className="text-sm text-text">
                {i + 1}. {h}
              </p>
            ))}
            {revealed < lesson.hints.length && (
              <button
                onClick={() => setRevealed((r) => r + 1)}
                className="mt-1.5 text-xs font-semibold underline underline-offset-2 min-h-[44px]"
              >
                Need another hint? (−5 XP)
              </button>
            )}
            {!solutionShown && (
              <button
                onClick={revealSolution}
                className="block mt-1 text-xs text-text-muted underline underline-offset-2 min-h-[44px]"
              >
                I'm stuck — reveal the solution (min XP)
              </button>
            )}
            {solutionShown && (
              <p className="mt-1.5 font-mono text-[13px] bg-terminal border border-border rounded px-2 py-1.5">
                <span className="text-text-muted">$ </span>{solutionCmd}
              </p>
            )}
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
            onExecute={() => setFeedback(null)}
          />
        </div>
        <div className="px-3 py-2 bg-surface-container flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-border">
          <span className="font-mono text-[11px] text-text-muted pr-1 shrink-0">Keys:</span>
          {lesson.chips.map((c) => (
            <button
              key={c}
              onClick={() => termRef.current?.insertText(c.startsWith('|') ? ' | grep ' : ` ${c.trim()} `)}
              className="bg-surface-highest border border-border px-2.5 py-1 rounded font-mono text-[11px] font-bold text-text shrink-0 min-h-[32px]"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {feedback && (
        <div className="text-xs bg-surface border border-border rounded-lg p-2.5">
          <p className="text-state-warning">{feedback}</p>
          {fails >= 2 && !hintOpen && (
            <button onClick={openHints} className="mt-1 font-semibold underline underline-offset-2 min-h-[44px]">
              Stuck? Open a hint (−5 XP)
            </button>
          )}
        </div>
      )}

      {passed && (
        <div className="flex flex-col items-center gap-2 p-4 bg-surface border border-border rounded-xl text-center">
          <div className="w-12 h-12 rounded-full bg-state-success/15 text-state-success flex items-center justify-center">
            <Check size={28} />
          </div>
          <h3 className="font-bold">{alreadyDone && earned === 0 ? 'Practice complete' : 'Challenge Solved!'}</h3>
          <p className="text-sm text-text-muted">
            {earned > 0 ? `+${earned} XP` : 'No XP — practice run'}
            {leveled && ' • Level up!'}
            {streakStarted && ' • Streak started!'}
          </p>
          <p className="text-[13px] border-t border-border pt-2 w-full">{lesson.takeaway}</p>
          {next ? (
            <button
              onClick={() => navigate(`/lesson/${next.id}`)}
              className="w-full min-h-[44px] rounded-btn bg-text text-bg font-bold flex items-center justify-center gap-2"
            >
              Next: {next.title} <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/tree')}
              className="w-full min-h-[44px] rounded-btn bg-text text-bg font-bold"
            >
              View Skill Tree
            </button>
          )}
        </div>
      )}

      {/* Action bar — docked bottom; tab bar hidden in lesson focus mode */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-bg border-t border-border pb-safe">
        <div className="max-w-app mx-auto px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => (hintOpen ? setHintOpen(false) : openHints())}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-surface-container border border-border text-text text-sm"
          >
            <Lightbulb size={16} /> Hint
          </button>
          <button
            onClick={handleReset}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-surface-container border border-border text-text text-sm"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            onClick={handleCheck}
            className="flex-[1.4] min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-text text-bg font-bold"
          >
            Check <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </footer>

    </main>
  );
}
