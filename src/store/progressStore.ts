import { create } from 'zustand';
import * as storage from '../lib/storage';

export const REVIEW_AFTER_MS = 24 * 60 * 60 * 1000;

interface ProgressState {
  unlockedNodes: string[];
  completedLessons: string[];
  completedAt: Record<string, number>;
  currentLessonId: string;
  completeLesson: (lessonId: string, nextLessonId?: string, unlocks?: string[]) => void;
  touchReviewed: (lessonId: string) => void;
  unlockNode: (nodeId: string) => void;
  hydrate: () => void;
}

const FALLBACK = {
  unlockedNodes: ['basics-n1'],
  completedLessons: [] as string[],
  completedAt: {} as Record<string, number>,
  currentLessonId: 'orientation.predict',
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...storage.get('progress', FALLBACK),

  completeLesson: (lessonId, nextLessonId, unlocks = []) =>
    set({
      completedLessons: Array.from(new Set([...get().completedLessons, lessonId])),
      completedAt: { ...get().completedAt, [lessonId]: Date.now() },
      currentLessonId: nextLessonId ?? get().currentLessonId,
      unlockedNodes: Array.from(new Set([...get().unlockedNodes, ...unlocks])),
    }),

  touchReviewed: (lessonId) =>
    set({ completedAt: { ...get().completedAt, [lessonId]: Date.now() } }),

  unlockNode: (nodeId) =>
    set({ unlockedNodes: Array.from(new Set([...get().unlockedNodes, nodeId])) }),

  hydrate: () => set(storage.get('progress', FALLBACK)),
}));

const persist = storage.debounce((s: ProgressState) => {
  storage.set('progress', {
    unlockedNodes: s.unlockedNodes,
    completedLessons: s.completedLessons,
    completedAt: s.completedAt,
    currentLessonId: s.currentLessonId,
  });
}, 250);

useProgressStore.subscribe((s) => persist(s));
