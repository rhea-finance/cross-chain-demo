import Decimal from "decimal.js";
import { createSelector } from "@reduxjs/toolkit";
import _, { omit } from "lodash";
import { shrinkToken } from "@/utils/numbers";
import { RootState } from "../store";
import { Asset } from "@rhea-finance/cross-chain-sdk";
import { AssetsState } from "../state/assetState";
import {
  Farm,
  AccountFarmRewardView,
  Portfolio,
} from "@rhea-finance/cross-chain-sdk";
import { IAccountFarms } from "../state/accountState";
import { getStaking } from "./getStaking";
import { INetTvlFarmRewards } from "@/interface/lending";
import {
  hasAssets,
  toUsd,
  cloneObj,
  standardizeAsset,
  filterAccountSentOutFarms,
  filterAccountAllSentOutFarms,
} from "@/utils/lendingUtil";
import { getMarketRewardsDataUtil } from "./getMarketRewards";
import { config_near } from "@rhea-finance/cross-chain-sdk";
const { XRHEA_TOKEN_ID } = config_near;

export interface IPortfolioReward {
  icon: string;
  name: string;
  symbol: string;
  tokenId: string;
  totalAmount: number;
  dailyAmount: number;
  unclaimedAmount: number;
  unclaimedAmountExtend: string;
  unclaimedAmountUSD: number;
  boosterLogBase: number;
  newDailyAmount: number;
  multiplier: number;
  price: number;
  remaining_rewards: string;
  assetTokenId?: string;
}

export interface IAccountRewards {
  brrr: IPortfolioReward;
  extra: {
    [tokenId: string]: IPortfolioReward;
  };
  net: {
    [tokenId: string]: IPortfolioReward;
  };
  sumRewards: {
    [tokenId: string]: IPortfolioReward;
  };
  poolRewards: {
    [tokenId: string]: IPortfolioReward;
  };
  suppliedRewards: IPortfolioReward[];
  borrowedRewards: IPortfolioReward[];
  netLiquidityRewards: IPortfolioReward[];
  tokenNetRewards: IPortfolioReward[];
  totalUnClaimUSD: number;
}

export const getGains = (
  portfolio: Portfolio,
  assets: AssetsState,
  source: "supplied" | "collateral" | "borrowed" | "collateralAll",
  withNetTvlMultiplier = false
) => {
  const data = portfolio[source];
  const res = Object.keys(data).map((id) => {
    const asset = assets.data[id];
    const netTvlMultiplier = (asset?.config?.net_tvl_multiplier ?? 0) / 10000;

    const { balance } = data[id];
    const apr = Number(data[id].apr);
    const balanceUSD = toUsd(balance, asset);

    return [balanceUSD * (withNetTvlMultiplier ? netTvlMultiplier : 1), apr];
  });
  const result = res.reduce(
    ([gain, sum], [balance, apr]) => [gain + balance * apr, sum + balance],
    [0, 0]
  );
  return result;
};

export const getGainsArr = (
  tokens: any[],
  assets: AssetsState,
  withNetTvlMultiplier = false
) => {
  const res = tokens.map((data) => {
    const asset = assets.data[data.token_id];
    const netTvlMultiplier = (asset?.config?.net_tvl_multiplier ?? 0) / 10000;
    const { balance } = data;
    const apr = Number(data.apr);
    const balanceUSD = toUsd(balance, asset);

    return [balanceUSD * (withNetTvlMultiplier ? netTvlMultiplier : 1), apr];
  });
  const result = res.reduce(
    ([gain, sum], [balance, apr]) => [gain + balance * apr, sum + balance],
    [0, 0]
  );
  return result;
};

