import { useEffect, useRef } from "react";
import useWalletConnect from "./useWalletConnect";
import { useChainAccountStore } from "@/stores/chainAccount";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
import { useAppDispatch } from "@/hooks/lending/useRedux";

export function useChainsLendingLoginOut() {
  const btcFirstRun = useRef(true);
  const evmFirstRun = useRef(true);
  const solanaFirstRun = useRef(true);
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const { getChansStatus } = useChainsLendingStatus();
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  const firstLoginWallet = chainAccountStore.getFirstLoginWallet();
  const mca = chainAccountStore.getMca();
  const mcaWallets = chainAccountStore.getMcaWallets();
  const dispatch = useAppDispatch();
  const connectedSolanaAccountId = solana.accountId;
  /**
   * login out
   * action manual
   */
  useEffect(() => {
    if (evmFirstRun.current) {
      evmFirstRun.current = false;
      return;
    }
    if (!evm.accountId) {
      // lending
      chainAccountStore.setBalances({ evm: {} });
      chainAccountStore.setEvmAccountIsOtherMca(false);
      if (!solanaStatus.connected && !btcStatus.connected) {
        clearMutiAccountStore();
      }
      if (evmStatus.isFirstLoginWallet) {
        chainAccountStore.setFirstLoginWallet(null);
      }
    }
  }, [evm.accountId]);

  useEffect(() => {
    if (solanaFirstRun.current) {
      solanaFirstRun.current = false;
      return;
    }
    if (!solana.accountId) {
      // lending
      chainAccountStore.setBalances({ solana: {} });
      chainAccountStore.setSolanaAccountIsOtherMca(false);
      if (!evmStatus.connected && !btcStatus.connected) {
        clearMutiAccountStore();
      }
      if (solanaStatus.isFirstLoginWallet) {
        chainAccountStore.setFirstLoginWallet(null);
      }
    }
  }, [solana.accountId]);
  useEffect(() => {
    if (btcFirstRun.current) {
      btcFirstRun.current = false;
      return;
    }
    if (!btc.accountId) {
      // lending
      chainAccountStore.setBalances({ btc: "0" });
      chainAccountStore.setBtcAccountIsOtherMca(false);
      if (!solanaStatus.connected && !evmStatus.connected) {
        clearMutiAccountStore();
      }
      if (btcStatus.isFirstLoginWallet) {
        chainAccountStore.setFirstLoginWallet(null);
      }
    }
  }, [btc.accountId]);
  /**
   * login out
   * action auto
   */
  useEffect(() => {
    if (
      !evm.accountId &&
      !solana.accountId &&
      !btc.accountId &&
      !firstLoginWallet
    ) {
      clearMutiAccountStore();
    }
  }, [
    evm.accountId,
    solana.accountId,
    btc.accountId,
    firstLoginWallet,
    mca,
    JSON.stringify(mcaWallets || []),
  ]);

  function clearMutiAccountStore() {
    chainAccountStore.setMca("");
    chainAccountStore.setMcaWallets([]);
  }
}
