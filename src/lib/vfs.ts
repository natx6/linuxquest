/** VirtualFS — nested object tree, per-lesson instance. */

export type VNode =
  | { type: 'dir'; children: Record<string, VNode>; mode: string }
  | { type: 'file'; content: string; mode: string };

export const DEFAULT_DIR_MODE = 'drwxr-xr-x';
export const DEFAULT_FILE_MODE = '-rw-r--r--';

export type StartingFS = Record<string, unknown>;

function toVNode(raw: unknown): VNode {
  if (typeof raw === 'string') return { type: 'file', content: raw, mode: DEFAULT_FILE_MODE };
  if (raw && typeof raw === 'object') {
    const children: Record<string, VNode> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      children[k] = toVNode(v);
    }
    return { type: 'dir', children, mode: DEFAULT_DIR_MODE };
  }
  return { type: 'file', content: '', mode: DEFAULT_FILE_MODE };
}

function cloneNode(n: VNode): VNode {
  if (n.type === 'file') return { type: 'file', content: n.content, mode: n.mode };
  const children: Record<string, VNode> = {};
  for (const [k, v] of Object.entries(n.children)) children[k] = cloneNode(v);
  return { type: 'dir', children, mode: DEFAULT_DIR_MODE };
}

/** Normalize: ensure leading /, collapse //, resolve . (not .. — see resolvePath). */
export function normalize(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export function resolvePath(cwd: string, input: string): string {
  let combined: string;
  if (input.startsWith('/')) combined = input;
  else if (input === '~' || input.startsWith('~/')) combined = '/home/user' + input.slice(1);
  else combined = cwd === '/' ? '/' + input : cwd + '/' + input;
  const parts = combined.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return '/' + stack.join('/');
}

function splitParent(path: string): [string, string] {
  const n = normalize(path);
  if (n === '/') return ['/', ''];
  const idx = n.lastIndexOf('/');
  const parent = idx === 0 ? '/' : n.slice(0, idx);
  return [parent, n.slice(idx + 1)];
}

export class VirtualFS {
  root: VNode;

  constructor(startingFS?: StartingFS) {
    this.root = { type: 'dir', children: {}, mode: DEFAULT_DIR_MODE };
    // Always ensure /home/user exists
    this.ensureDir('/home/user');
    if (startingFS) this.load(startingFS);
  }

  load(fs: StartingFS) {
    for (const [path, raw] of Object.entries(fs)) {
      const abs = normalize(path);
      if (abs === '/') {
        // merge into root
        const node = toVNode(raw);
        if (node.type === 'dir') {
          for (const [k, v] of Object.entries(node.children)) {
            (this.root as { type: 'dir'; children: Record<string, VNode> }).children[k] = v;
          }
        }
        continue;
      }
      const [parent, name] = splitParent(abs);
      this.ensureDir(parent);
      const pNode = this.getNode(parent);
      if (pNode && pNode.type === 'dir') pNode.children[name] = toVNode(raw);
    }
  }

  reset(startingFS?: StartingFS) {
    this.root = { type: 'dir', children: {}, mode: DEFAULT_DIR_MODE };
    this.ensureDir('/home/user');
    if (startingFS) this.load(startingFS);
  }

  ensureDir(path: string) {
    const n = normalize(path);
    if (n === '/') return;
    const parts = n.split('/').filter(Boolean);
    let cur = this.root;
    for (const p of parts) {
      if (cur.type !== 'dir') return;
      if (!cur.children[p]) cur.children[p] = { type: 'dir', children: {}, mode: DEFAULT_DIR_MODE };
      const next = cur.children[p];
      // If a file blocks the path, replace with dir (lesson seeds are authoritative)
      if (next.type !== 'dir') cur.children[p] = { type: 'dir', children: {}, mode: DEFAULT_DIR_MODE };
      cur = cur.children[p] as { type: 'dir'; children: Record<string, VNode>; mode: string };
    }
  }

  getNode(path: string): VNode | null {
    const n = normalize(path);
    if (n === '/') return this.root;
    const parts = n.split('/').filter(Boolean);
    let cur: VNode = this.root;
    for (const p of parts) {
      if (cur.type !== 'dir') return null;
      const next = cur.children[p];
      if (!next) return null;
      cur = next;
    }
    return cur;
  }

  listDir(path: string): string[] | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'dir') return null;
    return Object.keys(node.children).sort();
  }

  /** List with hidden-file awareness for validator display; caller filters. */
  listDirAll(path: string): { name: string; node: VNode }[] | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'dir') return null;
    return Object.entries(node.children)
      .map(([name, child]) => ({ name, node: child }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  readFile(path: string): string | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') return null;
    return node.content;
  }

  writeFile(path: string, content: string, append = false) {
    const [parent, name] = splitParent(path);
    if (!name) return;
    this.ensureDir(parent);
    const p = this.getNode(parent);
    if (!p || p.type !== 'dir') return;
    const existing = p.children[name];
    if (existing && existing.type === 'file' && append) {
      existing.content += content;
    } else {
      const prev = p.children[name];
      const mode = prev && prev.type === 'file' ? prev.mode : DEFAULT_FILE_MODE;
      p.children[name] = { type: 'file', content, mode };
    }
  }

  mkdir(path: string): boolean {
    if (this.getNode(path)) return false;
    const [parent, name] = splitParent(path);
    if (!name) return false;
    this.ensureDir(parent);
    const p = this.getNode(parent);
    if (!p || p.type !== 'dir') return false;
    p.children[name] = { type: 'dir', children: {}, mode: DEFAULT_DIR_MODE };
    return true;
  }

  remove(path: string, recursive = false): boolean {
    const [parent, name] = splitParent(path);
    const p = this.getNode(parent);
    if (!p || p.type !== 'dir' || !p.children[name]) return false;
    const target = p.children[name];
    if (target.type === 'dir' && Object.keys(target.children).length > 0 && !recursive) return false;
    delete p.children[name];
    return true;
  }

  /** Absolute-path → permission string for every node (validator modeState). */
  modes(): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (path: string, n: VNode) => {
      out[path] = n.mode;
      if (n.type === 'dir') {
        for (const [k, v] of Object.entries(n.children)) {
          walk(path === '/' ? '/' + k : path + '/' + k, v);
        }
      }
    };
    walk('/', this.root);
    return out;
  }

  /** Snapshot for validator fsState comparison. */
  snapshot(): StartingFS {
    const ser = (n: VNode): unknown =>
      n.type === 'file' ? n.content : Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, ser(v)]));
    return ser(this.root) as StartingFS;
  }
}