export const getGainsFromIncentive = (
  portfolio: Portfolio,
  assets: AssetsState,
  source: "supplied" | "borrowed" | "netTvl" | "tokennetbalance"
) => {
  if (source === "netTvl") {
    return Object.entries(filterAccountSentOutFarms(portfolio.farms[source]))
      .map(([rewardTokenId, farmData]) => {
        const rewardAsset = assets.data[rewardTokenId];
        const rewardAssetDecimals =
          rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
        const boostedShares = Number(
          shrinkToken(farmData.boosted_shares, rewardAssetDecimals)
        );
        const totalBoostedShares = Number(
          shrinkToken(
            farmData.asset_farm_reward.boosted_shares,
            rewardAssetDecimals
          )
        );
        const totalRewardsPerDay = Number(
          shrinkToken(
            farmData.asset_farm_reward.reward_per_day,
            rewardAssetDecimals
          )
        );
        const dailyAmount =
          totalBoostedShares > 0
            ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
            : 0;
        return dailyAmount * Number(rewardAsset.price?.usd || 0);
      })
      .reduce((sum, p) => sum + p, 0);
  } else {
    return Object.entries(portfolio.farms[source])
      .map(([tokenId, farm]: [string, Farm]) => {
        return Object.entries(filterAccountSentOutFarms(farm))
          .map(([rewardTokenId, farmData]) => {
            const asset = assets.data[tokenId];
            const rewardAsset = assets.data[rewardTokenId];
            const assetDecimals =
              asset.metadata.decimals + asset.config.extra_decimals;
            const rewardAssetDecimals =
              rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
            const boostedShares = Number(
              shrinkToken(farmData.boosted_shares, assetDecimals)
            );
            const totalBoostedShares = Number(
              shrinkToken(
                farmData.asset_farm_reward.boosted_shares,
                assetDecimals
              )
            );
            const totalRewardsPerDay = Number(
              shrinkToken(
                farmData.asset_farm_reward.reward_per_day,
                rewardAssetDecimals
              )
            );
            const dailyAmount =
              totalBoostedShares > 0
                ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
                : 0;
            return dailyAmount * Number(rewardAsset.price?.usd || 0);
          })
          .reduce((sum, p) => sum + p, 0);
      })
      .reduce((sum, p) => sum + p, 0);
  }
};

export const getDailyAmount = (
  portfolio: Portfolio,
  assets: AssetsState,
  source: "supplies" | "collaterals" | "borrows"
) => {
  return portfolio[source].map((assetData) => {
    const tokenId = assetData.token_id;
    const asset = assets.data[tokenId];
    const assetDecimals = asset.metadata.decimals + asset.config.extra_decimals;
    const balance = Number(shrinkToken(assetData.balance, assetDecimals));
    const dailyAmount = new Decimal(balance)
      .mul(assetData.apr)
      .div(365)
      .toNumber();
    return { [tokenId]: dailyAmount };
  });
};
export const getIncentiveDailyAmount = (
  portfolio: Portfolio,
  assets: AssetsState,
  source: "supplied" | "borrowed" | "netTvl" | "tokennetbalance"
) => {
  const result = {};
  if (source === "netTvl") {
    Object.entries(filterAccountSentOutFarms(portfolio.farms[source])).forEach(
      ([rewardTokenId, farmData]) => {
        const rewardAsset = assets.data[rewardTokenId];
        const rewardAssetDecimals =
          rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
        const boostedShares = Number(
          shrinkToken(farmData.boosted_shares, rewardAssetDecimals)
        );
        const totalBoostedShares = Number(
          shrinkToken(
            farmData.asset_farm_reward.boosted_shares,
            rewardAssetDecimals
          )
        );
        const totalRewardsPerDay = Number(
          shrinkToken(
            farmData.asset_farm_reward.reward_per_day,
            rewardAssetDecimals
          )
        );
        const dailyAmount =
          totalBoostedShares > 0
            ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
            : 0;
        result[rewardTokenId] = new Decimal(result[rewardTokenId] || 0)
          .plus(dailyAmount)
          .toNumber();
      }
    );
  } else {
    Object.entries(portfolio.farms[source]).forEach(
      ([tokenId, farm]: [string, Farm]) => {
        Object.entries(filterAccountSentOutFarms(farm)).forEach(
          ([rewardTokenId, farmData]) => {
            const asset = assets.data[tokenId];
            const rewardAsset = assets.data[rewardTokenId];
            const assetDecimals =
              asset.metadata.decimals + asset.config.extra_decimals;
            const rewardAssetDecimals =
              rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
            const boostedShares = Number(
              shrinkToken(farmData.boosted_shares, assetDecimals)
            );
            const totalBoostedShares = Number(
              shrinkToken(
                farmData.asset_farm_reward.boosted_shares,
                assetDecimals
              )
            );
            const totalRewardsPerDay = Number(
              shrinkToken(
                farmData.asset_farm_reward.reward_per_day,
                rewardAssetDecimals
              )
            );
            const dailyAmount =
              totalBoostedShares > 0
                ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
                : 0;
            result[rewardTokenId] = new Decimal(result[rewardTokenId] || 0)
              .plus(dailyAmount)
              .toNumber();
          }
        );
      }
    );
  }
  return result;
};
export const computePoolsDailyAmount = (
  type: "supplied" | "borrowed" | "tokennetbalance",
  asset: Asset,
  rewardAsset: Asset,
  portfolio: Portfolio,
  xBRRRAmount: number,
  farmData: AccountFarmRewardView,
  boosterDecimals: number,
  boost_suppress_factor: number
) => {
  // const position = asset.token_id.indexOf(lpTokenPrefix) > -1 ? asset.token_id : DEFAULT_POSITION;
  const boosterLogBase_ =
    farmData?.asset_farm_reward?.booster_log_bases?.[XRHEA_TOKEN_ID];
  const boosterLogBase = Number(shrinkToken(boosterLogBase_, boosterDecimals));
  const assetDecimals =
    asset?.metadata?.decimals + asset?.config?.extra_decimals;
  const rewardAssetDecimals =
    rewardAsset?.metadata?.decimals + rewardAsset?.config?.extra_decimals;
  const log =
    Math.log(xBRRRAmount / boost_suppress_factor) / Math.log(boosterLogBase);
  const multiplier = log >= 0 ? 1 + log : 1;

  const boostedShares = Number(
    shrinkToken(farmData.boosted_shares, assetDecimals)
  );

  const totalBoostedShares = Number(
    shrinkToken(farmData.asset_farm_reward.boosted_shares, assetDecimals)
  );
  const totalRewardsPerDay = Number(
    shrinkToken(farmData.asset_farm_reward.reward_per_day, rewardAssetDecimals)
  );

  const dailyAmount =
    totalBoostedShares > 0
      ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
      : 0;

  const suppliedShares = Number(
    shrinkToken(
      portfolio.supplied?.[asset?.token_id]?.shares || 0,
      assetDecimals
    )
  );
  const collateralShares = Number(
    shrinkToken(
      portfolio.collateralAll?.[asset?.token_id]?.shares || 0,
      assetDecimals
    )
  );
  const borrowedShares = Number(
    shrinkToken(
      portfolio.borrows
        ?.filter((a) => asset?.token_id === a?.token_id)
        .reduce((acc, cur) => {
          acc = acc.plus(cur.shares);
          return acc;
        }, new Decimal(0))
        .toFixed(),
      assetDecimals
    )
  );
  let shares;
  if (type === "supplied") {
    shares = suppliedShares + collateralShares;
  } else if (type === "borrowed") {
    shares = borrowedShares;
  } else if (type === "tokennetbalance") {
    const suppliedBalance = Number(
      shrinkToken(
        portfolio.supplied?.[asset?.token_id]?.balance || 0,
        assetDecimals
      )
    );
    const collateralBalance = Number(
      shrinkToken(
        portfolio.collateralAll?.[asset?.token_id]?.balance || 0,
        assetDecimals
      )
    );
    const borrowedBalance = Number(
      shrinkToken(
        portfolio.borrows
          ?.filter((a) => asset?.token_id === a?.token_id)
          .reduce((acc, cur) => {
            acc = acc.plus(cur.balance);
            return acc;
          }, new Decimal(0))
          .toFixed(),
        assetDecimals
      )
    );
    const tokenNetShares =
      suppliedBalance + collateralBalance - borrowedBalance;
    shares = tokenNetShares;
  }
  const newBoostedShares = shares * multiplier;
  const newTotalBoostedShares =
    totalBoostedShares + newBoostedShares - boostedShares;
  const newDailyAmount =
    newTotalBoostedShares > 0
      ? (newBoostedShares / newTotalBoostedShares) * totalRewardsPerDay
      : 0;
  return {
    dailyAmount,
    newDailyAmount,
    multiplier,
    totalBoostedShares,
    shares,
  };
};

