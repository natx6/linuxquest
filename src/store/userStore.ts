import { create } from 'zustand';
import * as storage from '../lib/storage';

export type Distro = 'ubuntu' | 'arch' | 'fedora' | 'alpine' | null;

interface UserState {
  distro: Distro;
  xp: number;
  streak: number;
  completedLessons: number;
  onboarded: boolean;
  setDistro: (d: Exclude<Distro, null>) => void;
  addXp: (n: number) => void;
  completeLesson: () => void;
  setOnboarded: (v: boolean) => void;
  hydrate: () => void;
}

const FALLBACK = { distro: null as Distro, xp: 0, streak: 0, completedLessons: 0, onboarded: false };

export const useUserStore = create<UserState>((set, get) => ({
  ...storage.get('user', FALLBACK),

  setDistro: (distro) => set({ distro }),
  addXp: (n) => set({ xp: get().xp + n }),
  completeLesson: () =>
    set({ completedLessons: get().completedLessons + 1, streak: get().streak === 0 ? 1 : get().streak }),
  setOnboarded: (v) => set({ onboarded: v }),
  hydrate: () => set(storage.get('user', FALLBACK)),
}));

// Persist (debounced) — wired once at module load.
const persist = storage.debounce((s: UserState) => {
  storage.set('user', {
    distro: s.distro,
    xp: s.xp,
    streak: s.streak,
    completedLessons: s.completedLessons,
    onboarded: s.onboarded,
  });
}, 250);

useUserStore.subscribe((s) => persist(s));
