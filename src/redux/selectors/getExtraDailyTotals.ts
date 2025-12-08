import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { hasAssets } from "@/utils/lendingUtil";
import { filterAccountSentOutRewards } from "@/utils/lendingUtil";
import { getAccountRewards } from "./getAccountRewards";

export const getExtraDailyTotals = ({
  isStaking = false,
}: {
  isStaking: boolean;
}) =>
  createSelector(
    (state: RootState) => state.assets,
    getAccountRewards,
    (assets, rewards) => {
      if (!hasAssets(assets)) return 0;
      const { poolRewards: poolRewardsPending } = rewards;
      const poolRewards = filterAccountSentOutRewards(poolRewardsPending);
      const gainExtra = Object.keys(poolRewards).reduce((acc, tokenId) => {
        const price = assets.data[tokenId]?.price?.usd || 0;
        const daily = isStaking
          ? poolRewards[tokenId].newDailyAmount
          : poolRewards[tokenId].dailyAmount;
        return acc + daily * Number(price || 0);
      }, 0);

      return gainExtra;
    }
  );