export const computeNetLiquidityDailyAmount = (
  asset: Asset,
  totalxBRRRAmount: number,
  netTvlFarm: INetTvlFarmRewards,
  farmData: AccountFarmRewardView,
  boosterDecimals: number,
  xBRRR: number,
  boost_suppress_factor: number
) => {
  const boosterLogBase_ =
    farmData?.asset_farm_reward?.booster_log_bases?.[XRHEA_TOKEN_ID];
  const boosterLogBase = Number(shrinkToken(boosterLogBase_, boosterDecimals));

  const assetDecimals = asset.metadata.decimals + asset.config.extra_decimals;

  const log =
    Math.log(totalxBRRRAmount / boost_suppress_factor) /
    Math.log(boosterLogBase);
  const multiplier = log >= 0 ? 1 + log : 1;

  const boostedShares = Number(
    shrinkToken(farmData.boosted_shares, assetDecimals)
  );
  const totalBoostedShares = Number(
    shrinkToken(
      netTvlFarm[asset.token_id]?.boosted_shares || "0",
      assetDecimals
    )
  );
  const totalRewardsPerDay = Number(
    shrinkToken(
      netTvlFarm[asset.token_id]?.reward_per_day || "0",
      assetDecimals
    )
  );

  const dailyAmount =
    totalBoostedShares > 0
      ? (boostedShares / totalBoostedShares) * totalRewardsPerDay
      : 0;
  const logStaked =
    Math.log(xBRRR / boost_suppress_factor) / Math.log(boosterLogBase);
  const multiplierStaked = logStaked >= 0 ? 1 + logStaked : 1;

  const shares = boostedShares / multiplierStaked;

  const newBoostedShares = shares * multiplier;
  const newTotalBoostedShares =
    totalBoostedShares + newBoostedShares - boostedShares;
  const newDailyAmount =
    newTotalBoostedShares > 0
      ? (newBoostedShares / newTotalBoostedShares) * totalRewardsPerDay
      : 0;

  return {
    dailyAmount,
    newDailyAmount,
    multiplier,
    totalBoostedShares,
    shares,
  };
};

