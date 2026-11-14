import { create } from 'zustand';

export type QuickView = 'menu' | 'meal' | 'spend' | 'skill' | 'people' | 'plan';

interface QuickLogStore {
  open: boolean;
  view: QuickView;
  show: (view?: QuickView) => void;
  setView: (view: QuickView) => void;
  close: () => void;
}

/** Global Quick Log sheet — reachable from the tab bar and from any card. */
export const useQuickLog = create<QuickLogStore>((set) => ({
  open: false,
  view: 'menu',
  show: (view = 'menu') => set({ open: true, view }),
  setView: (view) => set({ view }),
  close: () => set({ open: false }),
}));

export const openQuickLog = (view?: QuickView) => useQuickLog.getState().show(view);
