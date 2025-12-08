import _ from "lodash";
import { useCallback, useMemo } from "react";
import { getAddressByPublicKeyBase58 } from "btc-wallet";
import {
  useChainAccountStore,
  useChainAccountInstantStore,
} from "@/stores/chainAccount";
import { getAccountIdUi } from "@/utils/chainsUtil";
import useWalletConnect from "./useWalletConnect";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import { formatSymbolName } from "@/utils/chainsUtil";

interface IChainStatus {
  connected: boolean;
  accountId: string;
  accountIdUi: string;
  identityKey: string;
  binded: boolean;
  cannotUnbind: boolean;
  mcaAccountId: string;
  mcaAccountIdUi: string;
  signedIn: boolean;
  diff: boolean;
  isOtherMca: boolean;
  showConnectButton: boolean;
  showBindButton: boolean;
  showCreateButton: boolean;
  showChangeButton: boolean;
  isFirstLoginWallet: boolean;
}
export default function useChainsLendingStatus() {
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const mca_wallets = chainAccountStore.getMcaWallets();
  const mca = chainAccountStore.getMca();
  const btcAccounHasDiffMca = chainAccountStore.getBtcAccounIsOtherMca();
  const solanaAccountIsOtherMca =
    chainAccountStore.getSolanaAccountIsOtherMca();
  const evmAccountIsOtherMca = chainAccountStore.getEvmAccountIsOtherMca();
  const firstLoginWallet = chainAccountStore.getFirstLoginWallet();

  function getChansStatus(): {
    evmStatus: IChainStatus;
    solanaStatus: IChainStatus;
    btcStatus: IChainStatus;
  } {
    let _evmStatus: IChainStatus;
    let _solanaStatus: IChainStatus;
    let _btcStatus: IChainStatus;
    // evm
    {
      const w = mca_wallets.find((item) => item["EVM"]);
      const mcaAccountId = w ? "0x" + w["EVM"] : "";
      const accountId = evm?.accountId || "";
      const connected = !!(evm.isSignedIn && accountId == mcaAccountId);
      const isDiff = accountId && mcaAccountId && accountId !== mcaAccountId;
      const isOtherMca = evmAccountIsOtherMca;
      _evmStatus = {
        signedIn: !!evm.isSignedIn,
        connected,
        accountId,
        mcaAccountId,
        accountIdUi: getAccountIdUi(accountId),
        mcaAccountIdUi: getAccountIdUi(mcaAccountId),
        identityKey: mcaAccountId || accountId,
        binded: !!w,
        cannotUnbind:
          !!w &&
          (mca_wallets.length == 1 || (!solana.accountId && !btc.accountId)),
        diff: isDiff,
        isOtherMca,
        showChangeButton: isDiff || isOtherMca,
        showCreateButton: !!accountId && !(isDiff || isOtherMca) && !mca,
        showBindButton: !!accountId && !(isDiff || isOtherMca) && mca && !w,
        showConnectButton: !accountId,
        isFirstLoginWallet: firstLoginWallet == "evm",
      };
    }
    // solana
    {
      const w = mca_wallets.find((item) => item["Solana"]);
      const mcaAccountId = w?.["Solana"];
      const accountId = solana.accountId || "";
      const connected = !!(
        solana.isSignedIn && solana.accountId == mcaAccountId
      );
      const isDiff = accountId && mcaAccountId && accountId !== mcaAccountId;
      const isOtherMca = solanaAccountIsOtherMca;
      _solanaStatus = {
        signedIn: !!solana.isSignedIn,
        connected,
        accountId,
        mcaAccountId,
        accountIdUi: getAccountIdUi(accountId),
        mcaAccountIdUi: getAccountIdUi(mcaAccountId),
        identityKey: mcaAccountId || accountId,
        binded: !!w,
        cannotUnbind:
          !!w &&
          (mca_wallets.length == 1 || (!evm.accountId && !btc.accountId)),
        diff: isDiff,
        isOtherMca,
        showChangeButton: isDiff || isOtherMca,
        showCreateButton: !!accountId && !(isDiff || isOtherMca) && !mca,
        showBindButton: !!accountId && !(isDiff || isOtherMca) && mca && !w,
        showConnectButton: !accountId,
        isFirstLoginWallet: firstLoginWallet == "solana",
      };
    }
    // btc
    {
      const w = mca_wallets.find((item) => item["Bitcoin"]);
      const mcaAccountId = w
        ? getAddressByPublicKeyBase58(w["Bitcoin"]).p2wpkh
        : "";
      const accountId = btc.accountId || "";
      const connected = !!(btc.isSignedIn && accountId == mcaAccountId);
      const isDiff = accountId && mcaAccountId && accountId !== mcaAccountId;
      const isOtherMca = btcAccounHasDiffMca;
      _btcStatus = {
        signedIn: !!btc.isSignedIn,
        connected,
        mcaAccountId,
        accountId: accountId,
        accountIdUi: getAccountIdUi(accountId),
        mcaAccountIdUi: getAccountIdUi(mcaAccountId),
        identityKey: w?.["Bitcoin"] || btc.publicKey,
        binded: !!w,
        cannotUnbind:
          !!w &&
          (mca_wallets.length == 1 || (!evm.accountId && !solana.accountId)),
        diff: isDiff,
        isOtherMca,
        showChangeButton: isDiff || isOtherMca,
        showCreateButton: !!accountId && !(isDiff || isOtherMca) && !mca,
        showBindButton: !!accountId && !(isDiff || isOtherMca) && mca && !w,
        showConnectButton: !accountId,
        isFirstLoginWallet: firstLoginWallet == "btc",
      };
    }
    return {
      evmStatus: _evmStatus,
      solanaStatus: _solanaStatus,
      btcStatus: _btcStatus,
    };
  }
  return {
    getChansStatus,
  };
}