export const getAccountRewards = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account,
  (state: RootState) => state.app,
  getStaking(),
  (assets, account, app, staking) => {
    const brrrTokenId = app.config.booster_token_id;
    const { xBRRR, extraXBRRRAmount } = staking;
    const xBRRRAmount = xBRRR + extraXBRRRAmount;
    const { borrows, collaterals } = account.portfolio || {};
    const [, totalSupplied] = getGains(account.portfolio, assets, "supplied");
    const [, totalCollateral] = collaterals
      ? getGainsArr(account.portfolio.collaterals, assets)
      : getGains(account.portfolio, assets, "collateral");
    const [, totalBorrowed] = borrows
      ? getGainsArr(account.portfolio.borrows, assets)
      : getGains(account.portfolio, assets, "borrowed");

    const netLiquidity = totalCollateral + totalSupplied - totalBorrowed;
    const computePoolsRewards =
      (type: "supplied" | "borrowed" | "tokennetbalance") =>
      ([tokenId, farm]: [string, Farm]) => {
        return Object.entries(farm).map(([rewardTokenId, farmData]) => {
          const asset = assets?.data[tokenId];
          const rewardAsset = assets?.data[rewardTokenId];
          const rewardAssetDecimals =
            rewardAsset?.metadata?.decimals +
            rewardAsset?.config?.extra_decimals;
          const {
            icon = "",
            symbol = "",
            name = "",
          } = rewardAsset?.metadata || {};

          const unclaimedAmount = Number(
            shrinkToken(farmData.unclaimed_amount, rewardAssetDecimals)
          );

          const { dailyAmount, newDailyAmount, multiplier } =
            computePoolsDailyAmount(
              type,
              asset,
              rewardAsset,
              account.portfolio,
              xBRRRAmount,
              farmData,
              app.config.booster_decimals,
              app.config.boost_suppress_factor
            );
          return {
            icon,
            name,
            symbol,
            tokenId: rewardTokenId,
            unclaimedAmount,
            unclaimedAmountExtend: farmData.unclaimed_amount,
            dailyAmount,
            newDailyAmount,
            multiplier,
            price: rewardAsset?.price?.usd || 0,
            unclaimedAmountUSD:
              unclaimedAmount * Number(rewardAsset?.price?.usd || 0),
            remaining_rewards:
              farmData?.asset_farm_reward?.remaining_rewards || "0",
          };
        });
      };

    const computeNetLiquidityRewards = ([rewardTokenId, farmData]: [
      string,
      AccountFarmRewardView
    ]) => {
      const rewardAsset = assets?.data[rewardTokenId];
      const rewardAssetDecimals =
        rewardAsset?.metadata?.decimals + rewardAsset?.config?.extra_decimals;
      const { icon = "", symbol = "", name = "" } = rewardAsset?.metadata || {};
      const unclaimedAmount = Number(
        shrinkToken(farmData.unclaimed_amount, rewardAssetDecimals)
      );
      const { dailyAmount, newDailyAmount, multiplier } =
        computeNetLiquidityDailyAmount(
          rewardAsset,
          xBRRRAmount,
          assets.netTvlFarm,
          farmData,
          app.config.booster_decimals,
          xBRRR,
          app.config.boost_suppress_factor
        );
      return {
        icon,
        name,
        symbol,
        tokenId: rewardTokenId,
        unclaimedAmount,
        unclaimedAmountExtend: farmData.unclaimed_amount,
        dailyAmount,
        newDailyAmount,
        multiplier,
        price: rewardAsset?.price?.usd || 0,
        unclaimedAmountUSD:
          unclaimedAmount * Number(rewardAsset?.price?.usd || 0),
        remaining_rewards:
          farmData?.asset_farm_reward?.remaining_rewards || "0",
      };
    };
    const { supplied, borrowed, netTvl, tokennetbalance } =
      account?.portfolio?.farms || {};
    const suppliedRewards = Object.entries(supplied)
      .map(computePoolsRewards("supplied"))
      .flat();
    const borrowedRewards = Object.entries(borrowed)
      .map(computePoolsRewards("borrowed"))
      .flat();
    const tokenNetRewards = Object.entries(tokennetbalance)
      .map(computePoolsRewards("tokennetbalance"))
      .flat();
    const netLiquidityRewards = Object.entries(netTvl).map(
      computeNetLiquidityRewards
    );
    const sumArrays = (array) => {
      const clonedArray = cloneObj(array);
      return clonedArray.reduce((rewards, asset) => {
        if (!rewards[asset?.tokenId])
          return { ...rewards, [asset?.tokenId]: asset };
        const updatedAsset = rewards[asset?.tokenId];
        updatedAsset.unclaimedAmount += asset?.unclaimedAmount;
        updatedAsset.unclaimedAmountExtend = new Decimal(
          asset?.unclaimedAmountExtend || 0
        )
          .plus(updatedAsset.unclaimedAmountExtend || 0)
          .toFixed(0);
        updatedAsset.dailyAmount += asset?.dailyAmount;
        updatedAsset.newDailyAmount += asset?.newDailyAmount;
        return { ...rewards, [asset?.tokenId]: updatedAsset };
      }, {});
    };
    const allRewards = [
      ...suppliedRewards,
      ...borrowedRewards,
      ...netLiquidityRewards,
      ...tokenNetRewards,
    ];
    const sumRewards = sumArrays(allRewards);
    const poolRewards = sumArrays([
      ...suppliedRewards,
      ...borrowedRewards,
      ...tokenNetRewards,
    ]);
    let totalUnClaimUSD = 0;
    allRewards.forEach((d) => {
      totalUnClaimUSD += d.unclaimedAmountUSD;
    });
    return {
      brrr: poolRewards[brrrTokenId] || {},
      extra: omit(poolRewards, brrrTokenId) || {},
      poolRewards: poolRewards || {},
      net: netLiquidityRewards.reduce(
        (rewards, asset) => ({ ...rewards, [asset.tokenId]: asset }),
        {}
      ),
      sumRewards,
      totalUnClaimUSD,
    } as IAccountRewards;
  }
);
export const getAccountRewardsForApy = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account,
  (state: RootState) => state.app,
  getStaking(),
  (assets, account, app, staking) => {
    const { xBRRR, extraXBRRRAmount } = staking;
    const xBRRRAmount = xBRRR + extraXBRRRAmount;

    const computePoolsRewards =
      (type: "supplied" | "borrowed" | "tokennetbalance") =>
      ([tokenId, farm]: [string, Farm]) => {
        return Object.entries(farm).map(([rewardTokenId, farmData]) => {
          const asset = assets.data[tokenId];
          const rewardAsset = assets.data[rewardTokenId];
          const rewardAssetDecimals =
            rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
          const { icon, symbol, name } = rewardAsset.metadata;

          const unclaimedAmount = Number(
            shrinkToken(farmData.unclaimed_amount, rewardAssetDecimals)
          );

          const { dailyAmount, newDailyAmount, multiplier } =
            computePoolsDailyAmount(
              type,
              asset,
              rewardAsset,
              account.portfolio,
              xBRRRAmount,
              farmData,
              app.config.booster_decimals,
              app.config.boost_suppress_factor
            );

          return {
            icon,
            name,
            symbol,
            tokenId: rewardTokenId,
            unclaimedAmount,
            unclaimedAmountExtend: farmData.unclaimed_amount,
            dailyAmount,
            newDailyAmount,
            multiplier,
            price: rewardAsset.price?.usd || 0,
            unclaimedAmountUSD:
              unclaimedAmount * Number(rewardAsset.price?.usd || 0),
            assetTokenId: tokenId,
          };
        });
      };

    const computeNetLiquidityRewards = ([rewardTokenId, farmData]: [
      string,
      AccountFarmRewardView
    ]) => {
      const rewardAsset = assets.data[rewardTokenId];
      const rewardAssetDecimals =
        rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
      const { icon, symbol, name } = rewardAsset.metadata;
      const unclaimedAmount = Number(
        shrinkToken(farmData.unclaimed_amount, rewardAssetDecimals)
      );

      const { dailyAmount, newDailyAmount, multiplier } =
        computeNetLiquidityDailyAmount(
          rewardAsset,
          xBRRRAmount,
          assets.netTvlFarm,
          farmData,
          app.config.booster_decimals,
          xBRRR,
          app.config.boost_suppress_factor
        );

      return {
        icon,
        name,
        symbol,
        tokenId: rewardTokenId,
        unclaimedAmount,
        unclaimedAmountExtend: farmData.unclaimed_amount,
        dailyAmount,
        newDailyAmount,
        multiplier,
        price: rewardAsset.price?.usd || 0,
        unclaimedAmountUSD:
          unclaimedAmount * Number(rewardAsset.price?.usd || 0),
      };
    };

    const { supplied, borrowed, netTvl, tokennetbalance } =
      filterAccountAllSentOutFarms(account.portfolio);
    const hasNetTvlFarm = !!Object.entries(assets.netTvlFarm).length;
    const suppliedRewards = Object.entries(supplied)
      .map(computePoolsRewards("supplied"))
      .flat();
    const borrowedRewards = Object.entries(borrowed)
      .map(computePoolsRewards("borrowed"))
      .flat();
    const tokenNetRewards = Object.entries(tokennetbalance)
      .map(computePoolsRewards("tokennetbalance"))
      .flat();
    const netLiquidityRewards = hasNetTvlFarm
      ? Object.entries(netTvl).map(computeNetLiquidityRewards)
      : [];
    const allRewards = [
      ...suppliedRewards,
      ...borrowedRewards,
      ...tokenNetRewards,
      ...netLiquidityRewards,
    ];
    let totalUnClaimUSD = 0;
    allRewards.forEach((d) => {
      totalUnClaimUSD += d.unclaimedAmountUSD;
    });
    return {
      suppliedRewards,
      borrowedRewards,
      netLiquidityRewards,
      tokenNetRewards,
    } as IAccountRewards;
  }
);
export const getAccountBoostRatioData = (tokenId?: string) => {
  return createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.account,
    (state: RootState) => state.app,
    getStaking(tokenId),
    (assets, account, app, staking) => {
      const { booster_log_base: booster_log_base_only_tokenBalance } =
        getMarketRewardsDataUtil(assets);
      const { totalXBRRR, BRRR, amount, xBRRR } = staking;

      const boosterConfig =
        tokenId && Object.keys(app?.boosterTokens).length > 0
          ? app?.boosterTokens?.[tokenId]
          : app?.config;

      if (
        !boosterConfig?.boost_suppress_factor ||
        !boosterConfig?.booster_decimals
      )
        return {
          multiplierNew: 1,
          multiplierCurrent: 1,
          amount,
        };
      const { tokennetbalance, supplied, borrowed } =
        filterAccountAllSentOutFarms(account.portfolio);
      let booster_log_base = getBoosterLogBaseFromAccountFarms(tokennetbalance);
      if (!booster_log_base) {
        booster_log_base = getBoosterLogBaseFromAccountFarms(supplied);
        if (!booster_log_base) {
          booster_log_base = getBoosterLogBaseFromAccountFarms(borrowed);
          if (!booster_log_base) {
            // for no supply situation but has tokenBalance farm on market
            booster_log_base = booster_log_base_only_tokenBalance;
          }
        }
      }
      if (booster_log_base) {
        const boosterLogBase = Number(
          shrinkToken(booster_log_base, boosterConfig?.booster_decimals)
        );
        const log =
          Math.log(totalXBRRR / boosterConfig?.boost_suppress_factor) /
          Math.log(boosterLogBase);
        const logStaked =
          Math.log(xBRRR / boosterConfig?.boost_suppress_factor) /
          Math.log(boosterLogBase);
        const multiplier = log >= 0 ? 1 + log : 1;
        const multiplierStaked = logStaked >= 0 ? 1 + logStaked : 1;
        return {
          multiplierNew: multiplier,
          multiplierCurrent: multiplierStaked,
          amount,
        };
      }
      return {
        multiplierNew: 1,
        multiplierCurrent: 1,
        amount,
      };
    }
  );
};

