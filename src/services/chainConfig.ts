import { IChainData, IIntentsTokens } from "@/interface/lending/chains";
export const USDC_ICON = "https://assets.deltatrade.ai/assets/crypto/usdc.svg";
export const USDT_ICON = "https://assets.deltatrade.ai/assets/crypto/usdt.svg";
export const BTC_ICON = "https://img.rhea.finance/images/native-btc-icon.svg";
export const ZEC_ICON = "https://img.rhea.finance/images/zec-icon.svg";
export const ETH_ICON =
  "https://img.rhea.finance/images/ethereum-chain-icon.svg";
export const NEAR_ICON = "https://img.rhea.finance/images/NEARIcon.png";
export const WBTC_ICON = "https://img.rhea.finance/images/wbtc-yellow-icon.svg";

/** chain config start */
export const EVM_CHAINS = [
  {
    label: "Arbitrum",
    id: "0xA4B1",
    icon: "arbitrum-chain-icon.svg",
  },
  {
    label: "Ethereum",
    id: "0x1",
    icon: "ethereum-chain-icon.svg",
  },
  {
    label: "Base",
    id: "0x2105",
    icon: "base-chain-icon-v2.svg",
  },
  {
    label: "BSC",
    id: "0x38",
    icon: "bsc-chain-icon.svg",
  },
  {
    label: "Optimism",
    id: "0xa",
    icon: "optimism-chain-icon.svg",
  },
];
export const SOLANA_CHAIN = {
  label: "Solana",
  icon: "solana-chain-icon.svg",
};
export const BTC_CHAIN = {
  label: "Bitcoin",
  icon: "btc-chain-icon.svg",
};

export const CHAINS_FASTER = ["base", "bsc", "arbitrum"];

export const ALL_CHAINS: Record<string, IChainData> = {
  evm: {
    id: "evm",
    icon: "evm-chain-icon.svg",
    name: "EVM",
  },
  solana: {
    id: "solana",
    icon: "solana-chain-icon.svg",
    name: "Solana",
  },
  btc: {
    id: "btc",
    icon: "btc-chain-icon.svg",
    name: "Bitcoin",
  },
};
/** chain config end */

