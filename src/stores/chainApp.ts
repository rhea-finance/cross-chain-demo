import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useChainAppStore = create(
  persist(
    (set: any, get: any) => ({
      createMcaFeePaged: {},
      nearValuesPaged: {},
      relayerGasFees: {},
      relayerId: "",
      getRelayerId: (): string => get().relayerId,
      setRelayerId: (relayerId: string) => set({ relayerId }),
      getRelayerGasFees: (): Record<string, string> => get().relayerGasFees,
      setRelayerGasFees: (relayerGasFees: Record<string, string>) =>
        set({ relayerGasFees }),
      getCreateMcaFeePaged: (): Record<string, string> =>
        get().createMcaFeePaged,
      setCreateMcaFeePaged: (createMcaFeePaged: Record<string, string>) =>
        set({ createMcaFeePaged }),
      getNearValuesPaged: (): Record<string, string> => get().nearValuesPaged,
      setNearValuesPaged: (nearValuesPaged: Record<string, string>) =>
        set({ nearValuesPaged }),
    }),
    {
      name: "_cached_chain_app",
      version: 0.1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
