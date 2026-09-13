export type StepKind = 'predict' | 'terminal';
export type StepRole = 'learn' | 'drill' | 'prove';

export interface Lesson {
  id: string;
  nodeId: string;
  arc: string;
  role: StepRole;
  kind: StepKind;
  index: number;
  type: 'command' | 'puzzle' | 'scenario';
  title: string;
  track: string;
  prompt: string;
  /** Why this matters. Shown before practice. */
  concept: string;
  /** Worked example, hidden behind a toggle (guess first). Terminal steps only. */
  example?: string;
  /** One-liner shown after success. */
  takeaway: string;
  /** Touch-friendly key chips. Terminal steps only. */
  chips?: string[];
  /** Predict steps only. */
  question?: string;
  choices?: string[];
  answer?: number;
  explain?: string;
  startingFS?: Record<string, unknown>;
  startingCwd?: string;
  expected?: {
    command?: string;
    commandAlt?: string[];
    output?: string;
    outputAlt?: string[];
    fsState?: Record<string, unknown>;
  };
  hints: string[];
  xp: number;
}

export const ARCS: Record<string, { title: string; blurb: string }> = {
  orientation: { title: 'Orientation', blurb: 'Know where you are and what is around you.' },
  hidden: { title: 'Hidden files', blurb: 'See what the shell hides by default.' },
  moving: { title: 'Moving around', blurb: 'Navigate the directory tree on purpose.' },
  reading: { title: 'Reading files', blurb: 'Look inside files without opening an editor.' },
  creating: { title: 'Creating things', blurb: 'Build directories and files from nothing.' },
  organizing: { title: 'Organizing', blurb: 'Copy, move, and rename with intent.' },
  deleting: { title: 'Deleting', blurb: 'Remove precisely — there is no undo.' },
  searching: { title: 'Searching', blurb: 'Filter text instead of reading everything.' },
  chaining: { title: 'Chaining', blurb: 'Combine small tools into big ones.' },
};

const HOME = '/home/user';

function t(
  l: Omit<Lesson, 'kind' | 'role' | 'index' | 'type'> & { kind?: StepKind; role?: StepRole },
): Lesson {
  return {
    kind: 'terminal',
    role: 'drill',
    type: 'command',
    ...l,
  } as Lesson;
}

function p(
  l: Omit<Lesson, 'kind' | 'role' | 'index' | 'type' | 'expected'> & {
    question: string;
    choices: string[];
    answer: number;
    explain: string;
  },
): Lesson {
  return { kind: 'predict', role: 'learn', type: 'puzzle', ...l } as Lesson;
}

