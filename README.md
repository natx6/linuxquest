# LinuxQuest (MVP steps 1–3)

Mobile-first gamified PWA for learning Linux CLI. React 18 + Vite + TS + Tailwind + Zustand + React Router v6.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build + PWA service worker
npm run preview
```

## Routes

- `/onboarding` — distro picker (Ubuntu / Arch / Fedora / Alpine). Saves to `lq:user` via `userStore`, then → `/`.
- `/` — Hub (greeting, XP card, continue-learning, daily challenge stub, tracks).
- `/lesson/:id` — placeholder until steps 4–6 (VFS + parser + terminal + validator).
- `/tree` — placeholder until step 8.
- `/stats` — placeholder until step 7.

## Persistence

`src/lib/storage.ts` wraps `localStorage` (`lq:user`, `lq:progress`). Swap internals to IndexedDB later without touching callers. Stores hydrate on boot and persist (debounced) on change.

## PWA

`vite-plugin-pwa` configured: manifest (name LinuxQuest, theme `#0D1117`), precache + Google Fonts runtime cache. Icons: add `public/icons/icon-192.png` + `icon-512.png` before release build.

## Next (paused per plan)

Steps 4+: VirtualFS + CommandParser → Terminal → Lesson validation + XP → Hub/Stats real data → Skill tree → remaining commands → 10 lessons seed → PWA polish.
