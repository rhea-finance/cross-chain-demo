import Decimal from "decimal.js";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { toUsd, transformAsset } from "@/utils/lendingUtil";
import {
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SOLANA,
} from "@/services/chainConfig";
import { config_near } from "@rhea-finance/cross-chain-sdk";

export const getAvailableAssets = ({
  source,
  chain,
}: {
  source?: "supply" | "borrow" | "";
  chain?: string | null;
}) =>
  createSelector(
    (state: RootState) => state.assets.data,
    (state: RootState) => state.account,
    (state: RootState) => state.app,
    (assets, account, app) => {
      const filterKey = source === "supply" ? "can_deposit" : "can_borrow";
      const currentChain = chain || app.currentChain;

      const assets_filter_by_source = source
        ? Object.keys(assets).filter(
            (tokenId) => assets[tokenId].config[filterKey]
          )
        : Object.keys(assets);

      // Filter by specific chain if specified
      const assets_filter_by_chain = currentChain
        ? assets_filter_by_source.filter((tokenId) => {
            const asset = assets[tokenId];
            const symbol = asset?.metadata?.symbol;
            if (!symbol) return false;

            // Check if the asset is supported on the specific chain
            if (currentChain === "solana") {
              const supportedAsset = ASSETS_CHAINS_SOLANA.find(
                (asset) =>
                  asset.symbol.toLocaleLowerCase() === symbol.toLowerCase()
              );
              return !!supportedAsset;
            } else if (currentChain === "bitcoin" || currentChain == "btc") {
              return tokenId === config_near.NBTCTokenId;
            } else {
              // For EVM chains, check if the asset has an address on this specific chain
              const evmAsset = ASSETS_CHAINS_EVM.find((asset) => {
                if (asset.symbol.toLowerCase() === symbol.toLowerCase()) {
                  const allSubChains = Object.keys(asset?.addresses).map(
                    (item) => item.toLowerCase()
                  );
                  return allSubChains.includes(currentChain.toLowerCase());
                }
                return false;
              });
              return !!evmAsset;
            }
          })
        : assets_filter_by_source;

      return assets_filter_by_chain.map((tokenId) => {
        return transformAsset(assets[tokenId], account, assets, app);
      });
    }
  );

export const isAssetsLoading = createSelector(
  (state: RootState) => state.assets,
  (assets) => assets.status === "pending"
);

export const isAssetsFetching = createSelector(
  (state: RootState) => state.assets,
  (assets) => assets.status === "fetching"
);

export const getAssets = createSelector(
  (state: RootState) => state.assets,
  (assets) => assets
);

export const getTotalSupplyAndBorrowUSD = (tokenId: string) =>
  createSelector(
    (state: RootState) => state.assets,
    (assets) => {
      const asset = assets.data[tokenId];
      if (!asset) return [0, 0];

      const totalSupplyD = new Decimal(asset.supplied.balance).toFixed();
      const totalBorrowD = new Decimal(asset.borrowed.balance).toFixed();

      return [toUsd(totalSupplyD, asset), toUsd(totalBorrowD, asset)];
    }
  );
