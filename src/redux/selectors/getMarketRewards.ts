import { createSelector } from "@reduxjs/toolkit";
import _, { isEmpty } from "lodash";
import { RootState } from "../store";
import { getTokennetMarketAPY } from "@/hooks/lending/useRewards";
import { AssetsState } from "../state/assetState";

export const getMarketRewardsData = (memeCategory?: boolean) => {
  return createSelector(
    (state: RootState) => state.assets,
    (assets) => {
      const result = getMarketRewardsDataUtil(assets);
      return result;
    }
  );
};

export function getMarketRewardsDataUtil(assets: AssetsState) {
  const allFarms = assets?.allFarms;
  if (!allFarms || !assets?.data) return {};
  const { tokenNetBalance } = allFarms;
  // filter ended farms
  const newTokenNetBalance = {};
  Object.entries(tokenNetBalance || {}).forEach(([assetId, rewards]) => {
    const activeFarms = filterEndedFarms(rewards);
    if (!isEmpty(activeFarms)) {
      newTokenNetBalance[assetId] = activeFarms;
    }
  });
  const tokenNetBalanceMarketFarmData = Object.entries(newTokenNetBalance).map(
    ([assetId]) => {
      const asset = assets.data[assetId];
      return {
        asset,
        marketAPY: getTokennetMarketAPY(asset, assets),
      };
    }
  );
  return {
    tokenNetBalance: tokenNetBalanceMarketFarmData,
    booster_log_base: getBoosterLogBaseFromFarms(newTokenNetBalance),
  };
}
function filterEndedFarms(rewards: any) {
  const newRewards = {};
  Object.entries(rewards).forEach(([rewardId, rewardData]: any) => {
    if (rewardData.remaining_rewards !== "0") {
      newRewards[rewardId] = rewardData;
    }
  });
  return newRewards;
}
function getBoosterLogBaseFromFarms(marketFarms) {
  const a = Object.values(marketFarms).map((o) => Object.values(o));
  const boosterConfigArr = a.flat();
  const target = boosterConfigArr.find(
    (boosterConfig) => !_.isEmpty(boosterConfig?.booster_log_bases)
  );
  if (target) {
    const res = Object.values(target?.booster_log_bases)[0];
    return res as string;
  }
  return "";
}