export function useSelectedChainStatus() {
  const chainAccountStore = useChainAccountStore();
  const chainBalances = chainAccountStore.getBalances();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const actionChainSeleced = chainAccountInstantStore.getActionChainSeleced();
  const getSymbolBalanceOfSelectedChain = useCallback(
    (_symbol: string) => {
      const symbol = formatSymbolName(_symbol);
      const { chain, subChain } = actionChainSeleced || {};
      let chainBalance: string | number = "0";
      if (chain == "evm") {
        chainBalance = chainBalances?.["evm"]?.[symbol]?.[subChain] || "0";
      } else if (chain == "solana") {
        chainBalance = chainBalances?.["solana"]?.[symbol]?.["balance"] || "0";
      } else if (chain == "btc") {
        chainBalance = chainBalances?.["btc"] || "0";
      }
      return chainBalance;
    },
    [actionChainSeleced, chainBalances]
  );

  return {
    getSymbolBalanceOfSelectedChain,
  };
}

export function useSelectedChainSymbolBalance({
  chain,
  subChain,
  symbol,
}: {
  chain: IChain;
  subChain: string;
  symbol: string;
}) {
  const chainAccountStore = useChainAccountStore();
  const chainBalances = chainAccountStore.getBalances();
  const chainBalance = useMemo(() => {
    let chainBalance: string | number = "0";
    const _symbol = formatSymbolName(symbol);
    if (chain == "evm") {
      chainBalance = chainBalances?.["evm"]?.[_symbol]?.[subChain] || "0";
    } else if (chain == "solana") {
      chainBalance = chainBalances?.["solana"]?.[_symbol]?.["balance"] || "0";
    } else if (chain == "btc") {
      chainBalance = chainBalances?.["btc"] || "0";
    }
    return chainBalance;
  }, [chainBalances, chain, subChain, symbol]);
  return chainBalance;
}
export function useSelectedChainAccountId({ chain }: { chain: IChain }) {
  const { evm, solana, btc } = useWalletConnect();
  const { identityKey, selectedChainAccountId } = useMemo(() => {
    if (chain == "evm") {
      return {
        identityKey: evm.accountId,
        selectedChainAccountId: evm.accountId,
      };
    } else if (chain == "solana") {
      return {
        identityKey: solana.accountId,
        selectedChainAccountId: solana.accountId,
      };
    } else if (chain == "btc") {
      return {
        identityKey: btc.publicKey,
        selectedChainAccountId: btc.accountId,
      };
    }
    return {};
  }, [chain, evm.accountId, solana.accountId, btc.publicKey, btc.accountId]);
  return {
    identityKey,
    selectedChainAccountId,
  };
}
export function useConnectedChainData() {
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const { evm, solana, btc } = useWalletConnect();
  const mcaWallets = chainAccountStore.getMcaWallets();
  const subChain = chainAccountStore.getSelectedEvmChain();
  const connectedChainData = useMemo(() => {
    if (!mca) return;
    for (const wallet of mcaWallets) {
      if (wallet["EVM"] && evm.accountId) {
        return {
          chain: "evm",
          identityKey: evm.accountId,
          accountId: evm.accountId,
          subChain,
        };
      } else if (wallet["Solana"] && solana.accountId) {
        return {
          chain: "solana",
          identityKey: solana.accountId,
          accountId: solana.accountId,
        };
      } else if (wallet["Bitcoin"] && btc.accountId && btc.publicKey) {
        return {
          chain: "btc",
          identityKey: btc.publicKey,
          accountId: btc.accountId,
        };
      }
    }
  }, [evm, solana, btc, mcaWallets, mca]) as {
    chain: IChain;
    identityKey: string;
    accountId: string;
    subChain?: string;
  };
  return connectedChainData;
}
