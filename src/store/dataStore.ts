import { create } from "zustand";

interface DataState {
  sessionKey: string | null;
  fileName: string | null;
  rowCount: number;
  colCount: number;
  columns: string[];
  columnTypes: Record<string, string>;
  cleanLog: string[];
  hasCleaned: boolean;
  hasStats: boolean;
  hasPredictions: boolean;
  setSession: (key: string, name: string, rows: number, cols: number, columns: string[], types: Record<string, string>) => void;
  setCleanLog: (log: string[]) => void;
  setHasCleaned: (v: boolean) => void;
  setHasStats: (v: boolean) => void;
  setHasPredictions: (v: boolean) => void;
  clearSession: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  sessionKey: null,
  fileName: null,
  rowCount: 0,
  colCount: 0,
  columns: [],
  columnTypes: {},
  cleanLog: [],
  hasCleaned: false,
  hasStats: false,
  hasPredictions: false,
  setSession: (key, name, rows, cols, columns, types) =>
    set({
      sessionKey: key,
      fileName: name,
      rowCount: rows,
      colCount: cols,
      columns,
      columnTypes: types,
      cleanLog: [],
      hasCleaned: false,
      hasStats: false,
      hasPredictions: false,
    }),
  setCleanLog: (log) => set({ cleanLog: log }),
  setHasCleaned: (v) => set({ hasCleaned: v }),
  setHasStats: (v) => set({ hasStats: v }),
  setHasPredictions: (v) => set({ hasPredictions: v }),
  clearSession: () =>
    set({
      sessionKey: null,
      fileName: null,
      rowCount: 0,
      colCount: 0,
      columns: [],
      columnTypes: {},
      cleanLog: [],
      hasCleaned: false,
      hasStats: false,
      hasPredictions: false,
    }),
}));

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  toggle: () => set((s) => ({ isDark: !s.isDark })),
  soundEnabled: false,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));

interface GuideState {
  showGuide: boolean;
  dismissGuide: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  showGuide: true,
  dismissGuide: () => set({ showGuide: false }),
}));
