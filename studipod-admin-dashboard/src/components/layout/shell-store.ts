import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/** "auto" follows the screen: expanded from 1280px, collapsed below. */
export type SidebarMode = 'auto' | 'expanded' | 'collapsed';

type ShellState = {
  /** Per-viewer preference, remembered in this browser only. */
  sidebarMode: SidebarMode;
  /** The one sidebar group that is open (accordion); null keeps the active group open. */
  openGroupKey: string | null;
  isMobileNavOpen: boolean;
  setSidebarMode: (mode: SidebarMode) => void;
  setOpenGroupKey: (key: string | null) => void;
  setMobileNavOpen: (open: boolean) => void;
};

/** localStorage that never throws (private mode, blocked storage, previews). */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // The preference simply is not remembered.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing to remove.
    }
  },
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarMode: 'auto',
      openGroupKey: null,
      isMobileNavOpen: false,
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      setOpenGroupKey: (openGroupKey) => set({ openGroupKey }),
      setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
    }),
    {
      name: 'studipod-admin:shell',
      storage: createJSONStorage(() => safeLocalStorage),
      // Only the sidebar preference is remembered; it holds no personal data.
      partialize: (state) => ({ sidebarMode: state.sidebarMode }),
    },
  ),
);

/** Whether the desktop sidebar is collapsed for this viewer and screen width. */
export function isSidebarCollapsed(mode: SidebarMode, isWideScreen: boolean): boolean {
  if (mode === 'auto') return !isWideScreen;
  return mode === 'collapsed';
}
