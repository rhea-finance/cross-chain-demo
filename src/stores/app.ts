import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set: any, get: any) => ({
      isCollapse: true,
      getIsCollapse: (): boolean => get().isCollapse,
      setIsCollapse: (isCollapse: boolean) => set({ isCollapse }),
    }),
    {
      name: "_cached_lending_app",
      version: 0.1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
