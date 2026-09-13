export interface Lesson {
  id: string;
  nodeId: string;
  index: number; // 1..10
  type: 'command' | 'puzzle' | 'scenario';
  title: string;
  track: string;
  prompt: string;
  startingFS: Record<string, unknown>;
  startingCwd?: string;
  expected: {
    command?: string;
    commandAlt?: string[];
    output?: string;
    outputAlt?: string[];
    fsState?: Record<string, unknown>;
  };
  hints: string[];
  xp: number;
}

const HOME = '/home/user';

export const LESSONS: Lesson[] = [
  {
    id: 'basics.pwd',
    nodeId: 'basics-n1',
    index: 1,
    type: 'command',
    title: 'Where am I?',
    track: 'Basics',
    prompt: 'Print your current working directory.',
    startingFS: { [HOME]: { 'notes.txt': 'hello\n' } },
    startingCwd: HOME,
    expected: { command: 'pwd', output: HOME },
    hints: ['The command prints the working directory.', 'Try: pwd'],
    xp: 25,
  },
  {
    id: 'basics.ls',
    nodeId: 'basics-n1',
    index: 2,
    type: 'command',
    title: 'List files',
    track: 'Basics',
    prompt: 'List the files in the current directory.',
    startingFS: { [HOME]: { 'Documents': {}, 'Downloads': {}, 'notes.txt': 'hi\n' } },
    startingCwd: HOME,
    expected: { command: 'ls', commandAlt: ['ls .', 'ls ~'], output: 'notes.txt' },
    hints: ['Use ls to list directory contents.', 'Try: ls'],
    xp: 25,
  },
  {
    id: 'basics.ls-a',
    nodeId: 'basics-n1',
    index: 3,
    type: 'command',
    title: 'Hidden files',
    track: 'Basics',
    prompt: 'List all files including hidden ones.',
    startingFS: { [HOME]: { '.bashrc': 'export PATH\n', '.secret_token': 's3cr3t\n', 'Documents': {} } },
    startingCwd: HOME,
    expected: { command: 'ls -a', commandAlt: ['ls -la', 'ls -al', 'ls -a .'], output: '.secret_token' },
    hints: ['Filenames starting with . are hidden.', 'The -a (all) flag reveals them. Try: ls -a'],
    xp: 25,
  },
  {
    id: 'basics.cd',
    nodeId: 'basics-n2',
    index: 4,
    type: 'command',
    title: 'Change directory',
    track: 'Basics',
    prompt: 'Move into the Documents directory, then confirm with pwd.',
    startingFS: { [HOME]: { 'Documents': { 'todo.txt': 'x\n' } } },
    startingCwd: HOME,
    expected: { command: 'pwd', output: `${HOME}/Documents`, fsState: {} },
    hints: ['Use cd Documents to move.', 'Then run pwd to verify.'],
    xp: 25,
  },
  {
    id: 'basics.cat',
    nodeId: 'basics-n2',
    index: 5,
    type: 'command',
    title: 'Read a file',
    track: 'Basics',
    prompt: 'Print the contents of readme.txt.',
    startingFS: { [HOME]: { 'readme.txt': 'quest failed successfully\n' } },
    startingCwd: HOME,
    expected: { command: 'cat readme.txt', output: 'quest failed successfully' },
    hints: ['cat prints file contents.', 'Try: cat readme.txt'],
    xp: 25,
  },
  {
    id: 'basics.mkdir-touch',
    nodeId: 'basics-n2',
    index: 6,
    type: 'command',
    title: 'Create things',
    track: 'Basics',
    prompt: 'Create a directory projects and an empty file todo.txt inside it.',
    startingFS: { [HOME]: {} },
    startingCwd: HOME,
    expected: { fsState: { home: { user: { projects: { 'todo.txt': '' } } } } },
    hints: ['mkdir makes directories: mkdir projects', 'touch makes files: touch projects/todo.txt'],
    xp: 25,
  },
  {
    id: 'basics.cp-mv',
    nodeId: 'basics-n3',
    index: 7,
    type: 'command',
    title: 'Copy and move',
    track: 'Basics',
    prompt: 'Copy notes.txt to notes.bak, then rename notes.bak to final.txt.',
    startingFS: { [HOME]: { 'notes.txt': 'draft\n' } },
    startingCwd: HOME,
    expected: { fsState: { home: { user: { 'notes.txt': 'draft\n', 'final.txt': 'draft\n' } } } },
    hints: ['cp copies: cp notes.txt notes.bak', 'mv renames: mv notes.bak final.txt'],
    xp: 25,
  },
  {
    id: 'basics.rm',
    nodeId: 'basics-n3',
    index: 8,
    type: 'command',
    title: 'Delete',
    track: 'Basics',
    prompt: 'Delete the file trash.txt.',
    startingFS: { [HOME]: { 'trash.txt': 'bye\n', 'keep.txt': 'hi\n' } },
    startingCwd: HOME,
    expected: { command: 'rm trash.txt', fsState: { home: { user: { 'keep.txt': 'hi\n' } } } },
    hints: ['rm removes files.', 'Try: rm trash.txt'],
    xp: 25,
  },
  {
    id: 'basics.grep',
    nodeId: 'basics-n3',
    index: 9,
    type: 'command',
    title: 'Search text',
    track: 'Basics',
    prompt: 'Find lines containing "error" in app.log.',
    startingFS: { [HOME]: { 'app.log': 'ok started\nerror disk full\nok done\nerror timeout\n' } },
    startingCwd: HOME,
    expected: { command: 'grep error app.log', output: 'error disk full' },
    hints: ['grep searches text: grep <pattern> <file>', 'Try: grep error app.log'],
    xp: 25,
  },
  {
    id: 'basics.pipes',
    nodeId: 'basics-n4',
    index: 10,
    type: 'command',
    title: 'Chain commands',
    track: 'Basics',
    prompt: 'List files, then pipe into grep to find "log".',
    startingFS: { [HOME]: { 'app.log': 'x\n', 'notes.txt': 'x\n', 'data.csv': 'x\n' } },
    startingCwd: HOME,
    expected: { command: 'ls | grep log', output: 'app.log' },
    hints: ['Pipes chain commands with |', 'Try: ls | grep log'],
    xp: 25,
  },
];

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const nextLesson = (id: string): Lesson | undefined => {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
};
