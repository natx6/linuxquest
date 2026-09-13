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



function gitRoot(ctx: ExecContext): string | null {
  let dir = ctx.cwd;
  for (;;) {
    const n = ctx.vfs.getNode(dir + '/.git');
    if (n && n.type === 'dir') return dir;
    if (dir === '/') return null;
    dir = dir === '/' ? '/' : dir.slice(0, dir.lastIndexOf('/')) || '/';
  }
}

function gitLines(ctx: ExecContext, root: string, name: string): string[] {
  const c = ctx.vfs.readFile(root + '/.git/' + name);
  if (!c) return [];
  return c.split('\n').filter((l) => l !== '');
}

function gitWriteLines(ctx: ExecContext, root: string, name: string, lines: string[]) {
  ctx.vfs.writeFile(root + '/.git/' + name, lines.length ? lines.join('\n') + '\n' : '');
}

function loadUfw(ctx: ExecContext): { active: boolean; rules: string[] } {
  const raw = ctx.vfs.readFile('/run/ufw.rules');
  if (!raw) return { active: false, rules: [] };
  const lines = raw.split('\n').filter((l) => l !== '');
  return { active: lines[0] === '#active', rules: lines.slice(1) };
}

function saveUfw(ctx: ExecContext, active: boolean, rules: string[]) {
  ctx.vfs.writeFile('/run/ufw.rules', (active ? '#active' : '#inactive') + '\n' + (rules.length ? rules.join('\n') + '\n' : ''));
}


interface ProcRow { user: string; pid: number; cpu: string; mem: string; cmd: string; }
const DEFAULT_PROCS: ProcRow[] = [
  { user: 'user', pid: 1, cpu: '0.0', mem: '0.1', cmd: '/sbin/init' },
  { user: 'user', pid: 512, cpu: '0.1', mem: '0.4', cmd: 'sshd: user@pts/0' },
  { user: 'user', pid: 891, cpu: '0.3', mem: '2.1', cmd: 'postgres: writer' },
  { user: 'user', pid: 1024, cpu: '0.2', mem: '1.2', cmd: 'nginx: worker' },
  { user: 'user', pid: 1337, cpu: '98.7', mem: '12.4', cmd: './miner --pool evil' },
  { user: 'user', pid: 1400, cpu: '0.0', mem: '0.1', cmd: 'cron -f' },
];
const PROC_PATH = '/run/proc.json';

function loadProcs(ctx: ExecContext): ProcRow[] {
  const raw = ctx.vfs.readFile(PROC_PATH);
  if (raw === null) {
    ctx.vfs.writeFile(PROC_PATH, JSON.stringify(DEFAULT_PROCS));
    return [...DEFAULT_PROCS];
  }
  try {
    const arr = JSON.parse(raw) as ProcRow[];
    return Array.isArray(arr) ? arr : [...DEFAULT_PROCS];
  } catch {
    return [...DEFAULT_PROCS];
  }
}

function saveProcs(ctx: ExecContext, rows: ProcRow[]) {
  ctx.vfs.writeFile(PROC_PATH, JSON.stringify(rows));
}

interface SvcState { active: string; enabled: string; }
function loadSvc(ctx: ExecContext, name: string): SvcState {
  const raw = ctx.vfs.readFile('/run/services/' + name);
  if (raw === null) return { active: 'inactive', enabled: 'no' };
  try {
    const o = JSON.parse(raw) as Partial<SvcState>;
    return { active: o.active ?? 'inactive', enabled: o.enabled ?? 'no' };
  } catch {
    return { active: 'inactive', enabled: 'no' };
  }
}

