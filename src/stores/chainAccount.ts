import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import {
  IAccountAssetsMap,
  IActionChainSeleced,
} from "@/interface/lending/chains";
export interface IChainBalances {
  btc: string | number;
  solana: Record<string, Record<string, string | number>>;
  evm: Record<string, Record<string, string | number>>;
}
export interface IMCAWallet {
  EVM?: string;
  Solana?: string;
  Bitcoin?: string;
}

export const useChainAccountStore = create(
  persist(
    (set: any, get: any) => ({
      mca: "",
      mcaWallets: [],
      selectedEvmChain: "",
      balances: {},
      balancesUi: {},
      evmAccountIsOtherMca: false,
      solanaAccountIsOtherMca: false,
      btcAccountIsOtherMca: false,
      firstLoginWallet: null,
      getFirstLoginWallet: (): IChain => get().firstLoginWallet,
      setFirstLoginWallet: (firstLoginWallet: IChain) =>
        set({ firstLoginWallet }),
      getEvmAccountIsOtherMca: (): boolean => get().evmAccountIsOtherMca,
      setEvmAccountIsOtherMca: (evmAccountIsOtherMca: boolean) =>
        set({ evmAccountIsOtherMca }),

      getSolanaAccountIsOtherMca: (): boolean => get().solanaAccountIsOtherMca,
      setSolanaAccountIsOtherMca: (solanaAccountIsOtherMca: boolean) =>
        set({ solanaAccountIsOtherMca }),

      getBtcAccounIsOtherMca: (): boolean => get().btcAccountIsOtherMca,
      setBtcAccountIsOtherMca: (btcAccountIsOtherMca: boolean) =>
        set({ btcAccountIsOtherMca }),

      getSelectedEvmChain: () => get().selectedEvmChain,
      setSelectedEvmChain: (selectedEvmChain: string) =>
        set({ selectedEvmChain }),
      getMcaWallets: (): IMCAWallet[] => get().mcaWallets,
      setMcaWallets: (mcaWallets: IMCAWallet[]) => set({ mcaWallets }),
      getMca: () => get().mca,
      setMca: (mca: string) => set({ mca }),

      getBalances: (): IChainBalances => get().balances,
      setBalances: (balances: Record<string, any>) =>
        set((state) => {
          return {
            balances: {
              ...state.balances,
              ...balances,
            },
          };
        }),
      getBalancesUi: (): IAccountAssetsMap => get().balancesUi,
      setBalancesUi: (balancesUi: IAccountAssetsMap) => set({ balancesUi }),
    }),
    {
      name: "_cached_chain_account",
      version: 0.1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
export const useChainAccountInstantStore = create((set: any, get: any) => ({
  evmBalanceLoading: false,
  solanaBalanceLoading: false,
  btcBalanceLoading: false,
  actionChainSeleced: {},
  getActionChainSeleced: (): IActionChainSeleced =>
    get().actionChainSeleced || {},
  setActionChainSeleced: (actionChainSeleced: IActionChainSeleced) =>
    set({ actionChainSeleced }),
  getEvmBalanceLoading: (): boolean => get().evmBalanceLoading,
  setEvmBalanceLoading: (evmBalanceLoading: boolean) =>
    set({ evmBalanceLoading }),
  getSolanaBalanceLoading: (): boolean => get().solanaBalanceLoading,
  setSolanaBalanceLoading: (solanaBalanceLoading: boolean) =>
    set({ solanaBalanceLoading }),
  getBtcBalanceLoading: (): boolean => get().btcBalanceLoading,
  setBtcBalanceLoading: (btcBalanceLoading: boolean) =>
    set({ btcBalanceLoading }),
}));