const RAW: Array<Omit<Lesson, 'index'>> = [
  // ——— Arc: orientation ———
  p({
    id: 'orientation.predict',
    nodeId: 'basics-n1',
    arc: 'orientation',
    title: 'Read the prompt',
    track: 'Basics',
    prompt: 'What will pwd print here?',
    concept: 'Your prompt already tells you where you are: user@linuxquest means the user, and ~ is shorthand for /home/user.',
    takeaway: '~ means /home/user.',
    question: 'Your prompt says user@linuxquest:~$. What will pwd print?',
    choices: ['/home/user', '/home', '~', 'user'],
    answer: 0,
    explain: '~ is the shell’s shorthand for your home directory, /home/user. pwd prints the real path.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.pwd',
    nodeId: 'basics-n1',
    arc: 'orientation',
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
  }),
  t({
    id: 'basics.ls',
    nodeId: 'basics-n1',
    arc: 'orientation',
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
  }),
  // ——— Arc: hidden ———
  p({
    id: 'hidden.predict',
    nodeId: 'basics-n1',
    arc: 'hidden',
    title: 'What is hidden?',
    track: 'Basics',
    prompt: 'Which files does plain ls show?',
    concept: 'Names starting with a dot are hidden by default. Config, keys, and tokens live there.',
    takeaway: 'Dotfiles hide from plain ls.',
    question: 'Home contains .bashrc, notes.txt, and Documents. What does plain ls show?',
    choices: ['All three', '.bashrc and notes.txt', 'notes.txt and Documents', 'Nothing — all hidden'],
    answer: 2,
    explain: 'Only .bashrc starts with a dot, so only it hides. notes.txt and Documents still show.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.ls-a',
    nodeId: 'basics-n1',
    arc: 'hidden',
    title: 'Hidden files',
    track: 'Basics',
    prompt: 'List all files including hidden ones.',
    concept: 'The -a flag reveals dotfiles. Pair it with -l for details.',
    example: 'ls -a',
    takeaway: 'Dotfiles hide; -a reveals them.',
    chips: ['-a', '-la'],
    startingFS: { [HOME]: { '.bashrc': 'export PATH\n', '.secret_token': 's3cr3t\n', 'Documents': {} } },
    startingCwd: HOME,
    expected: { command: 'ls -a', commandAlt: ['ls -la', 'ls -al', 'ls -a .'], output: '.secret_token' },
    hints: ['Filenames starting with . are hidden.', 'The -a (all) flag reveals them. Type ls -a.'],
    xp: 25,
  }),
  t({
    id: 'hidden.prove',
    nodeId: 'basics-n1',
    arc: 'hidden',
    role: 'prove',
    title: 'Token audit',
    track: 'Basics',
    prompt: 'Audit: someone hid a token file in home. Discover it, then print its contents.',
    concept: 'Real tasks chain commands: first discover (list everything), then act (read the file). No new syntax — just combine what you know.',
    takeaway: 'Discover first (ls -a), then act (cat).',
    chips: ['-a', '.secret_token'],
    startingFS: { [HOME]: { '.bashrc': 'export PATH\n', '.secret_token': 's3cr3t\n', 'Documents': {} } },
    startingCwd: HOME,
    expected: { command: 'cat .secret_token', output: 's3cr3t' },
    hints: ['Step 1: ls -a to discover the token file.', 'Step 2: cat the token file, then Check.'],
    xp: 25,
  }),
  // ——— Arc: moving ———
  p({
    id: 'moving.predict',
    nodeId: 'basics-n2',
    arc: 'moving',
    title: 'Parent directory',
    track: 'Basics',
    prompt: 'Where does cd .. take you?',
    concept: '.. always means the parent directory — one level up, wherever you are.',
    takeaway: '.. is one level up.',
    question: 'You are in /home/user/Documents. You run cd .. then pwd. What prints?',
    choices: ['/home/user', '/home/user/Documents', '/home', '/'],
    answer: 0,
    explain: '.. from Documents is /home/user. One cd .. moves exactly one level up.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.cd',
    nodeId: 'basics-n2',
    arc: 'moving',
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
  }),
  t({
    id: 'moving.prove',
    nodeId: 'basics-n2',
    arc: 'moving',
    role: 'prove',
    title: 'Absolute jump',
    track: 'Basics',
    prompt: 'Jump straight to /home/user/Documents with one absolute-path cd, then prove it with pwd.',
    concept: 'Relative paths depend on where you stand; absolute paths work from anywhere. From /tmp, cd Documents would fail — the absolute path never does.',
    takeaway: 'Absolute paths work from anywhere.',
    chips: ['/home/user/Documents'],
    startingFS: { [HOME]: { 'Documents': { 'todo.txt': 'x\n' } }, '/tmp': {} },
    startingCwd: '/tmp',
    expected: { command: 'pwd', output: `${HOME}/Documents` },
    hints: ['An absolute path starts with /', 'Try: cd /home/user/Documents, then pwd, then Check.'],
    xp: 25,
  }),
  // ——— Arc: reading ———
  p({
    id: 'reading.predict',
    nodeId: 'basics-n2',
    arc: 'reading',
    title: 'Concatenate',
    track: 'Basics',
    prompt: 'What does cat do with two files?',
    concept: 'cat is short for concatenate: with several files it prints them one after another.',
    takeaway: 'cat prints files back-to-back.',
    question: 'What does cat a.txt b.txt do?',
    choices: ['Prints a.txt then b.txt', 'Prints only a.txt', 'Merges them on disk', 'Errors — one file only'],
    answer: 0,
    explain: 'cat streams each file in order. Nothing on disk changes.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.cat',
    nodeId: 'basics-n2',
    arc: 'reading',
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
  }),
  // ——— Arc: creating ———
  p({
    id: 'creating.predict',
    nodeId: 'basics-n3',
    arc: 'creating',
    title: 'Make vs build',
    track: 'Basics',
    prompt: 'Which command creates an empty file?',
    concept: 'mkdir makes directories, touch makes (empty) files. Different nouns, different verbs.',
    takeaway: 'touch files, mkdir dirs.',
    question: 'Which creates a new EMPTY file called new.txt?',
    choices: ['touch new.txt', 'mkdir new.txt', 'echo new.txt', 'ls new.txt'],
    answer: 0,
    explain: 'touch creates the file (empty). mkdir would make a directory, echo without redirect just prints text.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.mkdir-touch',
    nodeId: 'basics-n3',
    arc: 'creating',
    title: 'Create things',
    track: 'Basics',
    prompt: 'Create a directory projects and an empty file todo.txt inside it.',
    concept: 'Combine a path (projects/todo.txt) to place the file inside the directory you just made.',
    example: 'mkdir projects',
    takeaway: 'mkdir for dirs, touch for files.',
    chips: ['projects', 'todo.txt'],
    startingFS: { [HOME]: {} },
    startingCwd: HOME,
    expected: { fsState: { home: { user: { projects: { 'todo.txt': '' } } } } },
    hints: ['Step 1: mkdir projects', 'Step 2: touch projects/todo.txt, then Check.'],
    xp: 25,
  }),
  t({
    id: 'creating.prove',
    nodeId: 'basics-n3',
    arc: 'creating',
    role: 'prove',
    title: 'Scaffold a project',
    track: 'Basics',
    prompt: 'Scaffold: projects/ containing src/ containing an empty main.txt.',
    concept: 'Nesting is just paths inside paths. Build it inside-out or outside-in — the tree is what matters.',
    takeaway: 'Trees are built one path at a time.',
    chips: ['projects', 'src', 'main.txt'],
    startingFS: { [HOME]: {} },
    startingCwd: HOME,
    expected: { fsState: { home: { user: { projects: { src: { 'main.txt': '' } } } } } },
    hints: ['mkdir projects, then mkdir projects/src', 'Then touch projects/src/main.txt, then Check.'],
    xp: 25,
  }),
  // ——— Arc: organizing ———
  p({
    id: 'organizing.predict',
    nodeId: 'basics-n3',
    arc: 'organizing',
    title: 'Copy vs move',
    track: 'Basics',
    prompt: 'Which command renames a file?',
    concept: 'cp duplicates (two files after), mv relocates (one file after). A rename is a move inside one directory.',
    takeaway: 'mv renames; cp duplicates.',
    question: 'Which renames notes.txt to final.txt?',
    choices: ['cp notes.txt final.txt', 'mv notes.txt final.txt', 'rm notes.txt final.txt', 'grep notes.txt final.txt'],
    answer: 1,
    explain: 'mv leaves a single file at the new name. cp would leave both behind.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.cp-mv',
    nodeId: 'basics-n3',
    arc: 'organizing',
    title: 'Copy and move',
    track: 'Basics',
    prompt: 'Copy notes.txt to notes.bak, then rename notes.bak to final.txt.',
    concept: 'Back up before you rename: the copy is your safety net.',
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
  }),
  // ——— Arc: deleting ———
  p({
    id: 'deleting.predict',
    nodeId: 'basics-n3',
    arc: 'deleting',
    title: 'No undo',
    track: 'Basics',
    prompt: 'What happens when rm hits a directory?',
    concept: 'rm deletes files permanently — no trash bin. Directories need -r, which is exactly why it is dangerous.',
    takeaway: 'rm has no undo.',
    question: 'You run rm archive/ where archive is a directory. What happens?',
    choices: ['Error: Is a directory', 'Deletes it silently', 'Moves it to trash', 'Asks for confirmation'],
    answer: 0,
    explain: 'rm refuses directories without -r. That refusal is a guardrail — respect it.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.rm',
    nodeId: 'basics-n3',
    arc: 'deleting',
    title: 'Delete',
    track: 'Basics',
    prompt: 'Delete the file trash.txt. keep.txt must survive.',
    concept: 'Aim carefully: name the exact file, and keep neighbours out of wildcards.',
    example: 'rm trash.txt',
    takeaway: 'rm is permanent. Aim carefully.',
    chips: ['trash.txt'],
    startingFS: { [HOME]: { 'trash.txt': 'bye\n', 'keep.txt': 'hi\n' } },
    startingCwd: HOME,
    expected: { command: 'rm trash.txt', fsState: { home: { user: { 'keep.txt': 'hi\n' } } } },
    hints: ['rm removes files.', 'Type rm trash.txt, then Check.'],
    xp: 25,
  }),
  // ——— Arc: searching ———
  p({
    id: 'searching.predict',
    nodeId: 'basics-n3',
    arc: 'searching',
    title: 'Case matters',
    track: 'Basics',
    prompt: 'Which lines does grep match?',
    concept: 'grep matches exact case by default. Error and error are different patterns (-i ignores case).',
    takeaway: 'grep is case-sensitive.',
    question: 'app.log holds "Error disk full" and "error timeout". What does grep error app.log match?',
    choices: ['Both lines', "Only 'error timeout'", "Only 'Error disk full'", 'Neither'],
    answer: 1,
    explain: 'Lowercase error only matches lowercase. Capital-E Error needs -i or an exact pattern.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.grep',
    nodeId: 'basics-n3',
    arc: 'searching',
    title: 'Search text',
    track: 'Basics',
    prompt: 'Find lines containing "error" in app.log.',
    concept: 'Pattern first, file second: grep <pattern> <file>. This is how you interrogate logs.',
    example: 'grep error app.log',
    takeaway: 'grep finds lines by pattern.',
    chips: ['error', 'app.log', '-i'],
    startingFS: { [HOME]: { 'app.log': 'ok started\nerror disk full\nok done\nerror timeout\n' } },
    startingCwd: HOME,
    expected: { command: 'grep error app.log', output: 'error disk full' },
    hints: ['Pattern first, file second.', 'Type grep error app.log, then Check.'],
    xp: 25,
  }),
  // ——— Arc: chaining ———
  p({
    id: 'chaining.predict',
    nodeId: 'basics-n4',
    arc: 'chaining',
    title: 'What flows?',
    track: 'Basics',
    prompt: 'What does grep receive in a pipe?',
    concept: 'A pipe feeds the left command’s text output into the right command’s input. grep never touches the disk here.',
    takeaway: 'Pipes carry text, not files.',
    question: 'In ls | grep log, what does grep receive?',
    choices: ['The text output of ls', 'The files on disk', 'Nothing until Enter', 'The contents of a log file'],
    answer: 0,
    explain: 'ls prints names as text; the pipe hands that text to grep, which filters lines.',
    hints: [],
    xp: 25,
  }),
  t({
    id: 'basics.pipes',
    nodeId: 'basics-n4',
    arc: 'chaining',
    title: 'Chain commands',
    track: 'Basics',
    prompt: 'List files, then pipe into grep to find "log".',
    concept: 'Small tools chained together do big jobs — list, then filter.',
    example: 'ls | grep log',
    takeaway: '| chains small tools into big ones.',
    chips: ['| grep', 'log'],
    startingFS: { [HOME]: { 'app.log': 'x\n', 'notes.txt': 'x\n', 'data.csv': 'x\n' } },
    startingCwd: HOME,
    expected: { command: 'ls | grep log', output: 'app.log' },
    hints: ['Pipes chain commands with |', 'Type ls | grep log, then Check.'],
    xp: 25,
  }),
  t({
    id: 'chaining.prove',
    nodeId: 'basics-n4',
    arc: 'chaining',
    role: 'prove',
    title: 'Triage the log',
    track: 'Basics',
    prompt: 'Triage app.log: count how many lines mention error. Pipe grep into wc -l.',
    concept: 'Three tools, one line: grep finds, wc -l counts. This exact pattern triages real production logs.',
    takeaway: 'grep | wc -l triages any log.',
    chips: ['| wc', '-l', 'error'],
    startingFS: { [HOME]: { 'app.log': 'ok started\nerror disk full\nok done\nerror timeout\n' } },
    startingCwd: HOME,
    expected: { command: 'grep error app.log | wc -l', output: ' 2 ' },
    hints: ['Step 1 works alone: grep error app.log', 'Then pipe it: grep error app.log | wc -l, then Check.'],
    xp: 25,
  }),
];

export const LESSONS: Lesson[] = RAW.map((l, i) => ({ ...l, index: i + 1 }));

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const nextLesson = (id: string): Lesson | undefined => {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
};
export const arcSteps = (arc: string): Lesson[] => LESSONS.filter((l) => l.arc === arc);
