import { VirtualFS, resolvePath } from './vfs';

export interface ExecContext {
  vfs: VirtualFS;
  cwd: string;
  setCwd: (p: string) => void;
  history: string[];
  distro: string | null;
  stdin?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  clear?: boolean;
  newCwd?: string;
}

type Handler = (args: string[], ctx: ExecContext) => ExecResult;

/** Split combined short flags: -la -> { flags: Set(l,a), rest: [] } */
function parseFlags(args: string[]): { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const a of args) {
    if (a.startsWith('--')) {
      if (a === '--all') flags.add('a');
      else if (a === '--long') flags.add('l');
      else if (a === '--recursive') flags.add('r');
      else if (a === '--reverse') flags.add('r');
      else rest.push(a);
    } else if (a.startsWith('-') && a.length > 1 && !a.startsWith('--')) {
      for (const ch of a.slice(1)) flags.add(ch);
    } else rest.push(a);
  }
  return { flags, rest };
}

/** Tokenize respecting single/double quotes. */
function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = null;
      else cur += c;
    } else if (c === '"' || c === "'") q = c;
    else if (c === ' ' || c === '\t') {
      if (cur) { out.push(cur); cur = ''; }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function expandVars(tok: string): string {
  if (tok === '~') return '/home/user';
  if (tok === '$HOME') return '/home/user';
  if (tok === '$USER') return 'user';
  return tok;
}

const ok = (stdout = '', stderr = '', extra: Partial<ExecResult> = {}): ExecResult => ({
  stdout, stderr, exitCode: stderr ? 1 : 0, ...extra,
});

const handlers: Record<string, Handler> = {
  pwd: (_a, ctx) => ok(ctx.cwd + '\n'),
  whoami: () => ok('user\n'),
  history: (_a, ctx) => ok(ctx.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n') + (ctx.history.length ? '\n' : '')),

  ls: (args, ctx) => {
    const { flags, rest } = parseFlags(args);
    const target = rest[0] ?? '.';
    const p = resolvePath(ctx.cwd, target);
    const all = ctx.vfs.listDirAll(p);
    if (!all) return ok('', `ls: cannot access '${target}': No such file or directory\n`);
    const showAll = flags.has('a');
    const long = flags.has('l');
    const items = all.filter((e) => showAll || !e.name.startsWith('.'));
    if (long) {
      const lines = items.map((e) => {
        const isDir = e.node.type === 'dir';
        const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
        return `${perms} 1 user staff 64 Oct 24 14:00 ${e.name}${isDir ? '/' : ''}`;
      });
      return ok((lines.join('\n') + (lines.length ? '\n' : '')));
    }
    return ok(items.map((e) => e.name + (e.node.type === 'dir' ? '/' : '')).join('  ') + (items.length ? '\n' : ''));
  },

  cd: (args, ctx) => {
    const target = args[0] ?? '/home/user';
    const p = resolvePath(ctx.cwd, target);
    const node = ctx.vfs.getNode(p);
    if (!node) return ok('', `cd: no such file or directory: ${target}\n`);
    if (node.type !== 'dir') return ok('', `cd: not a directory: ${target}\n`);
    return ok('', '', { newCwd: p });
  },

  cat: (args, ctx) => {
    if (ctx.stdin && args.length === 0) return ok(ctx.stdin.endsWith('\n') ? ctx.stdin : ctx.stdin + '\n');
    if (args.length === 0) return ok('', 'cat: missing operand\n');
    let out = '';
    for (const a of args) {
      const p = resolvePath(ctx.cwd, a);
      const c = ctx.vfs.readFile(p);
      if (c === null) return ok(out, `cat: ${a}: No such file or directory\n`);
      out += c.endsWith('\n') ? c : c + '\n';
    }
    return ok(out);
  },

  echo: (args, ctx) => {
    // echo supports stdin passthrough? no — just join
    void ctx;
    const text = args.join(' ');
    return ok(text + '\n');
  },

  mkdir: (args, ctx) => {
    const { rest } = parseFlags(args);
    if (!rest.length) return ok('', 'mkdir: missing operand\n');
    for (const a of rest) {
      const p = resolvePath(ctx.cwd, a);
      if (ctx.vfs.getNode(p)) return ok('', `mkdir: cannot create directory ‘${a}’: File exists\n`);
      ctx.vfs.mkdir(p);
    }
    return ok('');
  },

  touch: (args, ctx) => {
    if (!args.length) return ok('', 'touch: missing file operand\n');
    for (const a of args) {
      const p = resolvePath(ctx.cwd, a);
      if (ctx.vfs.readFile(p) === null && !ctx.vfs.getNode(p)) ctx.vfs.writeFile(p, '');
    }
    return ok('');
  },

  rm: (args, ctx) => {
    const { flags, rest } = parseFlags(args);
    if (!rest.length) return ok('', 'rm: missing operand\n');
    const rec = flags.has('r') || flags.has('R');
    for (const a of rest) {
      const p = resolvePath(ctx.cwd, a);
      const node = ctx.vfs.getNode(p);
      if (!node) return ok('', `rm: cannot remove '${a}': No such file or directory\n`);
      if (node.type === 'dir' && !rec) return ok('', `rm: cannot remove '${a}': Is a directory\n`);
      ctx.vfs.remove(p, true);
    }
    return ok('');
  },

  cp: (args, ctx) => {
    const { rest } = parseFlags(args);
    if (rest.length < 2) return ok('', 'cp: missing destination file operand\n');
    const dest = rest[rest.length - 1];
    const srcs = rest.slice(0, -1);
    for (const s of srcs) {
      const sp = resolvePath(ctx.cwd, s);
      const node = ctx.vfs.getNode(sp);
      if (!node) return ok('', `cp: cannot stat '${s}': No such file or directory\n`);
      const dp = resolvePath(ctx.cwd, dest);
      const destNode = ctx.vfs.getNode(dp);
      if (node.type === 'file') {
        const target = destNode?.type === 'dir' ? dp + '/' + s.split('/').pop() : dp;
        ctx.vfs.writeFile(target!, node.content);
      } else {
        // dir copy: shallow recursive via snapshot
        const snap = JSON.stringify(node);
        const target = destNode?.type === 'dir' ? dp + '/' + s.split('/').pop() : dp;
        const [pp, nn] = [target!.slice(0, target!.lastIndexOf('/')) || '/', target!.slice(target!.lastIndexOf('/') + 1)];
        ctx.vfs.ensureDir(pp);
        const p = ctx.vfs.getNode(pp);
        if (p && p.type === 'dir') p.children[nn] = JSON.parse(snap);
      }
    }
    return ok('');
  },

  mv: (args, ctx) => {
    const { rest } = parseFlags(args);
    if (rest.length < 2) return ok('', 'mv: missing destination file operand\n');
    const dest = rest[rest.length - 1];
    const srcs = rest.slice(0, -1);
    for (const s of srcs) {
      const sp = resolvePath(ctx.cwd, s);
      const node = ctx.vfs.getNode(sp);
      if (!node) return ok('', `mv: cannot stat '${s}': No such file or directory\n`);
      const dp = resolvePath(ctx.cwd, dest);
      const destNode = ctx.vfs.getNode(dp);
      const target = destNode?.type === 'dir' ? dp + '/' + s.split('/').pop() : dp;
      const [pp, nn] = [target!.slice(0, target!.lastIndexOf('/')) || '/', target!.slice(target!.lastIndexOf('/') + 1)];
      ctx.vfs.ensureDir(pp);
      const p = ctx.vfs.getNode(pp);
      if (p && p.type === 'dir') {
        p.children[nn] = node;
        ctx.vfs.remove(sp, true);
      }
    }
    return ok('');
  },

  grep: (args, ctx) => {
    const { flags, rest } = parseFlags(args);
    if (!rest.length && !ctx.stdin) return ok('', 'grep: missing pattern\n');
    const insensitive = flags.has('i');
    const invert = flags.has('v');
    const pattern = rest[0] ?? '';
    const files = rest.slice(1);
    const match = (line: string) => {
      const hay = insensitive ? line.toLowerCase() : line;
      const needle = insensitive ? pattern.toLowerCase() : pattern;
      const found = hay.includes(needle);
      return invert ? !found : found;
    };
    let input = ctx.stdin ?? '';
    if (files.length) {
      input = '';
      for (const f of files) {
        const p = resolvePath(ctx.cwd, f);
        const c = ctx.vfs.readFile(p);
        if (c === null) return ok('', `grep: ${f}: No such file or directory\n`);
        input += c.endsWith('\n') ? c : c + '\n';
      }
    }
    const lines = input.split('\n');
    const out = lines.filter((l) => l !== '' && match(l));
    // keep trailing newline behavior
    return ok(out.length ? out.join('\n') + '\n' : '');
  },

  find: (args, ctx) => {
    const start = args[0] && !args[0].startsWith('-') ? resolvePath(ctx.cwd, args[0]) : ctx.cwd;
    const nameIdx = args.indexOf('-name');
    const pattern = nameIdx >= 0 ? (args[nameIdx + 1] ?? '').replace(/\*/g, '') : '';
    const results: string[] = [];
    const walk = (path: string) => {
      const node = ctx.vfs.getNode(path);
      if (!node || node.type !== 'dir') return;
      for (const [name, child] of Object.entries(node.children)) {
        const full = path === '/' ? '/' + name : path + '/' + name;
        if (!pattern || name.includes(pattern)) results.push(full);
        if (child.type === 'dir') walk(full);
      }
    };
    walk(start);
    return ok(results.join('\n') + (results.length ? '\n' : ''));
  },

  head: (args, ctx) => {
    const { rest } = parseFlags(args);
    let n = 10;
    const nIdx = args.findIndex((a) => a === '-n');
    let files = rest;
    if (nIdx >= 0) { n = parseInt(args[nIdx + 1] ?? '10', 10) || 10; files = rest.filter((_, i) => i !== 0 && rest[i - 1] !== args[nIdx + 1]); }
    // simpler: -5 style
    const dash = args.find((a) => /^-\d+$/.test(a));
    if (dash) { n = parseInt(dash.slice(1), 10); files = rest; }
    let input = ctx.stdin ?? '';
    if (files.length) {
      input = '';
      for (const f of files) {
        const c = ctx.vfs.readFile(resolvePath(ctx.cwd, f));
        if (c === null) return ok('', `head: cannot open '${f}'\n`);
        input += c.endsWith('\n') ? c : c + '\n';
      }
    }
    return ok(input.split('\n').filter((_, i, arr) => i < n && !(i === arr.length - 1 && arr[i] === '')).join('\n') + (input ? '\n' : ''));
  },

  tail: (args, ctx) => {
    const { rest } = parseFlags(args);
    let n = 10;
    const dash = args.find((a) => /^-\d+$/.test(a));
    if (dash) n = parseInt(dash.slice(1), 10);
    let input = ctx.stdin ?? '';
    if (rest.length) {
      input = '';
      for (const f of rest) {
        const c = ctx.vfs.readFile(resolvePath(ctx.cwd, f));
        if (c === null) return ok('', `tail: cannot open '${f}'\n`);
        input += c.endsWith('\n') ? c : c + '\n';
      }
    }
    const lines = input.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return ok(lines.slice(-n).join('\n') + (lines.length ? '\n' : ''));
  },

  wc: (args, ctx) => {
    const { rest } = parseFlags(args);
    let input = ctx.stdin ?? '';
    if (rest.length) {
      input = '';
      for (const f of rest) {
        const c = ctx.vfs.readFile(resolvePath(ctx.cwd, f));
        if (c === null) return ok('', `wc: ${f}: No such file or directory\n`);
        input += c.endsWith('\n') ? c : c + '\n';
      }
    }
    const lines = input === '' ? 0 : input.split('\n').length - 1;
    const words = input.trim() === '' ? 0 : input.trim().split(/\s+/).length;
    return ok(` ${lines}  ${words} ${input.length}\n`);
  },

  sort: (args, ctx) => {
    const { flags, rest } = parseFlags(args);
    let input = ctx.stdin ?? '';
    if (rest.length) {
      const c = ctx.vfs.readFile(resolvePath(ctx.cwd, rest[0]));
      if (c === null) return ok('', `sort: cannot read: ${rest[0]}\n`);
      input = c;
    }
    let lines = input.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    lines = lines.sort((a, b) => a.localeCompare(b));
    if (flags.has('r')) lines.reverse();
    if (flags.has('u')) lines = Array.from(new Set(lines));
    return ok(lines.join('\n') + (lines.length ? '\n' : ''));
  },

  uniq: (args, ctx) => {
    let input = ctx.stdin ?? '';
    if (args.filter((a) => !a.startsWith('-')).length) {
      const f = args.filter((a) => !a.startsWith('-'))[0];
      const c = ctx.vfs.readFile(resolvePath(ctx.cwd, f));
      if (c === null) return ok('', `uniq: ${f}: No such file\n`);
      input = c;
    }
    const lines = input.split('\n');
    const out: string[] = [];
    for (const l of lines) if (!out.length || out[out.length - 1] !== l) out.push(l);
    let res = out.join('\n');
    if (input.endsWith('\n') && !res.endsWith('\n')) res += '\n';
    return ok(res);
  },

  cut: (args, ctx) => {
    // cut -d: -f1,2
    let delim = '\t';
    let fields = '1';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-d' && args[i + 1]) delim = args[i + 1];
      if ((args[i] === '-f' || args[i] === '-c') && args[i + 1]) fields = args[i + 1];
      if (/^-f/.test(args[i])) fields = args[i].slice(2) || args[i + 1] || fields;
      if (/^-d/.test(args[i]) && args[i].length > 2) delim = args[i].slice(2);
    }
    const files = args.filter((a) => !a.startsWith('-') && a !== delim && a !== fields);
    let input = ctx.stdin ?? '';
    if (files.length) {
      const c = ctx.vfs.readFile(resolvePath(ctx.cwd, files[0]));
      if (c === null) return ok('', `cut: ${files[0]}: No such file\n`);
      input = c;
    }
    const idxs = fields.split(',').flatMap((p) => {
      if (p.includes('-')) {
        const [s, e] = p.split('-').map(Number);
        const arr: number[] = [];
        for (let i = (s || 1); i <= (e || 99); i++) arr.push(i);
        return arr;
      }
      return [Number(p)];
    });
    const lines = input.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const out = lines.map((l) => l.split(delim).filter((_, i) => idxs.includes(i + 1)).join(delim));
    return ok(out.join('\n') + (out.length ? '\n' : ''));
  },

  tr: (args, ctx) => {
    let input = ctx.stdin ?? '';
    const [from = '', to = ''] = args;
    let res = '';
    for (const ch of input) {
      const idx = from.indexOf(ch);
      res += idx >= 0 ? (to[idx] ?? to[to.length - 1] ?? ch) : ch;
    }
    return ok(res);
  },

  sed: (args, ctx) => {
    // support: sed s/old/new/ [file]
    const expr = args[0] ?? '';
    const m = expr.match(/^s\/(.*?)\/(.*?)\/([g]*)$/);
    let input = ctx.stdin ?? '';
    const files = args.slice(1).filter((a) => !a.startsWith('-'));
    if (files.length) {
      const c = ctx.vfs.readFile(resolvePath(ctx.cwd, files[0]));
      if (c === null) return ok('', `sed: can't read ${files[0]}\n`);
      input = c;
    }
    if (!m) return ok('', `sed: unsupported expression '${expr}' (try s/old/new/)\n`);
    const [, old, nw, fl] = m;
    const out = fl.includes('g') ? input.split(old).join(nw) : input.replace(old, nw);
    return ok(out);
  },

  awk: (args, ctx) => {
    // support: awk '{print $1}' — print Nth field
    const prog = args.join(' ');
    let input = ctx.stdin ?? '';
    const files = args.filter((a) => !a.startsWith('-') && !a.includes('{'));
    if (!ctx.stdin && files.length) {
      const c = ctx.vfs.readFile(resolvePath(ctx.cwd, files[files.length - 1]));
      if (c !== null) input = c;
    }
    const pm = prog.match(/\{print\s+(\$[\d, ]+)\}/);
    if (!pm) return ok(input);
    const cols = pm[1].replace(/\$/g, '').split(/[,\s]+/).filter(Boolean).map(Number);
    const lines = input.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const out = lines.map((l) => {
      const parts = l.trim().split(/\s+/);
      return cols.map((c) => parts[c - 1] ?? '').join(' ');
    });
    return ok(out.join('\n') + (out.length ? '\n' : ''));
  },

  chmod: () => ok(''),
  man: (args) => ok(args[0] ? `Manual for ${args[0]} — see lesson hints. Try ${args[0]} --help.\n` : 'What manual page do you want?\n'),
  clear: () => ok('', '', { clear: true }),
  exit: () => ok(''),
};

const DISTRO_PKG: Record<string, string> = {
  ubuntu: 'apt', arch: 'pacman', fedora: 'dnf', alpine: 'apk',
};

function distroSwap(line: string, distro: string | null): string | null {
  // returns intercepted output if line is a package-manager command
  const m = line.trim().match(/^(sudo\s+)?(apt|apt-get|pacman|dnf|apk)\b(.*)$/);
  if (!m) return null;
  const native = distro ? (DISTRO_PKG[distro] ?? 'apt') : 'apt';
  const used = m[2];
  if (used === native) return null; // native — let it "run"
  return `Tip: on ${distro ?? 'your distro'} you'd use \`${native}${m[3]}\` instead of \`${used}${m[3]}\`.\n`;
}

/** Split on unquoted | */
function splitPipe(line: string): string[] {
  const parts: string[] = [];
  let cur = '', q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { cur += c; if (c === q) q = null; }
    else if (c === '"' || c === "'") { q = c; cur += c; }
    else if (c === '|') { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

export function executeLine(rawLine: string, baseCtx: ExecContext): ExecResult & { newCwd: string; output: string } {
  let line = rawLine.trim();
  let cwd = baseCtx.cwd;
  if (!line) return { stdout: '', stderr: '', exitCode: 0, newCwd: cwd, output: '' };

  // distro-aware intercept
  const swap = distroSwap(line, baseCtx.distro);
  if (swap) return { stdout: swap, stderr: '', exitCode: 0, newCwd: cwd, output: swap };

  // redirect detection (only on last segment): cmd > file / >> file
  let redirect: { mode: 'w' | 'a'; file: string } | null = null;
  const redirM = line.match(/^(.*?)\s*(>>|>)\s*([^\s]+)\s*$/);
  let pipeInput = '';
  // Only treat as redirect if the > is not inside quotes (simple check: no pipe after it handled by splitPipe? keep simple)
  if (redirM && !redirM[1].includes('|')) {
    line = redirM[1].trim();
    redirect = { mode: redirM[2] === '>>' ? 'a' : 'w', file: redirM[3] };
  }

  const segments = splitPipe(line);
  let lastOut = '';
  let lastErr = '';
  let code = 0;

  for (let i = 0; i < segments.length; i++) {
    const tokens = tokenize(segments[i]).map(expandVars);
    if (!tokens.length) continue;
    const [cmd, ...args] = tokens;
    const ctx: ExecContext = { ...baseCtx, cwd, stdin: i === 0 ? undefined : pipeInput };
    const h = handlers[cmd];
    let res: ExecResult;
    if (!h) {
      res = ok('', `${cmd}: command not found\n`);
    } else {
      try {
        res = h(args, ctx);
      } catch (e) {
        res = ok('', `error: ${e instanceof Error ? e.message : 'failed'}\n`);
      }
    }
    if (res.newCwd) cwd = res.newCwd;
    if (res.clear) return { stdout: '', stderr: '', exitCode: 0, clear: true, newCwd: cwd, output: '' };
    lastOut = res.stdout;
    lastErr = res.stderr;
    code = res.exitCode;
    pipeInput = res.stdout;
    if (code !== 0 && i < segments.length - 1) break;
  }

  let output = lastOut + lastErr;
  if (redirect) {
    const p = resolvePath(cwd, redirect.file);
    // what gets written: stdout only
    baseCtx.vfs.writeFile(p, lastOut, redirect.mode === 'a');
    output = lastErr; // stdout went to file
  }

  return { stdout: lastOut, stderr: lastErr, exitCode: code, newCwd: cwd, output };
}

export const commandNames = Object.keys(handlers).concat(['apt', 'pacman', 'dnf', 'apk', 'sudo']);
