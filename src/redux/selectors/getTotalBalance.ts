import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { toUsd, sumReducer, hasAssets } from "@/utils/lendingUtil";
import {
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SOLANA,
} from "@/services/chainConfig";

export const getTotalBalance = ({
  source,
  withNetTvlMultiplier = false,
}: {
  source: "borrowed" | "supplied";
  withNetTvlMultiplier?: boolean;
}) =>
  createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.app,
    (assets, app) => {
      if (!hasAssets(assets)) return 0;

      // Filter to only include configured tokens
      const configuredTokenIds = Object.keys(assets.data).filter((tokenId) => {
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

      return configuredTokenIds
        .map((tokenId) => {
          const asset = assets.data[tokenId];
          const netTvlMultiplier = withNetTvlMultiplier
            ? asset.config.net_tvl_multiplier / 10000
            : 1;

          return (
            toUsd(asset[source].balance, asset) * netTvlMultiplier +
            (source === "supplied"
              ? toUsd(asset.reserved, asset) * netTvlMultiplier
              : 0)
          );
        })
        .reduce(sumReducer, 0);
    }
  );