function getBoosterLogBaseFromAccountFarms(accountfarms) {
  const a = Object.values(accountfarms).map((o) => Object.values(o));
  const boosterConfigArr = a.flat();
  const target = boosterConfigArr.find(
    (boosterConfig) =>
      !_.isEmpty(boosterConfig?.asset_farm_reward?.booster_log_bases)
  );
  if (target) {
    const res = Object.values(target?.asset_farm_reward?.booster_log_bases)[0];
    return res as string;
  }
  return "";
}
export const getWeightedNetLiquidity = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account,
  (assets, account) => {
    if (!hasAssets(assets)) return 0;
    const { borrows, collaterals } = account.portfolio || {};
    const [, totalSupplied] = getGains(
      account.portfolio,
      assets,
      "supplied",
      true
    );
    const [, totalCollateral] = collaterals
      ? getGainsArr(account.portfolio.collaterals, assets, true)
      : getGains(account.portfolio, assets, "collateral", true);
    const [, totalBorrowed] = borrows
      ? getGainsArr(account.portfolio.borrows, assets, true)
      : getGains(account.portfolio, assets, "borrowed", true);

    const netLiquidity = new Decimal(totalCollateral)
      .plus(totalSupplied)
      .minus(totalBorrowed)
      .toNumber();
    return netLiquidity;
  }
);

