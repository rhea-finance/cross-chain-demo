import { createSelector } from "@reduxjs/toolkit";

import { shrinkToken } from "@/utils/numbers";
import { RootState } from "../store";
import { INetTvlFarmReward } from "@/interface/lending";
import { filterSentOutFarms } from "@/utils/lendingUtil";
import {
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SOLANA,
} from "@/services/chainConfig";

interface IProtocolReward {
  icon: string;
  name: string;
  symbol: string;
  tokenId: string;
  dailyAmount: number;
  remainingAmount: number;
  price: number;
  boosted_shares: number;
}

export const getProtocolRewards = createSelector(
  (state: RootState) => state.assets,
  (assets) => {
    const rewards = Object.entries(filterSentOutFarms(assets.netTvlFarm)).map(
      ([tokenId, farm]: [string, INetTvlFarmReward]) => {
        const asset = assets.data[tokenId];
        const { name, symbol, icon } = asset.metadata;
        const assetDecimals =
          asset.metadata.decimals + asset.config.extra_decimals;

        const dailyAmount = Number(
          shrinkToken(farm.reward_per_day, assetDecimals)
        );
        const remainingAmount = Number(
          shrinkToken(farm.remaining_rewards, assetDecimals)
        );
        const boosted_shares = Number(shrinkToken(farm.boosted_shares, 18));
        return {
          icon,
          name,
          symbol,
          tokenId,
          dailyAmount,
          remainingAmount,
          price: asset.price?.usd || 0,
          boosted_shares,
        } as IProtocolReward;
      }
    );

    return rewards;
  }
);
export const getTokenNetBalanceRewards = createSelector(
  (state: RootState) => state.assets,
  (assets) => {
    // Filter to only include configured tokens
    const configuredAssetIds = Object.keys(assets.data).filter((tokenId) => {
      const asset = assets.data[tokenId];
      const symbol = asset?.metadata?.symbol;
      if (!symbol) return false;

      // Check if the asset is in the configured token list
      const supportedAsset = ASSETS_CHAINS_SOLANA.find(
        (configAsset) =>
          configAsset.symbol.toLocaleLowerCase() === symbol.toLowerCase()
      );

      const evmAsset = ASSETS_CHAINS_EVM.find((configAsset) => {
        if (configAsset.symbol.toLowerCase() === symbol.toLowerCase()) {
          return true; // Include all EVM configured tokens
        }
        return false;
      });

      // Include Bitcoin tokens
      const isBitcoinToken = symbol === "NBTC" || symbol === "BTC";

      return !!supportedAsset || !!evmAsset || isBitcoinToken;
    });

    const tokenNetBalanceRewards = Object.entries(
      assets.allFarms?.tokenNetBalance || {}
    ).reduce((acc, cur) => {
      const [assetId, rewards] = cur;

      // Only process configured tokens
      if (!configuredAssetIds.includes(assetId)) {
        return acc;
      }

      const rewardList: IProtocolReward[] = [];
      Object.entries(rewards).forEach(
        ([rewardId, farmData]: [string, INetTvlFarmReward]) => {
          if (farmData.remaining_rewards !== "0") {
            const rewardAsset = assets.data[rewardId];
            const { name, symbol, icon } = rewardAsset.metadata;
            const rewardAssetDecimals =
              rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
            const dailyAmount = Number(
              shrinkToken(farmData.reward_per_day, rewardAssetDecimals)
            );
            const remainingAmount = Number(
              shrinkToken(farmData.remaining_rewards, rewardAssetDecimals)
            );
            const boosted_shares = Number(
              shrinkToken(farmData.boosted_shares, 18)
            );
            rewardList.push({
              icon,
              name,
              symbol,
              tokenId: assetId,
              dailyAmount,
              remainingAmount,
              price: Number(rewardAsset.price?.usd || 0),
              boosted_shares,
            });
          }
        }
      );
      return [...acc, ...rewardList];
    }, [] as IProtocolReward[]);
    return tokenNetBalanceRewards;
  }
);

export const getNetLiquidityRewards = createSelector(
  (state: RootState) => state.assets,
  (assets) => {
    const rewards = Object.entries(assets.netTvlFarm).map(
      ([tokenId, farm]: [string, INetTvlFarmReward]) => {
        const asset = assets.data[tokenId];
        const { metadata, config, price } = asset;
        return {
          rewards: farm,
          metadata,
          config,
          price: price?.usd ?? 0,
        };
      }
    );

    return rewards;
  }
);
