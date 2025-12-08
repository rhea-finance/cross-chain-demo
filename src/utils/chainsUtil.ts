import Decimal from "decimal.js";
import Big from "big.js";
import _ from "lodash";
import {
  IChain,
  IIntentItem,
  config_evm,
  prepare_sign_message_evm,
  prepare_sign_message_solana,
  prepare_sign_message_btc,
  process_signature_btc,
  process_signature_solana,
  process_signature_evm,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message_btc } from "@/services/chains/btc";
import { sign_message_solana } from "@/services/chains/solana";
import { sign_message_evm } from "@/services/chains/evm";
import {
  ASSETS_CHAINS_SUPPORT_UI,
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SOLANA,
  ALL_CHAINS,
  EVM_CHAINS,
  SOLANA_CHAIN,
  BTC_CHAIN,
  INTENTS_TOKENS,
} from "@/services/chainConfig";
import { shrinkToken } from "./numbers";

export function formatAmount(
  amount: string | number | undefined,
  decimals = 24
) {
  if (!amount) return "";
  try {
    const n = new Big(amount).div(Big(10).pow(decimals)).toFixed();
    return n;
  } catch (error) {
    return "";
  }
}

export function parseAmount(
  amount: string | number | undefined,
  decimals = 24
) {
  if (!amount) return "";
  try {
    return new Big(amount).times(Big(10).pow(decimals)).toFixed(0);
  } catch (error) {
    return "";
  }
}

export function getAccountIdUi(accountId: string) {
  if (accountId) {
    return accountId.slice(0, 5) + "..." + accountId.slice(-5);
  }
  return "";
}

export function getChainUiByChain({
  chain,
  subChain,
}: {
  chain: IChain;
  subChain?: string;
}) {
  let icon = "";
  let name = "";
  if (chain == "evm" && subChain) {
    const target = EVM_CHAINS.find(
      (item) => item.label.toLowerCase() == subChain.toLowerCase()
    );
    icon = target.icon;
    name = target.label;
  } else if (chain == "solana") {
    icon = SOLANA_CHAIN.icon;
    name = SOLANA_CHAIN.label;
  } else if (chain == "btc") {
    icon = BTC_CHAIN.icon;
    name = BTC_CHAIN.label;
  }
  return {
    icon,
    name,
  };
}

export async function wait(time: number) {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
}
export interface IActionChainsData {
  evm?: {
    chainMeta: typeof ALL_CHAINS[0];
    tokenOnChainMeta: typeof ASSETS_CHAINS_EVM[0];
    supplortChainsMeta: Array<typeof EVM_CHAINS[0]>;
  };
  solana?: {
    chainMeta: typeof ALL_CHAINS[0];
    tokenOnChainMeta: typeof ASSETS_CHAINS_SOLANA[0];
  };
  btc?: {
    chainMeta: typeof ALL_CHAINS[0];
  };
}
export function getChainsByTokenSymbol(tokenSymbol: string): IActionChainsData {
  const result = {};
  const target = ASSETS_CHAINS_SUPPORT_UI.find((item) => {
    if (tokenSymbol == "NBTC" && item.symbol == "BTC") return true;
    return item.symbol?.toLowerCase() == tokenSymbol?.toLowerCase();
  });
  if (target) {
    const { supportChain } = target;
    supportChain.forEach((chain: IChain) => {
      if (chain == "solana") {
        const tokenOnChainMeta = ASSETS_CHAINS_SOLANA.find(
          (item) => item.symbol?.toLowerCase() == tokenSymbol?.toLowerCase()
        );
        result[chain] = {
          chainMeta: ALL_CHAINS["solana"],
          tokenOnChainMeta,
        };
      } else if (chain == "btc") {
        result[chain] = {
          chainMeta: ALL_CHAINS["btc"],
        };
      } else if (chain == "evm") {
        const tokenOnChainMeta = ASSETS_CHAINS_EVM.find(
          (item) => item.symbol?.toLowerCase() == tokenSymbol.toLowerCase()
        );
        const EVM_CHAINS_MAP = EVM_CHAINS.reduce((acc, cur) => {
          acc[cur.label] = cur;
          return acc;
        }, {});
        const chains = Object.keys(tokenOnChainMeta.addresses);
        const supplortChainsMeta = chains.reduce((acc, cur) => {
          acc.push(EVM_CHAINS_MAP[cur]);
          return acc;
        }, []);
        result[chain] = {
          chainMeta: ALL_CHAINS["evm"],
          tokenOnChainMeta,
          supplortChainsMeta,
        };
      }
    });
  }
  return result;
}