export const getWeightedAssets = createSelector(
  (state: RootState) => state.assets,
  (assets) => {
    if (!hasAssets(assets)) return [];
    return Object.entries(assets.data)
      .map(([, asset]: any) =>
        asset.config.net_tvl_multiplier < 10000 ? asset : undefined
      )
      .filter(Boolean) as Asset[];
  }
);
export const getAccountDailyRewards = ({
  suppliedTokenIds,
  borrowedTokenIds,
}: {
  suppliedTokenIds: string[];
  borrowedTokenIds: string[];
}) => {
  return createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.account,
    (assets, account) => {
      const portfolioDustProcess = dustProcess({
        portfolio: account.portfolio,
        suppliedTokenIds,
        borrowedTokenIds: Array.from(new Set(borrowedTokenIds || [])),
      });
      const baseCollateralUsdDaily =
        getGainsArr(portfolioDustProcess.collaterals, assets)[0] / 365;
      const baseSuppliedUsdDaily =
        getGains(portfolioDustProcess, assets, "supplied")[0] / 365;
      const baseBorrowedUsdDaily =
        getGainsArr(portfolioDustProcess.borrows, assets)[0] / 365;
      const farmSuppliedUsdDaily = getGainsFromIncentive(
        portfolioDustProcess,
        assets,
        "supplied"
      );
      const farmBorrowedUsdDaily = getGainsFromIncentive(
        portfolioDustProcess,
        assets,
        "borrowed"
      );
      const farmNetTvlUsdDaily = getGainsFromIncentive(
        portfolioDustProcess,
        assets,
        "netTvl"
      );
      const farmTokenNetUsdDaily = getGainsFromIncentive(
        portfolioDustProcess,
        assets,
        "tokennetbalance"
      );

      const baseSuppliedAmountDaily = getDailyAmount(
        portfolioDustProcess,
        assets,
        "supplies"
      );
      const baseCollateralAmountDaily = getDailyAmount(
        portfolioDustProcess,
        assets,
        "collaterals"
      );
      const baseBorrowedAmountDaily = getDailyAmount(
        portfolioDustProcess,
        assets,
        "borrows"
      );

      const farmSuppliedAmountDaily = getIncentiveDailyAmount(
        portfolioDustProcess,
        assets,
        "supplied"
      );
      const farmBorrowedAmountDaily = getIncentiveDailyAmount(
        portfolioDustProcess,
        assets,
        "borrowed"
      );
      const farmCollateralAmountDaily = getIncentiveDailyAmount(
        portfolioDustProcess,
        assets,
        "netTvl"
      );
      const farmTokenNetAmountDaily = getIncentiveDailyAmount(
        portfolioDustProcess,
        assets,
        "tokennetbalance"
      );
      const allGainRewards = [
        ...baseSuppliedAmountDaily,
        ...baseCollateralAmountDaily,
        ...Object.entries(farmSuppliedAmountDaily).reduce(sumMap, []),
        ...Object.entries(farmBorrowedAmountDaily).reduce(sumMap, []),
        ...Object.entries(farmCollateralAmountDaily).reduce(sumMap, []),
        ...Object.entries(farmTokenNetAmountDaily).reduce(sumMap, []),
      ];
      const mergedGainRewards = allGainRewards.reduce((acc, reward) => {
        const [[rewardTokenId, rewardAmount]] = Object.entries(reward);
        if (!acc[rewardTokenId]) return { ...acc, ...reward };
        return { ...acc, [rewardTokenId]: acc[rewardTokenId] + rewardAmount };
      }, {});
      baseBorrowedAmountDaily.forEach((reward) => {
        const [[rewardTokenId, rewardAmount]] = Object.entries(reward);
        mergedGainRewards[rewardTokenId] = new Decimal(
          mergedGainRewards[rewardTokenId] || 0
        )
          .minus(rewardAmount || 0)
          .toFixed();
      });
      const allRewards = Object.entries(mergedGainRewards).reduce(
        (acc, [tokenId, amount]) => {
          const assetCopy = JSON.parse(
            JSON.stringify(assets.data[tokenId] || {})
          );
          assetCopy.metadata = standardizeAsset(assetCopy.metadata || {});
          if (Number(amount) !== 0) {
            return {
              ...acc,
              [tokenId]: {
                amount,
                asset: assetCopy,
              },
            };
          }
          return acc;
        },
        {}
      );
      return {
        baseDepositUsdDaily: baseCollateralUsdDaily + baseSuppliedUsdDaily,
        baseBorrowedUsdDaily,
        farmSuppliedUsdDaily,
        farmBorrowedUsdDaily,
        farmNetTvlUsdDaily,
        farmTokenNetUsdDaily,
        farmTotalUsdDaily:
          farmSuppliedUsdDaily +
          farmBorrowedUsdDaily +
          farmNetTvlUsdDaily +
          farmTokenNetUsdDaily,
        totalUsdDaily:
          baseCollateralUsdDaily +
          baseSuppliedUsdDaily -
          baseBorrowedUsdDaily +
          farmSuppliedUsdDaily +
          farmBorrowedUsdDaily +
          farmNetTvlUsdDaily +
          farmTokenNetUsdDaily,
        allRewards,
      };
    }
  );
};

