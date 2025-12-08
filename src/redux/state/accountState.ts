import { Portfolio } from "@rhea-finance/cross-chain-sdk";
import {
  Farm,
  initialStaking,
  AccountFarmRewardView,
} from "@rhea-finance/cross-chain-sdk";

interface Balance {
  [tokenId: string]: string;
}

type Status = "pending" | "fulfilled" | "rejected" | undefined;
export interface AccountState {
  accountId: string;
  balances: Balance;
  portfolio: Portfolio;
  status: Status;
  fetchedAt: string | undefined;
  isClaiming: Status;
}
export interface IAccountFarms {
  supplied: {
    [tokenId: string]: Farm;
  };
  borrowed: {
    [tokenId: string]: Farm;
  };
  netTvl: {
    [tokenId: string]: AccountFarmRewardView;
  };
}

export const initialState: AccountState = {
  accountId: "",
  balances: {},
  portfolio: {
    supplied: {},
    collateral: {},
    borrowed: {},
    collateralAll: {},

    positions: {},
    farms: {
      supplied: {},
      borrowed: {},
      netTvl: {},
      tokennetbalance: {},
    },
    staking: initialStaking,
    stakings: {},
    hasNonFarmedAssets: false,
    supplies: [],
    borrows: [],
    collaterals: [],
  },
  status: undefined,
  isClaiming: undefined,
  fetchedAt: undefined,
};
