import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { VirtualFS, resolvePath } from '../lib/vfs';
import { executeLine } from '../lib/commands';

export interface TerminalHandle {
  reset: () => void;
  getSnapshot: () => Record<string, unknown>;
  getLastCommand: () => string;
  getHistory: () => string[];
  getModes: () => Record<string, string>;
  getOutputBuffer: () => string;
  getCwd: () => string;
  insertText: (t: string) => void;
}

interface Props {
  startingFS: Record<string, unknown>;
  startingCwd?: string;
  distro: string | null;
  onExecute?: (info: { command: string; output: string; cwd: string }) => void;
}

const PROMPT_USER = '\x1b[1muser@linuxquest\x1b[0m:\x1b[90m~\x1b[0m\x1b[1m$\x1b[0m ';

const Terminal = forwardRef<TerminalHandle, Props>(function Terminal(
  { startingFS, startingCwd = '/home/user', distro, onExecute },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const termRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitRef = useRef<any>(null);
  const vfsRef = useRef(new VirtualFS(startingFS));
  const cwdRef = useRef(startingCwd);
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef(-1);
  const lineRef = useRef('');
  const lastCmdRef = useRef('');
  const outputRef = useRef('');
  const onExecuteRef = useRef(onExecute);
  onExecuteRef.current = onExecute;
  const distroRef = useRef(distro);
  distroRef.current = distro;

  const writePrompt = () => {
    termRef.current?.write('\r\n' + PROMPT_USER);
  };

  const doReset = () => {
    vfsRef.current.reset(startingFS);
    cwdRef.current = startingCwd;
    historyRef.current = [];
    histIdxRef.current = -1;
    lineRef.current = '';
    lastCmdRef.current = '';
    outputRef.current = '';
    const t = termRef.current;
    if (t) {
      t.clear();
      t.writeln('\x1b[90mLinuxQuest sandbox — type commands below.\x1b[0m');
      t.write(PROMPT_USER);
    }
  };

  useImperativeHandle(ref, () => ({
    reset: doReset,
    getSnapshot: () => vfsRef.current.snapshot(),
    getLastCommand: () => lastCmdRef.current,
    getHistory: () => [...historyRef.current],
    getModes: () => vfsRef.current.modes(),
    getOutputBuffer: () => outputRef.current,
    getCwd: () => cwdRef.current,
    insertText: (t: string) => {
      lineRef.current += t;
      termRef.current?.write(t);
    },
  }));

  // Re-seed when lesson changes
  const seedKey = JSON.stringify(startingFS) + '|' + startingCwd;
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    doReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const term = new XTerm({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.6,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: '#0A0E14',
        foreground: '#E6EDF3',
        cursor: '#E6EDF3',
        selectionBackground: 'rgba(230,237,243,0.3)',
        black: '#0A0E14',
        cyan: '#22D3EE',
        magenta: '#E879F9',
        green: '#3FB950',
        yellow: '#D29922',
        red: '#F85149',
      },
      allowTransparency: false,
      scrollback: 500,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    // Fit after paint + on resize
    requestAnimationFrame(() => {
      try { fit.fit(); } catch { /* noop */ }
    });
    const onResize = () => {
      try { fit.fit(); } catch { /* noop */ }
    };
    window.addEventListener('resize', onResize);
    termRef.current = term;
    fitRef.current = fit;
    vfsRef.current = new VirtualFS(startingFS);
    cwdRef.current = startingCwd;

    term.writeln('\x1b[90mLinuxQuest sandbox — type commands below.\x1b[0m');
    term.write(PROMPT_USER);
    term.focus();

    const setLine = (s: string) => {
      // redraw current input line
      const t = termRef.current;
      if (!t) return;
      // clear current line content after prompt: move cursor, erase
      t.write('\x1b[2K\r' + PROMPT_USER + s);
      lineRef.current = s;
    };

    term.onKey(({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
      const e = domEvent;
      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        term.clear();
        term.write(PROMPT_USER + lineRef.current);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const line = lineRef.current;
        term.write('\r\n');
        if (line.trim() !== '') {
          historyRef.current.push(line);
        }
        histIdxRef.current = historyRef.current.length;
        lastCmdRef.current = line;
        lineRef.current = '';
        const hist = historyRef.current;
        const res = executeLine(line, {
          vfs: vfsRef.current,
          cwd: cwdRef.current,
          setCwd: (p) => { cwdRef.current = p; },
          history: [...hist],
          distro: distroRef.current,
        });
        if (res.clear) {
          term.clear();
          term.write(PROMPT_USER);
          return;
        }
        cwdRef.current = res.newCwd;
        if (res.output) {
          // sanitize: xterm handles \n; ensure \r\n
          term.write(res.output.replace(/\n/g, '\r\n'));
          outputRef.current += res.output;
          if (outputRef.current.length > 20000) {
            outputRef.current = outputRef.current.slice(-20000);
          }
        }
        term.write(PROMPT_USER);
        onExecuteRef.current?.({ command: line, output: res.output, cwd: cwdRef.current });
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyRef.current.length && histIdxRef.current > 0) {
          histIdxRef.current -= 1;
          setLine(historyRef.current[histIdxRef.current] ?? '');
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdxRef.current < historyRef.current.length - 1) {
          histIdxRef.current += 1;
          setLine(historyRef.current[histIdxRef.current] ?? '');
        } else {
          histIdxRef.current = historyRef.current.length;
          setLine('');
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        // basic completion: files in cwd matching current token
        const parts = lineRef.current.split(/\s+/);
        const frag = parts[parts.length - 1] ?? '';
        const dirPart = frag.includes('/') ? frag.slice(0, frag.lastIndexOf('/') + 1) : '';
        const base = frag.includes('/') ? frag.slice(frag.lastIndexOf('/') + 1) : frag;
        const dirAbs = resolvePath(cwdRef.current, dirPart || '.');
        const entries = vfsRef.current.listDir(dirAbs) ?? [];
        const match = entries.find((n) => n.startsWith(base));
        if (match) {
          const completion = match.slice(base.length);
          lineRef.current += completion;
          term.write(completion);
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        lineRef.current += key;
        term.write(key);
      }
      void setLine;
    });

    // Tap terminal to focus (mobile keyboard)
    const focus = () => term.focus();
    el.addEventListener('click', focus);

    return () => {
      window.removeEventListener('resize', onResize);
      el.removeEventListener('click', focus);
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[220px] bg-terminal text-left"
      onClick={() => termRef.current?.focus()}
    />
  );
});

export default Terminal;
