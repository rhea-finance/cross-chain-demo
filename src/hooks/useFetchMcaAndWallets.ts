import {
  IChain,
  getMcaByWallet,
  getListWalletsByMca,
} from "@rhea-finance/cross-chain-sdk";
import { useChainAccountStore } from "@/stores/chainAccount";
export default function useFetchMcaAndWallets() {
  const chainAccountStore = useChainAccountStore();
  async function fetchMcaAndWallets({
    chain,
    identityKey,
  }: {
    chain: IChain;
    identityKey: string;
  }) {
    const mca_id = await getMcaByWallet({ chain, identityKey });
    if (mca_id) {
      const wallets = await getListWalletsByMca(mca_id);
      chainAccountStore.setMca(mca_id);
      chainAccountStore.setMcaWallets(wallets);
    }
  }
  async function fetchAndUpdateWallets() {
    const mca = chainAccountStore.getMca();
    if (mca) {
      const wallets = await getListWalletsByMca(mca);
      chainAccountStore.setMcaWallets(wallets);
    }
  }
  return {
    fetchMcaAndWallets,
    fetchAndUpdateWallets,
  };
}