/** intents support chains tokens config */
export const INTENTS_TOKENS: IIntentsTokens = {
  USDC: {
    near: {
      assetId:
        "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      decimals: 6,
      blockchain: "near",
      symbol: "USDC",
      price: 0.999901,
      priceUpdatedAt: "2025-10-23T12:12:30.081Z",
      contractAddress:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    },
    evm: {
      Arbitrum: {
        assetId:
          "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        decimals: 6,
        blockchain: "arb",
        symbol: "USDC",
        price: 0.999901,
        priceUpdatedAt: "2025-10-23T12:12:30.081Z",
        contractAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      },
      Base: {
        assetId:
          "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
        decimals: 6,
        blockchain: "base",
        symbol: "USDC",
        price: 0.999901,
        priceUpdatedAt: "2025-10-23T12:12:30.081Z",
        contractAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      },
      BSC: {
        assetId: "nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r",
        decimals: 18,
        blockchain: "bsc",
        symbol: "USDC",
        price: 0.999901,
        priceUpdatedAt: "2025-10-23T12:12:30.081Z",
        contractAddress: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      },
      Ethereum: {
        assetId:
          "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        decimals: 6,
        blockchain: "eth",
        symbol: "USDC",
        price: 0.999901,
        priceUpdatedAt: "2025-10-23T12:12:30.081Z",
        contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
    solana: {
      assetId: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
      decimals: 6,
      blockchain: "sol",
      symbol: "USDC",
      price: 0.999901,
      priceUpdatedAt: "2025-10-23T12:12:30.081Z",
      contractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
  },
  USDT: {
    near: {
      assetId: "nep141:usdt.tether-token.near",
      decimals: 6,
      blockchain: "near",
      symbol: "USDT",
      price: 1,
      priceUpdatedAt: "2025-10-25T00:23:30.120Z",
      contractAddress: "usdt.tether-token.near",
    },
    evm: {
      Arbitrum: {
        assetId:
          "nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near",
        decimals: 6,
        blockchain: "arb",
        symbol: "USDT",
        price: 1,
        priceUpdatedAt: "2025-10-25T00:23:30.120Z",
        contractAddress: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
      },
      BSC: {
        assetId: "nep245:v2_1.omni.hot.tg:56_2CMMyVTGZkeyNZTSvS5sarzfir6g",
        decimals: 18,
        blockchain: "bsc",
        symbol: "USDT",
        price: 1,
        priceUpdatedAt: "2025-10-25T00:23:30.120Z",
        contractAddress: "0x55d398326f99059ff775485246999027b3197955",
      },
      Ethereum: {
        assetId:
          "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near",
        decimals: 6,
        blockchain: "eth",
        symbol: "USDT",
        price: 1,
        priceUpdatedAt: "2025-10-25T00:23:30.120Z",
        contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
    },
    solana: {
      assetId: "nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near",
      decimals: 6,
      blockchain: "sol",
      symbol: "USDT",
      price: 1,
      priceUpdatedAt: "2025-10-25T00:23:30.120Z",
      contractAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    },
  },
  NEAR: {
    near: {
      assetId: "nep141:wrap.near",
      decimals: 24,
      blockchain: "near",
      symbol: "wNEAR",
      price: 2.26,
      priceUpdatedAt: "2025-10-25T00:23:30.120Z",
      contractAddress: "wrap.near",
    },
    evm: {
      BSC: {
        assetId: "nep245:v2_1.omni.hot.tg:56_SZzgw3HSudhZcTwPWUTi2RJB19t",
        decimals: 18,
        blockchain: "bsc",
        symbol: "NEAR",
        price: 2.26,
        priceUpdatedAt: "2025-10-25T00:23:30.120Z",
        contractAddress: "0x1fa4a73a3f0133f0025378af00236f3abdee5d63",
      },
    },
  },
  BTC: {
    near: {
      assetId: "nep141:nbtc.bridge.near",
      decimals: 8,
      blockchain: "near",
      symbol: "BTC",
      price: 110880,
      priceUpdatedAt: "2025-10-25T00:23:30.120Z",
      contractAddress: "nbtc.bridge.near",
    },
    btc: {
      assetId: "nep141:btc.omft.near",
      decimals: 8,
      blockchain: "btc",
      symbol: "BTC",
      price: 110880,
      priceUpdatedAt: "2025-10-25T00:23:30.120Z",
    },
  },
  ZEC: {
    near: {
      assetId: "1cs_v1:near:nep141:zec.omft.near",
      decimals: 8,
      blockchain: "near",
      symbol: "ZEC",
      price: 515.8,
      priceUpdatedAt: "2025-11-11T00:37:30.131Z",
      contractAddress: "zec.omft.near",
    },
    solana: {
      assetId: "1cs_v1:sol:spl:A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS",
      decimals: 8,
      blockchain: "sol",
      symbol: "ZEC",
      price: 674.65,
      priceUpdatedAt: "2025-11-10T07:12:00.218Z",
      contractAddress: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS",
    },
  },
  ETH: {
    near: {
      assetId: "nep141:eth.bridge.near",
      decimals: 18,
      blockchain: "near",
      symbol: "ETH",
      price: 3414.79,
      priceUpdatedAt: "2025-11-13T00:16:30.228Z",
      contractAddress: "eth.bridge.near",
    },
    evm: {
      Arbitrum: {
        assetId: "nep141:arb.omft.near",
        decimals: 18,
        blockchain: "arb",
        symbol: "ETH",
        price: 3414.79,
        priceUpdatedAt: "2025-11-13T00:16:30.228Z",
      },
      Optimism: {
        assetId: "nep245:v2_1.omni.hot.tg:10_11111111111111111111",
        decimals: 18,
        blockchain: "op",
        symbol: "ETH",
        price: 3414.79,
        priceUpdatedAt: "2025-11-13T00:16:30.228Z",
      },
      Ethereum: {
        assetId: "nep141:eth.omft.near",
        decimals: 18,
        blockchain: "eth",
        symbol: "ETH",
        price: 3414.79,
        priceUpdatedAt: "2025-11-13T00:16:30.228Z",
      },
      Base: {
        assetId: "nep141:base.omft.near",
        decimals: 18,
        blockchain: "base",
        symbol: "ETH",
        price: 3414.79,
        priceUpdatedAt: "2025-11-13T00:16:30.228Z",
      },
    },
  },
  WBTC: {
    near: {
      assetId:
        "nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near",
      decimals: 8,
      blockchain: "near",
      symbol: "wBTC",
      price: 91878,
      priceUpdatedAt: "2025-11-20T06:49:00.243Z",
      contractAddress:
        "2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near",
    },
    evm: {
      Ethereum: {
        assetId:
          "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
        decimals: 8,
        blockchain: "eth",
        symbol: "WBTC",
        price: 91700,
        priceUpdatedAt: "2025-11-20T06:49:00.243Z",
        contractAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      },
    },
  },
};
/** asset on chain config start */
export const ASSETS_CHAINS_EVM = [
  {
    symbol: "USDC",
    decimals: { default: 6, BSC: 18 },
    icon: USDC_ICON,
    addresses: {
      Arbitrum: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      Ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      Base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      BSC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    },
  },
  {
    symbol: "USDT",
    decimals: { default: 6, BSC: 18 },
    icon: USDT_ICON,
    addresses: {
      Arbitrum: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
      Ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      BSC: "0x55d398326f99059ff775485246999027b3197955",
    },
  },
  {
    symbol: "NEAR",
    decimals: { default: 18 },
    icon: NEAR_ICON,
    addresses: {
      BSC: "0x1fa4a73a3f0133f0025378af00236f3abdee5d63",
    },
  },
  {
    symbol: "ETH",
    decimals: { default: 18 },
    icon: ETH_ICON,
    addresses: {
      Arbitrum: "",
      Ethereum: "",
      Base: "",
      Optimism: "",
    },
  },
  {
    symbol: "WBTC",
    decimals: { default: 8 },
    icon: WBTC_ICON,
    addresses: {
      Ethereum: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    },
  },
];
export const ASSETS_CHAINS_SOLANA = [
  {
    symbol: "USDC",
    decimal: 6,
    icon: USDC_ICON,
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  {
    symbol: "USDT",
    decimal: 6,
    icon: USDT_ICON,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
  {
    symbol: "ZEC",
    decimal: 8,
    icon: ZEC_ICON,
    address: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS",
  },
];
export const ASSETS_CHAINS_NEAR = [
  {
    symbol: "USDC",
    decimal: 6,
    icon: USDC_ICON,
    address: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    withdrawLimitAmount: "0.01",
  },
  {
    symbol: "USDt",
    decimal: 6,
    icon: USDT_ICON,
    address: "usdt.tether-token.near",
    withdrawLimitAmount: "0.01",
  },
  {
    symbol: "BTC",
    decimal: 8,
    icon: BTC_ICON,
    address: "nbtc.bridge.near",
    withdrawLimitAmount: "0.00002",
  },
  {
    symbol: "ZEC",
    decimal: 8,
    icon: ZEC_ICON,
    address: "zec.omft.near",
    withdrawLimitAmount: "0.0001",
  },
  {
    symbol: "ETH",
    decimal: 18,
    icon: ETH_ICON,
    address: "eth.bridge.near",
    withdrawLimitAmount: "0.0001",
  },
  {
    symbol: "NEAR",
    decimal: 24,
    icon: NEAR_ICON,
    address: "wrap.near",
    withdrawLimitAmount: "0.001",
  },
  {
    symbol: "WBTC",
    decimal: 8,
    icon: WBTC_ICON,
    address: "2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near",
    withdrawLimitAmount: "0.00002",
  },
];
// UI
export const ASSETS_CHAINS_SUPPORT_UI = [
  {
    symbol: "USDC",
    icon: USDC_ICON,
    supportChain: ["evm", "solana"],
  },
  {
    symbol: "USDT",
    icon: USDT_ICON,
    supportChain: ["evm", "solana"],
  },
  {
    symbol: "ETH",
    icon: ETH_ICON,
    supportChain: ["evm"],
  },
  {
    symbol: "NEAR",
    icon: NEAR_ICON,
    supportChain: ["evm"],
  },
  {
    symbol: "ZEC",
    icon: ZEC_ICON,
    supportChain: ["solana"],
  },
  {
    symbol: "BTC",
    icon: BTC_ICON,
    supportChain: ["btc"],
  },
  {
    symbol: "WBTC",
    icon: WBTC_ICON,
    supportChain: ["evm"],
  },
];
/** asset on chain config start */
