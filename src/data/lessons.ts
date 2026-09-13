export interface Lesson {
  id: string;
  nodeId: string;
  index: number;
  type: 'command' | 'puzzle' | 'scenario';
  title: string;
  track: string;
  prompt: string;
  /** One or two sentences: why this command exists. Shown before practice. */
  concept: string;
  /** Worked example shown before practice (not counted as a hint). */
  example: string;
  /** One-liner shown after success. */
  takeaway: string;
  /** Touch-friendly key chips for this lesson. */
  chips: string[];
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
    concept: 'The shell always sits inside one directory. pwd (print working directory) tells you which one.',
    example: 'pwd',
    takeaway: 'pwd always shows where you are.',
    chips: ['pwd'],
    startingFS: { [HOME]: { 'notes.txt': 'hello\n' } },
    startingCwd: HOME,
    expected: { command: 'pwd', output: HOME },
    hints: ['The command prints the working directory.', 'Type pwd and press Enter, then Check.'],
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
    concept: 'ls lists what is inside a directory. With no arguments it lists the working directory.',
    example: 'ls',
    takeaway: 'ls lists the current directory.',
    chips: ['ls', '-l'],
    startingFS: { [HOME]: { 'Documents': {}, 'Downloads': {}, 'notes.txt': 'hi\n' } },
    startingCwd: HOME,
    expected: { command: 'ls', commandAlt: ['ls .', 'ls ~'], output: 'notes.txt' },
    hints: ['Use ls to list directory contents.', 'Type ls and press Enter, then Check.'],
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
    concept: 'Names starting with a dot are hidden by default. Config lives there (.bashrc, keys, tokens). The -a flag reveals them.',
    example: 'ls -a',
    takeaway: 'Dotfiles hide; -a reveals them.',
    chips: ['-a', '-la'],
    startingFS: { [HOME]: { '.bashrc': 'export PATH\n', '.secret_token': 's3cr3t\n', 'Documents': {} } },
    startingCwd: HOME,
    expected: { command: 'ls -a', commandAlt: ['ls -la', 'ls -al', 'ls -a .'], output: '.secret_token' },
    hints: ['Filenames starting with . are hidden.', 'The -a (all) flag reveals them. Type ls -a.'],
    xp: 25,
  },
  {
    id: 'basics.cd',
    nodeId: 'basics-n2',
    index: 4,
    type: 'command',
    title: 'Change directory',
    track: 'Basics',
    prompt: 'Move into Documents, then run pwd to prove it.',
    concept: 'cd moves you between directories. Give it a relative name (Documents) or an absolute path (/home/user/Documents).',
    example: 'cd Documents',
    takeaway: 'cd moves; pwd proves it.',
    chips: ['Documents', '..', '~'],
    startingFS: { [HOME]: { 'Documents': { 'todo.txt': 'x\n' } } },
    startingCwd: HOME,
    expected: { command: 'pwd', output: `${HOME}/Documents`, fsState: {} },
    hints: ['First: cd Documents to move.', 'Then run pwd to verify, then Check.'],
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
    concept: 'cat dumps a file to standard output. It is the fastest way to read small files.',
    example: 'cat readme.txt',
    takeaway: 'cat prints file contents.',
    chips: ['readme.txt'],
    startingFS: { [HOME]: { 'readme.txt': 'quest failed successfully\n' } },
    startingCwd: HOME,
    expected: { command: 'cat readme.txt', output: 'quest failed successfully' },
    hints: ['cat prints file contents.', 'Type cat readme.txt, then Check.'],
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
    concept: 'mkdir makes directories, touch makes empty files. Combine a path (projects/todo.txt) to place the file inside.',
    example: 'mkdir projects',
    takeaway: 'mkdir for dirs, touch for files.',
    chips: ['projects', 'todo.txt'],
    startingFS: { [HOME]: {} },
    startingCwd: HOME,
    expected: { fsState: { home: { user: { projects: { 'todo.txt': '' } } } } },
    hints: ['Step 1: mkdir projects', 'Step 2: touch projects/todo.txt, then Check.'],
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
    concept: 'cp duplicates, mv relocates or renames. A rename is just a move within the same directory.',
    example: 'cp notes.txt notes.bak',
    takeaway: 'cp duplicates; mv renames.',
    chips: ['notes.txt', 'notes.bak', 'final.txt'],
    startingFS: { [HOME]: { 'notes.txt': 'draft\n' } },
    startingCwd: HOME,
    expected: {
      command: 'mv notes.bak final.txt',
      fsState: { home: { user: { 'notes.txt': 'draft\n', 'final.txt': 'draft\n' } } },
    },
    hints: ['Step 1: cp notes.txt notes.bak', 'Step 2: mv notes.bak final.txt, then Check.'],
    xp: 25,
  },
  {
    id: 'basics.rm',
    nodeId: 'basics-n3',
    index: 8,
    type: 'command',
    title: 'Delete',
    track: 'Basics',
    prompt: 'Delete the file trash.txt. keep.txt must survive.',
    concept: 'rm deletes permanently — there is no trash bin. Double-check the name before pressing Enter.',
    example: 'rm trash.txt',
    takeaway: 'rm is permanent. Aim carefully.',
    chips: ['trash.txt'],
    startingFS: { [HOME]: { 'trash.txt': 'bye\n', 'keep.txt': 'hi\n' } },
    startingCwd: HOME,
    expected: { command: 'rm trash.txt', fsState: { home: { user: { 'keep.txt': 'hi\n' } } } },
    hints: ['rm removes files.', 'Type rm trash.txt, then Check.'],
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
    concept: 'grep filters lines matching a pattern: grep <pattern> <file>. It is how you interrogate logs.',
    example: 'grep error app.log',
    takeaway: 'grep finds lines by pattern.',
    chips: ['error', 'app.log', '-i'],
    startingFS: { [HOME]: { 'app.log': 'ok started\nerror disk full\nok done\nerror timeout\n' } },
    startingCwd: HOME,
    expected: { command: 'grep error app.log', output: 'error disk full' },
    hints: ['Pattern first, file second.', 'Type grep error app.log, then Check.'],
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
    concept: 'The pipe (|) feeds one command\'s output into the next. Small tools chained together do big jobs.',
    example: 'ls | grep log',
    takeaway: '| chains small tools into big ones.',
    chips: ['| grep', 'log'],
    startingFS: { [HOME]: { 'app.log': 'x\n', 'notes.txt': 'x\n', 'data.csv': 'x\n' } },
    startingCwd: HOME,
    expected: { command: 'ls | grep log', output: 'app.log' },
    hints: ['Pipes chain commands with |', 'Type ls | grep log, then Check.'],
    xp: 25,
  },
];

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const nextLesson = (id: string): Lesson | undefined => {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
};
