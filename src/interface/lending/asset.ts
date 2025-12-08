import {
  IAssetFarmReward,
  IMetadata,
  IAssetConfig,
} from "@rhea-finance/cross-chain-sdk";
interface IAssetFarmRewardPortfolio extends IAssetFarmReward {
  asset_farm_reward: IAssetFarmReward;
  boosted_shares: "string";
  unclaimed_amount: "string";
}
export interface INetTvlFarmReward {
  boosted_shares: string;
  booster_log_base: string;
  booster_log_bases: Record<string, string>;
  remaining_rewards: string;
  reward_per_day: string;
}

export interface INetTvlFarmRewards {
  [asset_id: string]: INetTvlFarmReward;
}

export interface NetTvlFarm {
  block_timestamp: string;
  rewards: INetTvlFarmRewards;
}

export interface Balance {
  available: string;
  total: string;
}

export interface IReward {
  rewards: IAssetFarmReward;
  metadata: IMetadata;
  config: IAssetConfig;
  price: number;
  type?: "portfolio" | "asset";
}

export interface IPortfolioReward {
  rewards: IAssetFarmRewardPortfolio;
  metadata: IMetadata;
  config: IAssetConfig;
  price: number;
  type?: "portfolio" | "asset";
}

export interface UIAsset {
  tokenId: string;
  icon: string;
  symbol: string;
  name: string;
  price: number;
  supplyApy: number;
  totalSupply: number;
  totalSupply$: string;
  totalSupplyMoney: number;
  borrowApy: number;
  totalBorrowed: number;
  totalBorrowed$: string;
  totalBorrowedMoney: number;
  availableLiquidity: number;
  availableLiquidity$: string;
  availableLiquidityMoney: number;
  collateralFactor: string;
  canUseAsCollateral: boolean;
  supplied: number;
  collateral: number;
  deposited: number;
  borrowed: number;
  availableNEAR: number;
  available: number;
  decimals: number;
  extraDecimals: number;
  brrrBorrow: number;
  brrrSupply: number;
  depositRewards: IReward[];
  borrowRewards: IReward[];
  can_borrow: boolean;
  can_deposit: boolean;
  tokens: IToken[];
  isLpToken: boolean;
}

export interface IToken {
  token_id: string;
  amount: string;
  usd?: string;
  metadata?: IMetadata;
}
