export interface SkillNode {
  id: string;
  trackId: string;
  title: string;
  command: string;
  xp: number;
  lessonIds: string[];
  unlocks: string[];
}

export interface Track {
  id: string;
  name: string;
  color: string;
  subtitle: string;
  nodes: SkillNode[];
}

export const TRACKS: Track[] = [
  {
    id: 'basics',
    name: 'Basics',
    color: '#22D3EE',
    subtitle: 'Kernel Foundational',
    nodes: [
      { id: 'basics-n1', trackId: 'basics', title: 'Orientation', command: 'pwd · ls · hidden', xp: 20, lessonIds: ['orientation.predict', 'orientation.predict2', 'basics.pwd', 'basics.ls', 'hidden.predict', 'hidden.predict2', 'basics.ls-a', 'hidden.prove'], unlocks: ['basics-n2'] },
      { id: 'basics-n2', trackId: 'basics', title: 'Navigate & read', command: 'cd · cat', xp: 25, lessonIds: ['moving.predict', 'moving.predict2', 'basics.cd', 'moving.prove', 'reading.predict', 'reading.predict2', 'basics.cat', 'reading.chain'], unlocks: ['basics-n3'] },
      { id: 'basics-n3', trackId: 'basics', title: 'Shape & search', command: 'touch · mv · grep', xp: 30, lessonIds: ['creating.predict', 'creating.predict2', 'basics.mkdir-touch', 'creating.prove', 'organizing.predict', 'organizing.predict2', 'basics.cp-mv', 'organizing.chain', 'deleting.predict', 'deleting.predict2', 'basics.rm', 'searching.predict', 'searching.predict2', 'basics.grep'], unlocks: ['basics-n4'] },
      { id: 'basics-n4', trackId: 'basics', title: 'Chain power', command: 'pipes', xp: 40, lessonIds: ['chaining.predict', 'chaining.predict2', 'basics.pipes', 'chaining.prove', 'chaining.capstone'], unlocks: ['sysadmin-n1'] },
    ],
  },
  {
    id: 'sysadmin',
    name: 'Sysadmin',
    color: '#FB923C',
    subtitle: 'Daemons & Ops',
    nodes: [
      { id: 'sysadmin-n1', trackId: 'sysadmin', title: 'Logs', command: 'journalctl', xp: 30, lessonIds: [], unlocks: ['sysadmin-n2'] },
      { id: 'sysadmin-n2', trackId: 'sysadmin', title: 'Processes', command: 'ps', xp: 30, lessonIds: [], unlocks: ['sysadmin-n3'] },
      { id: 'sysadmin-n3', trackId: 'sysadmin', title: 'Services', command: 'systemctl', xp: 35, lessonIds: [], unlocks: ['sysadmin-n4'] },
      { id: 'sysadmin-n4', trackId: 'sysadmin', title: 'Schedule', command: 'cron', xp: 40, lessonIds: [], unlocks: [] },
    ],
  },
  {
    id: 'dev',
    name: 'Dev Tools',
    color: '#A78BFA',
    subtitle: 'Build & Code',
    nodes: [
      { id: 'dev-n1', trackId: 'dev', title: 'Version control', command: 'git init', xp: 25, lessonIds: [], unlocks: ['dev-n2'] },
      { id: 'dev-n2', trackId: 'dev', title: 'Editor', command: 'vim', xp: 30, lessonIds: [], unlocks: ['dev-n3'] },
      { id: 'dev-n3', trackId: 'dev', title: 'Sessions', command: 'tmux', xp: 30, lessonIds: [], unlocks: ['dev-n4'] },
      { id: 'dev-n4', trackId: 'dev', title: 'Build', command: 'make', xp: 35, lessonIds: [], unlocks: [] },
    ],
  },
  {
    id: 'network',
    name: 'Networking',
    color: '#4ADE80',
    subtitle: 'Sockets & Protocols',
    nodes: [
      { id: 'network-n1', trackId: 'network', title: 'Reachability', command: 'ping · curl', xp: 30, lessonIds: [], unlocks: ['network-n2'] },
      { id: 'network-n2', trackId: 'network', title: 'Sockets', command: 'netstat', xp: 30, lessonIds: [], unlocks: ['network-n3'] },
      { id: 'network-n3', trackId: 'network', title: 'Secure shell', command: 'ssh', xp: 35, lessonIds: [], unlocks: ['network-n4'] },
      { id: 'network-n4', trackId: 'network', title: 'Firewall', command: 'ufw', xp: 40, lessonIds: [], unlocks: [] },
    ],
  },
];

export type NodeState = 'locked' | 'available' | 'in-progress' | 'completed';

export function nodeState(
  node: SkillNode,
  unlocked: string[],
  completedLessons: string[],
): NodeState {
  if (node.lessonIds.length > 0 && node.lessonIds.every((l) => completedLessons.includes(l)))
    return 'completed';
  if (!unlocked.includes(node.id)) return 'locked';
  if (node.lessonIds.some((l) => completedLessons.includes(l))) return 'in-progress';
  return 'available';
}

export function trackProgress(track: Track, completedLessons: string[]): { done: number; total: number; pct: number } {
  const all = track.nodes.flatMap((n) => n.lessonIds);
  const done = all.filter((l) => completedLessons.includes(l)).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}
