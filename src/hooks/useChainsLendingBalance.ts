import { useEffect } from "react";
import useWalletConnect from "./useWalletConnect";
import { get_balance_btc } from "@/services/chains/btc";
import {
  get_balance_solana,
  get_batch_balances_solana,
} from "@/services/chains/solana";
import { get_balance_evm, get_batch_balances_evm } from "@/services/chains/evm";
import {
  useChainAccountStore,
  useChainAccountInstantStore,
} from "@/stores/chainAccount";
import {
  ASSETS_CHAINS_SOLANA,
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SUPPORT_UI,
  INTENTS_TOKENS,
} from "@/services/chainConfig";
import { IChain, IIntentItem } from "@rhea-finance/cross-chain-sdk";
import { formatEvmChainName, formatSymbolName } from "@/utils/chainsUtil";
import { LENDING_BALANCE_INTERVAL } from "@/services/constantConfig";

export default function useChainsLendingBalance() {
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const chainAccountInstantStore = useChainAccountInstantStore();
  useEffect(() => {
    let intervalId;
    if (btc.accountId) {
      chainAccountInstantStore.setBtcBalanceLoading(true);
      getBtcBalance();
      intervalId = setInterval(() => {
        chainAccountInstantStore.setBtcBalanceLoading(true);
        getBtcBalance();
      }, LENDING_BALANCE_INTERVAL);
    } else {
      chainAccountInstantStore.setBtcBalanceLoading(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [btc.accountId]);

  useEffect(() => {
    let intervalId;
    if (evm.accountId) {
      chainAccountInstantStore.setEvmBalanceLoading(true);
      getBalanceEVM(evm.accountId);
      intervalId = setInterval(() => {
        chainAccountInstantStore.setEvmBalanceLoading(true);
        getBalanceEVM(evm.accountId);
      }, LENDING_BALANCE_INTERVAL);
    } else {
      chainAccountInstantStore.setEvmBalanceLoading(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [evm.accountId]);

  useEffect(() => {
    let intervalId;
    if (solana.accountId) {
      chainAccountInstantStore.setSolanaBalanceLoading(true);
      getBalanceSolana();
      intervalId = setInterval(() => {
        chainAccountInstantStore.setSolanaBalanceLoading(true);
        getBalanceSolana();
      }, LENDING_BALANCE_INTERVAL);
    } else {
      chainAccountInstantStore.setSolanaBalanceLoading(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [solana.accountId]);

  async function getBtcBalance() {
    const { rawBalance, balance, availableBalance } = await get_balance_btc();
    chainAccountStore.setBalances({ btc: availableBalance });
    chainAccountInstantStore.setBtcBalanceLoading(false);
  }

  async function getBalanceSolana() {
    const tokensOnIntents = ASSETS_CHAINS_SUPPORT_UI.reduce((acc, cur) => {
      if (cur.supportChain.includes("solana")) {
        acc.push(INTENTS_TOKENS[cur.symbol].solana);
      }
      return acc;
    }, []);

    const res = await get_batch_balances_solana({
      tokens: tokensOnIntents,
    });
    const balanceList: IIntentItem[] = Object.values(res);
    const map = balanceList.reduce((acc, cur) => {
      acc[cur.symbol] = {
        address: cur.contractAddress,
        balance: cur.balanceRead,
      };
      return acc;
    }, {});
    chainAccountStore.setBalances({ solana: map });
    chainAccountInstantStore.setSolanaBalanceLoading(false);
  }
  async function getBalanceEVM(userAddress: string) {
    const tokensOnIntentsMap = ASSETS_CHAINS_SUPPORT_UI.reduce((acc, cur) => {
      if (cur.supportChain.includes("evm")) {
        Object.values(INTENTS_TOKENS[cur.symbol].evm).forEach((t) => {
          if (acc[t.blockchain]) {
            acc[t.blockchain].push(t);
          } else {
            acc[t.blockchain] = [t];
          }
        });
      }
      return acc;
    }, {});
    const balanceList: IIntentItem[] = [];
    for (const chainTag of Object.keys(tokensOnIntentsMap)) {
      const res = await get_batch_balances_evm({
        chain: formatEvmChainName(chainTag).toLowerCase(),
        userAddress,
        tokens: tokensOnIntentsMap[chainTag],
      });

      balanceList.push(...Object.values(res));
    }
    const ASSETS_CHAINS_EVM_Ui = ASSETS_CHAINS_EVM.filter((item) => {
      const target = ASSETS_CHAINS_SUPPORT_UI.find(
        (item2) =>
          item2.symbol == item.symbol && item2.supportChain.includes("evm")
      );
      return !!target;
    });
    const map = {};
    for (const item of ASSETS_CHAINS_EVM_Ui) {
      const { addresses, symbol } = item;
      for (const [chain, address] of Object.entries(addresses)) {
        const target = balanceList.find(
          (i) =>
            i.symbol == symbol &&
            formatEvmChainName(i.blockchain) == formatEvmChainName(chain)
        );
        if (map[symbol]) {
          map[symbol][chain] = target.balanceRead;
        } else {
          map[symbol] = {
            [chain]: target.balanceRead,
          };
        }
      }
    }
    chainAccountStore.setBalances({ evm: map });
    chainAccountInstantStore.setEvmBalanceLoading(false);
  }
  async function getBalanceSolanaByAddresses() {
    const ids = ASSETS_CHAINS_SOLANA.map((item) => item.address);
    const symbols = ASSETS_CHAINS_SOLANA.map((item) => item.symbol);
    const pending = ids.map((id) => get_balance_solana({ tokenAddress: id }));
    const res = await Promise.allSettled(pending);
    const map = res.reduce((acc, cur, index) => {
      if (cur.status == "fulfilled") {
        acc[symbols[index]] = {
          address: ids[index],
          balance: cur.value,
        };
      } else {
        acc[symbols[index]] = {
          address: ids[index],
          balance: "0",
        };
      }
      return acc;
    }, {});
    chainAccountStore.setBalances({ solana: map });
    chainAccountInstantStore.setSolanaBalanceLoading(false);
  }
  async function getBalanceEVMByAddresses(userAddress: string) {
    const map = {};
    const ASSETS_CHAINS_EVM_Ui = ASSETS_CHAINS_EVM.filter((item) => {
      const target = ASSETS_CHAINS_SUPPORT_UI.find(
        (item2) =>
          item2.symbol == item.symbol && item2.supportChain.includes("evm")
      );
      return !!target;
    });
    for (const item of ASSETS_CHAINS_EVM_Ui) {
      const { addresses, decimals, symbol } = item;
      for (const [chain, address] of Object.entries(addresses)) {
        const b = await get_balance_evm({
          userAddress,
          token: {
            symbol,
            address,
            decimals: decimals[chain] || decimals.default,
          },
          chain,
        });
        if (map[symbol]) {
          map[symbol][chain] = b;
        } else {
          map[symbol] = {
            [chain]: b,
          };
        }
      }
    }
    chainAccountStore.setBalances({ evm: map });
    chainAccountInstantStore.setEvmBalanceLoading(false);
  }
}

export function useUpdateTokenChainBalance() {
  const chainAccountStore = useChainAccountStore();
  const allBalances = chainAccountStore.getBalances();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const {
    evm: evmConnected,
    solana: solanaConnected,
    btc: btcConnected,
  } = useWalletConnect();
  async function updateSimgleTokenChainBalance({
    chain,
    subChain,
    symbol,
  }: {
    chain: IChain;
    subChain: string;
    symbol: string;
  }) {
    const _symbol = formatSymbolName(symbol);
    if (chain == "evm" && evmConnected.accountId) {
      const _subChain = formatEvmChainName(subChain);
      chainAccountInstantStore.setEvmBalanceLoading(true);
      const token = ASSETS_CHAINS_EVM.find((item) => item.symbol == _symbol);
      const address = token.addresses[_subChain];
      const decimals = token.decimals;
      const b = await get_balance_evm({
        userAddress: evmConnected.accountId,
        token: {
          symbol: _symbol,
          address,
          decimals: decimals[_subChain] || decimals.default,
        },
        chain: _subChain,
      });
      const { evm } = allBalances;
      evm[_symbol][_subChain] = b;
      chainAccountStore.setBalances({ evm });
      chainAccountInstantStore.setEvmBalanceLoading(false);
    } else if (chain == "solana" && solanaConnected.accountId) {
      chainAccountInstantStore.setSolanaBalanceLoading(true);
      const token = ASSETS_CHAINS_SOLANA.find((item) => item.symbol == _symbol);
      const b = await get_balance_solana({ tokenAddress: token.address });
      const { solana } = allBalances;
      solana[_symbol].balance = b;
      chainAccountStore.setBalances({ solana });
      chainAccountInstantStore.setSolanaBalanceLoading(false);
    } else if (chain == "btc" && btcConnected.accountId) {
      chainAccountInstantStore.setBtcBalanceLoading(true);
      const { availableBalance } = await get_balance_btc();
      chainAccountStore.setBalances({ btc: availableBalance });
      chainAccountInstantStore.setBtcBalanceLoading(false);
    }
  }
  return {
    updateSimgleTokenChainBalance,
  };
}
