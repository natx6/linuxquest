import { create } from 'zustand';
import * as storage from '../lib/storage';

interface ProgressState {
  unlockedNodes: string[];
  completedLessons: string[];
  currentLessonId: string;
  completeLesson: (lessonId: string, nextLessonId?: string, unlocks?: string[]) => void;
  unlockNode: (nodeId: string) => void;
  hydrate: () => void;
}

const FALLBACK = {
  unlockedNodes: ['basics.pwd'],
  completedLessons: [] as string[],
  currentLessonId: 'basics.pwd',
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...storage.get('progress', FALLBACK),

  completeLesson: (lessonId, nextLessonId, unlocks = []) =>
    set({
      completedLessons: Array.from(new Set([...get().completedLessons, lessonId])),
      currentLessonId: nextLessonId ?? get().currentLessonId,
      unlockedNodes: Array.from(new Set([...get().unlockedNodes, ...unlocks])),
    }),

  unlockNode: (nodeId) =>
    set({ unlockedNodes: Array.from(new Set([...get().unlockedNodes, nodeId])) }),

  hydrate: () => set(storage.get('progress', FALLBACK)),
}));

const persist = storage.debounce((s: ProgressState) => {
  storage.set('progress', {
    unlockedNodes: s.unlockedNodes,
    completedLessons: s.completedLessons,
    currentLessonId: s.currentLessonId,
  });
}, 250);

useProgressStore.subscribe((s) => persist(s));
