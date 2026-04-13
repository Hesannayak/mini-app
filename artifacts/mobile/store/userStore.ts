import { create } from 'zustand';

export type Language = 'hi' | 'en' | 'ta' | 'te';
export type PermissionLevel = 1 | 2 | 3 | 4;

interface UserState {
  name: string | null;
  language: Language;
  permissionLevel: PermissionLevel;
  miniScore: number;
  setUser: (user: { name?: string; language: Language; permissionLevel: PermissionLevel; miniScore: number }) => void;
  setLanguage: (language: Language) => void;
  setMiniScore: (score: number) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: null,
  language: 'hi',
  permissionLevel: 1,
  miniScore: 72,

  setUser: (user) =>
    set({
      name: user.name ?? null,
      language: user.language,
      permissionLevel: user.permissionLevel,
      miniScore: user.miniScore,
    }),

  setLanguage: (language) => set({ language }),
  setMiniScore: (miniScore) => set({ miniScore }),
  reset: () => set({ name: null, language: 'hi', permissionLevel: 1, miniScore: 72 }),
}));