export function formatEvmChainName(name: string) {
  if (name?.toLowerCase() == "arbitrum" || name?.toLowerCase() == "arb")
    return "Arbitrum";
  if (name?.toLowerCase() == "ethereum" || name?.toLowerCase() == "eth")
    return "Ethereum";
  if (name?.toLowerCase() == "optimism" || name?.toLowerCase() == "op")
    return "Optimism";
  if (name?.toLowerCase() == "base") return "Base";
  if (name?.toLowerCase() == "bsc") return "BSC";
  return name;
}
export function formatSymbolName(name: string) {
  if (name?.toLowerCase() == "usdc") return "USDC";
  if (name?.toLowerCase() == "usdt") return "USDT";
  if (name?.toLowerCase() == "nbtc") return "BTC";
  return name;
}

export function getChainTokenMetadataBySymbol({
  chain,
  subChain,
  symbol,
}: {
  chain: IChain;
  subChain: string;
  symbol: string;
}) {
  const _symbol = formatSymbolName(symbol);
  if (!_symbol) return {};
  if (chain == "evm" && subChain) {
    const _subChain = formatEvmChainName(subChain);
    const target = ASSETS_CHAINS_EVM.find((item) => item.symbol == _symbol);
    const decimal = target.decimals[subChain] || target.decimals.default;
    const address = target.addresses[_subChain];
    return {
      symbol: _symbol,
      decimal,
      icon: target.icon,
      address,
    };
  } else if (chain == "solana") {
    const target = ASSETS_CHAINS_SOLANA.find((item) => item.symbol == _symbol);
    return target;
  } else if (chain == "btc") {
    return {
      symbol: "BTC",
      decimal: 8,
      icon: BTC_CHAIN.icon,
    };
  }
}

export function formatErrorMessage(message: string, originAsset?: string) {
  if (!message) {
    return "Unknown exception";
  } else if (message?.includes("low") && originAsset) {
    const tokens: IIntentItem[] = getLeafValues(INTENTS_TOKENS);
    const target = tokens.find((t) => t.assetId == originAsset);
    if (target) {
      const amount = message.split(" ").pop();
      const amountRead = shrinkToken(amount, target.decimals);
      return `Amount is too low for bridge, try at least ${amountRead}`;
    } else {
      return "Amount is too low for bridge";
    }
  } else if (message?.includes("(")) {
    const index = message.indexOf("(");
    return message.slice(0, index);
  }
  return message;
}
function getLeafValues(obj) {
  return _(obj)
    .values()
    .flatMap((v) => {
      if (_.isPlainObject(v)) {
        if ("assetId" in v) return [v];
        return getLeafValues(v);
      }
      return [];
    })
    .value();
}

export function getSlippageToleranceByAmountInUsd(usd: string) {
  if (new Decimal(usd || 0).lte(100)) return 10;
  if (new Decimal(usd || 0).gt(10000)) return 0.1;
  return 1;
}

export function getChainMetadataByIntentsChain(chain: string): {
  label: string;
  icon: string;
  id?: string;
} {
  if (chain == "arb") {
    return EVM_CHAINS.find(
      (item) => item.label.toLocaleLowerCase() == "arbitrum"
    );
  }
  if (chain == "eth") {
    return EVM_CHAINS.find(
      (item) => item.label.toLocaleLowerCase() == "ethereum"
    );
  }
  if (chain == "base") {
    return EVM_CHAINS.find((item) => item.label.toLocaleLowerCase() == "base");
  }
  if (chain == "bsc") {
    return EVM_CHAINS.find((item) => item.label.toLocaleLowerCase() == "bsc");
  }
  if (chain == "op") {
    return EVM_CHAINS.find(
      (item) => item.label.toLocaleLowerCase() == "optimism"
    );
  }
  if (chain == "btc") {
    return BTC_CHAIN;
  }
  if (chain == "sol") {
    return SOLANA_CHAIN;
  }
}

export function getJumpExporeUrl({
  chain,
  subChain,
  txHash,
}: {
  chain: "evm" | "solana" | "btc" | "near";
  subChain?: string;
  txHash: string;
}) {
  const _chain = chain?.toLowerCase();
  if (_chain == "near") {
    return `https://nearblocks.io/txns/${txHash}`;
  } else if (_chain == "btc") {
    return `https://mempool.space/tx/${txHash}`;
  } else if (_chain == "solana") {
    return `https://explorer.solana.com/tx/${txHash}`;
  } else if (_chain == "evm") {
    const exporeUrl =
      config_evm.chains[formatEvmChainName(subChain).toLowerCase()].explorerUrl;
    return `${exporeUrl}/tx/${txHash}`;
  }
}

export async function sign_message({
  chain,
  message,
}: {
  chain: IChain;
  message: string;
}) {
  if (chain == "btc") {
    return await sign_message_btc(message);
  } else if (chain == "solana") {
    return await sign_message_solana(message);
  } else if (chain == "evm") {
    return await sign_message_evm(message);
  }
  throw new Error(`Unsupported chain: ${chain}`);
}
