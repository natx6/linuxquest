# LinuxQuest

Mobile-first gamified PWA for learning Linux CLI. React 18 + Vite + TS + Tailwind + xterm.js + Zustand + React Router v6. No backend — everything client-side.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build + PWA service worker
npm run preview
```

## Routes

- `/onboarding` — distro picker (Ubuntu / Arch / Fedora / Alpine) → saves to `lq:user` → `/`
- `/` — Hub (greeting, XP/level, continue-learning, daily challenge, tracks, install banner after 3 lessons)
- `/lesson/:id` — 10 Basics lessons with real xterm terminal, Hint/Reset/Check, XP + unlocks
- `/tree` — 4 tracks × 4 nodes with states + bottom sheet
- `/stats` + `/profile` — level hero, activity graph, badges, mastery ring, distro switch

## Core logic

- `lib/vfs.ts` — VirtualFS (`getNode/listDir/readFile/writeFile/mkdir/remove/resolvePath`)
- `lib/commands.ts` — 27 commands + pipes (`|`) + redirects (`>`/`>>`) + `-la` flag parsing + distro-aware `apt/pacman/dnf/apk` swap
- `lib/validator.ts` — checks command/output/fsState with partial credit
- `lib/xp.ts` — `lessonXp = 25 − hints×5 (floor 5)`, `xpForLevel(n) = 100·n·1.5^(n−1)`
- `lib/storage.ts` — `lq:user` / `lq:progress` wrappers (swappable to IndexedDB), `resetAll()` for dev
- `lib/push.ts` — push stub for streak reminders

## Content

10 Basics lessons (`data/lessons.ts`): pwd, ls, ls-a, cd, cat, mkdir+touch, cp+mv, rm, grep, pipes. Skill tree (`data/skillTree.ts`): Basics (unlocked) → Sysadmin → Dev → Network; finishing `basics.pipes` unlocks `sysadmin-n1`.

## PWA

Manifest (LinuxQuest, `#0D1117`, standalone, 192/512 icons), precache + font runtime cache, custom install banner after 3 completed lessons.

## Deploy (Vercel)

Import `natx6/linuxquest`, framework Vite, build `tsc && vite build`, output `dist`.