function saveSvc(ctx: ExecContext, name: string, st: SvcState) {
  ctx.vfs.writeFile('/run/services/' + name, JSON.stringify(st));
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
        return `${e.node.mode} 1 user staff 64 Oct 24 14:00 ${e.name}${isDir ? '/' : ''}`;
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
      if (/^-f/.test(args[i])) {
        const v = args[i].slice(2);
        fields = v !== '' ? v : (args[i + 1] ?? fields);
      }
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

  git: (args, ctx) => {
    const [sub, ...rest] = args;
    if (!sub) return ok('', 'usage: git <init|status|add|commit|log>\n');
    if (sub === 'init') {
      const gd = ctx.cwd + '/.git';
      if (ctx.vfs.getNode(gd)) return ok(`Reinitialized existing Git repository in ${gd}/\n`);
      ctx.vfs.mkdir(gd);
      ctx.vfs.writeFile(gd + '/HEAD', 'ref: main\n');
      ctx.vfs.writeFile(gd + '/commits.log', '');
      ctx.vfs.writeFile(gd + '/index', '');
      ctx.vfs.writeFile(gd + '/committed', '');
      ctx.vfs.writeFile(gd + '/counter', '0\n');
      return ok(`Initialized empty Git repository in ${gd}/\n`);
    }
    const root = gitRoot(ctx);
    if (!root) return ok('', 'fatal: not a git repository (or any parent): .git\n');
    if (sub === 'status') {
      const staged = gitLines(ctx, root, 'index');
      const committed = new Set(gitLines(ctx, root, 'committed'));
      const entries = ctx.vfs.listDirAll(root) ?? [];
      const files = entries.filter((e) => e.node.type === 'file').map((e) => e.name);
      const fresh = files.filter((f) => !committed.has(f) && !staged.includes(f));
      let out = 'On branch main\n';
      if (!staged.length && !fresh.length) return ok(out + 'nothing to commit, working tree clean\n');
      if (staged.length) out += 'Staged:\n' + staged.map((f) => `  new file: ${f}\n`).join('');
      if (fresh.length) out += 'Untracked:\n' + fresh.map((f) => `  ${f}\n`).join('');
      return ok(out);
    }
    if (sub === 'add') {
      const f = rest[0];
      if (!f) return ok('', 'usage: git add <file>\n');
      if (ctx.vfs.readFile(resolvePath(root, f)) === null && !ctx.vfs.getNode(resolvePath(root, f))) {
        return ok('', `fatal: pathspec '${f}' did not match any files\n`);
      }
      const staged = gitLines(ctx, root, 'index');
      if (!staged.includes(f)) gitWriteLines(ctx, root, 'index', [...staged, f]);
      return ok('');
    }
    if (sub === 'commit') {
      const mi = rest.indexOf('-m');
      const msg = mi >= 0 ? (rest[mi + 1] ?? '') : '';
      if (!msg) return ok('', 'usage: git commit -m "<message>"\n');
      const staged = gitLines(ctx, root, 'index');
      if (!staged.length) return ok('nothing to commit, working tree clean\n');
      const n = (parseInt(ctx.vfs.readFile(root + '/.git/counter') ?? '0', 10) || 0) + 1;
      ctx.vfs.writeFile(root + '/.git/counter', String(n) + '\n');
      const hash = 'c' + String(n).padStart(6, '0') + 'd';
      const log = gitLines(ctx, root, 'commits.log');
      gitWriteLines(ctx, root, 'commits.log', [...log, `${hash} ${msg}`]);
      const committed = gitLines(ctx, root, 'committed');
      gitWriteLines(ctx, root, 'committed', Array.from(new Set([...committed, ...staged])));
      gitWriteLines(ctx, root, 'index', []);
      return ok(`[main ${hash}] ${msg}\n ${staged.length} file(s) changed\n`);
    }
    if (sub === 'log') {
      const log = gitLines(ctx, root, 'commits.log');
      if (!log.length) return ok('fatal: your current branch has no commits yet\n');
      return ok(log.slice().reverse().map((l) => {
        const [h, ...m] = l.split(' ');
        return `commit ${h}\n    ${m.join(' ')}\n`;
      }).join('\n') + '\n');
    }
    return ok('', `git: '${sub}' is not a git command here (try init|status|add|commit|log)\n`);
  },

  ping: (args, ctx) => {
    void ctx;
    const ci = args.indexOf('-c');
    const count = ci >= 0 ? parseInt(args[ci + 1] ?? '4', 10) || 4 : 4;
    const host = [...args].reverse().find((a) => !a.startsWith('-') && a !== String(count)) ?? '';
    if (!host) return ok('', 'usage: ping [-c count] <host>\n');
    if (host.includes('down') || host.includes('dead') || host.includes('invalid')) {
      return ok(`PING ${host}: no answer\n--- ${host} statistics ---\n${count} transmitted, 0 received, 100% packet loss\n`);
    }
    let out = `PING ${host} (93.184.216.34): 56 bytes\n`;
    for (let i = 0; i < Math.min(count, 10); i++) {
      out += `64 bytes from 93.184.216.34: icmp_seq=${i} ttl=64 time=${(11 + i * 0.7).toFixed(1)} ms\n`;
    }
    out += `--- ${host} statistics ---\n${count} transmitted, ${count} received, 0% packet loss\n`;
    return ok(out);
  },

  curl: (args, ctx) => {
    void ctx;
    const { flags, rest } = parseFlags(args);
    const url = rest.find((a) => a.includes('://')) ?? rest[rest.length - 1] ?? '';
    if (!url) return ok('', 'usage: curl [-sI] <url>\n');
    if (flags.has('I')) return ok('HTTP/2 200\ncontent-type: text/html\ncontent-length: 1256\n\n');
    return ok('<!doctype html>\n<html>\n<head><title>Example Domain</title></head>\n<body>Example Domain</body>\n</html>\n');
  },

  ss: (_a, ctx) => {
    void ctx;
    const head = 'State  Recv-Q Send-Q Local:Port  Process\n';
    const rows = [
      'LISTEN 0      128    0.0.0.0:22   sshd',
      'LISTEN 0      128    0.0.0.0:80   nginx',
      'LISTEN 0      128    127.0.0.1:8080 app',
      'LISTEN 0      128    0.0.0.0:5432 postgres',
    ];
    return ok(head + rows.join('\n') + '\n');
  },

  'ssh-keygen': (_a, ctx) => {
    const dir = '/home/user/.ssh';
    ctx.vfs.ensureDir(dir);
    ctx.vfs.writeFile(dir + '/id_rsa', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake-private-key\n-----END OPENSSH PRIVATE KEY-----\n');
    ctx.vfs.writeFile(dir + '/id_rsa.pub', 'ssh-rsa AAAAB3fake-key-material user@linuxquest\n');
    return ok('Generating public/private rsa key pair.\nYour identification: id_rsa\nYour public key: id_rsa.pub\nFingerprint: SHA256:fake\n');
  },

  ufw: (args, ctx) => {
    const [verb, ...rest] = args;
    if (!verb || verb === 'status') {
      const { active, rules } = loadUfw(ctx);
      if (!active) return ok('Status: inactive\n');
      let out = 'Status: active\nTo      Action\n--      ------\n';
      out += rules.map((r) => `${r}  ALLOW\n`).join('');
      return ok(out);
    }
    if (verb === 'enable') {
      const { rules } = loadUfw(ctx);
      saveUfw(ctx, true, rules);
      return ok('Firewall is active and enabled on system startup\n');
    }
    if (verb === 'disable') {
      const { rules } = loadUfw(ctx);
      saveUfw(ctx, false, rules);
      return ok('Firewall stopped and disabled\n');
    }
    if (verb === 'allow') {
      const port = rest[0];
      if (!port) return ok('', 'usage: ufw allow <port>\n');
      const { active, rules } = loadUfw(ctx);
      if (!rules.includes(port)) saveUfw(ctx, active, [...rules, port]);
      return ok(`Rule added: allow ${port}${active ? '' : ' (takes effect when enabled)'}\n`);
    }
    return ok('', `ufw: unknown '${verb}' (try status|enable|allow)\n`);
  },

  ps: (_a, ctx) => {
    const rows = loadProcs(ctx);
    const head = 'USER       PID %CPU %MEM COMMAND\n';
    const body = rows
      .map((r) => `${r.user.padEnd(10)} ${String(r.pid).padEnd(4)} ${r.cpu.padEnd(4)} ${r.mem.padEnd(4)} ${r.cmd}`)
      .join('\n');
    return ok(head + body + '\n');
  },

  kill: (args, ctx) => {
    const target = args.find((a) => !a.startsWith('-'));
    if (!target) return ok('', 'kill: usage: kill [-9] <pid>\n');
    const pid = parseInt(target, 10);
    if (Number.isNaN(pid)) return ok('', `kill: invalid pid '${target}'\n`);
    const rows = loadProcs(ctx);
    if (!rows.some((r) => r.pid === pid)) return ok('', `kill: (${pid}) - No such process\n`);
    saveProcs(ctx, rows.filter((r) => r.pid !== pid));
    return ok('');
  },

  pkill: (args, ctx) => {
    const pat = args.find((a) => !a.startsWith('-'));
    if (!pat) return ok('', 'pkill: usage: pkill <pattern>\n');
    const rows = loadProcs(ctx);
    const hit = rows.filter((r) => r.cmd.includes(pat));
    if (!hit.length) return ok('', `pkill: no processes matched '${pat}'\n`);
    saveProcs(ctx, rows.filter((r) => !r.cmd.includes(pat)));
    return ok(hit.map((r) => `killed ${r.pid} (${r.cmd})`).join('\n') + '\n');
  },

  systemctl: (args, ctx) => {
    const [verb, name] = args;
    if (!verb || !name) return ok('', 'systemctl: usage: systemctl <status|start|stop|restart|is-active|is-enabled|enable> <service>\n');
    const st = loadSvc(ctx, name);
    switch (verb) {
      case 'status': {
        const line = st.active === 'active' ? 'Active: active (running)' : `Active: ${st.active}`;
        return ok(`\u25cf ${name}.service\n   Loaded: loaded\n   ${line}\n`);
      }
      case 'is-active':
        return ok(st.active + '\n');
      case 'is-enabled':
        return ok(st.enabled + '\n');
      case 'start':
        if (st.active === 'active') return ok('', `${name}: already running\n`);
        saveSvc(ctx, name, { ...st, active: 'active' });
        return ok('');
      case 'stop':
        saveSvc(ctx, name, { ...st, active: 'inactive' });
        return ok('');
      case 'restart':
        saveSvc(ctx, name, { ...st, active: 'active' });
        return ok('');
      case 'enable':
        saveSvc(ctx, name, { ...st, enabled: 'yes' });
        return ok(`Created symlink for ${name}.\n`);
      case 'disable':
        saveSvc(ctx, name, { ...st, enabled: 'no' });
        return ok('');
      default:
        return ok('', `systemctl: unknown verb '${verb}'\n`);
    }
  },

  journalctl: (args, ctx) => {
    const u = args.indexOf('-u');
    const unit = u >= 0 ? args[u + 1] : undefined;
    if (!unit) return ok('', 'journalctl: specify a unit: journalctl -u <service>\n');
    const c = ctx.vfs.readFile('/var/log/' + unit + '.log');
    if (c === null) return ok('', `-- No entries for ${unit} --\n`);
    return ok(c.endsWith('\n') ? c : c + '\n');
  },

  crontab: (args, ctx) => {
    if (args[0] === '-l') {
      const c = ctx.vfs.readFile('/var/spool/cron/user');
      if (c === null || c.trim() === '') return ok('no crontab for user\n');
      return ok(c.endsWith('\n') ? c : c + '\n');
    }
    if (args[0] === '-e') return ok('Edit via redirect: echo \'<schedule> <cmd>\' >> ~/.cron && crontab ~/.cron\nSimpler here: echo \'<line>\' >> /var/spool/cron/user\n');
    return ok('', 'crontab: usage: crontab -l\n');
  },

  chmod: (args, ctx) => {
    if (args.length < 2) return ok('', 'chmod: missing operand\n');
    const [modeArg, target] = args;
    const m = modeArg.match(/^[0-7]{3}$/);
    if (!m) return ok('', `chmod: invalid mode '${modeArg}' (use 3 octal digits, e.g. 755)\n`);
    const p = resolvePath(ctx.cwd, target);
    const node = ctx.vfs.getNode(p);
    if (!node) return ok('', `chmod: cannot access '${target}': No such file or directory\n`);
    const tri = (d: string) => {
      const n = parseInt(d, 8);
      return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
    };
    node.mode = (node.type === 'dir' ? 'd' : '-') + tri(modeArg[0]) + tri(modeArg[1]) + tri(modeArg[2]);
    return ok('');
  },
  man: (args) => ok(args[0] ? (MAN[args[0]] ?? `No manual entry for ${args[0]}\n`) : 'What manual page do you want?\n'),
  clear: () => ok('', '', { clear: true }),
  exit: () => ok(''),
};

const MAN: Record<string, string> = {
  ls: `LS(1)  List directory contents\n\n  ls [-la] [path]\n    -a  show hidden entries starting with .\n    -l  long format with permissions, owner, size\n\n  Press q to quit. Try: ls -a\n`,
  grep: `GREP(1)  Search text by pattern\n\n  grep [-iv] <pattern> [file]\n    -i  ignore case\n    -v  invert match (lines NOT matching)\n\n  Reads stdin when piped. Try: grep error app.log\n`,
  cd: `CD(1)  Change directory\n\n  cd <dir>   relative (Documents) or absolute (/home/user/Documents)\n  cd ..      parent directory     cd ~  home\n`,
  cat: `CAT(1)  Print files to standard output\n\n  cat <file> [file...]   files print back-to-back, in order\n`,
  chmod: `CHMOD(1)  Change file modes\n\n  chmod <octal> <file>   e.g. 755 = rwxr-xr-x, 644 = rw-r--r--\n  Digits: 4 read, 2 write, 1 execute. Sum per owner, group, other.\n`,
  pwd: `PWD(1)  Print working directory\n\n  No flags needed. When lost, pwd first.\n`,
  ps: `PS(1)  Report process status\n\n  ps aux   every process: USER PID %CPU %MEM COMMAND\n  Spot high %CPU, note the PID, then kill <pid>.\n`,
  kill: `KILL(1)  Stop a process by PID\n\n  kill <pid>   polite request. Verify it is gone with ps aux.\n`,
  systemctl: `SYSTEMCTL(1)  Control services\n\n  systemctl status <svc>     diagnose first\n  systemctl start <svc>      recover\n  systemctl is-active <svc>  prove it\n`,
  git: `GIT(1)  Version control\n\n  git init  start tracking here\n  git status  staged vs untracked\n  git add <f>  stage   git commit -m "msg"  snapshot\n  git log  history, newest first\n`,
  ping: `PING(1)  Test reachability (ICMP)\n\n  ping -c 3 <host>   0% loss means reachable. Not HTTP!\n`,
  curl: `CURL(1)  Transfer URLs (HTTP)\n\n  curl -s <url>  fetch body   curl -sI <url>  headers only\n`,
  ufw: `UFW(1)  Uncomplicated firewall\n\n  ufw status  ufw enable  ufw allow <port>\n  Allow SSH (22) before enabling remotely — or lock yourself out.\n`,
  crontab: `CRONTAB(1)  Schedule recurring jobs\n\n  crontab -l   list your jobs\n  Fields: minute hour day month weekday command\n  0 2 * * * = 02:00 daily.\n`,
  rm: `RM(1)  Remove files — permanently\n\n  rm <file>...   no trash, no undo. Directories need -r.\n`,
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