export function filterAccountEndedFarms(userFarms, allFarms): IAccountFarms {
  const { supplied, borrowed, netTvl } = Copy(userFarms);
  const newSupplied = Object.entries(supplied)
    .map(([tokenId, farmData]: any) => {
      const marketFarmData = allFarms.supplied[tokenId];
      const newFarmData = Object.entries(farmData).reduce(
        (sum, [rewardId, rewardData]) => {
          if (marketFarmData[rewardId])
            return { ...sum, ...{ [rewardId]: rewardData } };
          return sum;
        },
        {}
      );
      return { [tokenId]: newFarmData };
    })
    .reduce((acc, cur) => ({ ...acc, ...cur }), {});
  const newBorrowed = Object.entries(borrowed)
    .map(([tokenId, farmData]: any) => {
      const marketFarmData = allFarms.borrowed[tokenId];
      const newFarmData = Object.entries(farmData).reduce(
        (sum, [rewardId, rewardData]) => {
          if (marketFarmData[rewardId])
            return { ...sum, ...{ [rewardId]: rewardData } };
          return sum;
        },
        {}
      );
      return { [tokenId]: newFarmData };
    })
    .reduce((acc, cur) => ({ ...acc, ...cur }), {});
  const newNetTvl = Object.entries(netTvl).reduce(
    (sum, [rewardId, rewardData]) => {
      if (allFarms.netTvl[rewardId])
        return { ...sum, ...{ [rewardId]: rewardData } };
      return sum;
    },
    {}
  );
  return {
    supplied: newSupplied,
    borrowed: newBorrowed,
    netTvl: newNetTvl,
  };
}
function dustProcess({
  portfolio,
  suppliedTokenIds,
  borrowedTokenIds,
}: {
  portfolio: Portfolio;
  suppliedTokenIds: string[];
  borrowedTokenIds: string[];
}) {
  const portfolioCopy = Copy(portfolio);
  const {
    borrowed,
    borrows,
    collateral,
    collateralAll,
    collaterals,
    supplied,
    supplies,
    farms,
    positions,
    staking,
    hasNonFarmedAssets,
  } = portfolioCopy;
  const newCollateral = {};
  const newCollateralAll = {};
  const newCollaterals = [];
  const newSupplied = {};
  const newSupplies = [];
  const newBorrowed = {};
  const newBorrows = [];
  const newFarmSupplied = {};
  const newFarmBorrowed = {};
  const newFarmTokennetbalance = {};
  suppliedTokenIds?.forEach((supplyTokenId) => {
    if (collateral[supplyTokenId]) {
      newCollateral[supplyTokenId] = collateral[supplyTokenId];
    }
    if (collateralAll[supplyTokenId]) {
      newCollateralAll[supplyTokenId] = collateralAll[supplyTokenId];
    }
    if (collaterals.find((c) => c.token_id == supplyTokenId)) {
      newCollaterals.push(collaterals.find((c) => c.token_id == supplyTokenId));
    }
    if (supplied[supplyTokenId]) {
      newSupplied[supplyTokenId] = supplied[supplyTokenId];
    }
    if (supplies.find((s) => s.token_id == supplyTokenId)) {
      newSupplies.push(supplies.find((s) => s.token_id == supplyTokenId));
    }

    if (farms.supplied[supplyTokenId]) {
      newFarmSupplied[supplyTokenId] = farms.supplied[supplyTokenId];
    }
    if (farms.tokennetbalance[supplyTokenId]) {
      newFarmTokennetbalance[supplyTokenId] =
        farms.tokennetbalance[supplyTokenId];
    }
  });
  borrowedTokenIds?.forEach((borrowTokenId) => {
    if (borrowed[borrowTokenId]) {
      newBorrowed[borrowTokenId] = borrowed[borrowTokenId];
    }
    const list = borrows?.filter((b) => b.token_id == borrowTokenId);
    if (list.length > 0) {
      newBorrows.push(...list);
    }
    if (farms.borrowed[borrowTokenId]) {
      newFarmBorrowed[borrowTokenId] = farms.borrowed[borrowTokenId];
    }
  });
  const newPortfolio = {
    borrowed: newBorrowed,
    borrows: newBorrows,
    collateral: newCollateral,
    collateralAll: newCollateralAll,
    collaterals: newCollaterals,
    supplied: newSupplied,
    supplies: newSupplies,
    farms: {
      supplied: newFarmSupplied,
      borrowed: newFarmBorrowed,
      tokennetbalance: newFarmTokennetbalance,
      netTvl: {},
    },
    positions,
    staking,
    hasNonFarmedAssets,
  };
  return newPortfolio;
}
function sumMap(acc, rewardData) {
  return [...acc, { [rewardData[0]]: rewardData[1] }];
}

function Copy(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}
