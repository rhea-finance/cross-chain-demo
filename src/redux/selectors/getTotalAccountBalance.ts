import _ from "lodash";
import { createSelector } from "@reduxjs/toolkit";
import { shrinkToken } from "@/utils/numbers";
import { RootState } from "../store";
import { sumReducer, hasAssets } from "@/utils/lendingUtil";

export const getTotalAccountBalance = (source: "borrowed" | "supplied") =>
  createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.account,
    (assets, account) => {
      if (!hasAssets(assets)) return 0;
      let tokenUsds: any[] = [];
      tokenUsds = sumTokenUsds(account, assets, source);
      return tokenUsds.reduce(sumReducer, 0);
    }
  );

const sumTokenUsds = (account, assets, source) => {
  const { borrows, collaterals, supplies } = account.portfolio || {};
  const tokens =
    source === "supplied" ? [...supplies, ...collaterals] : borrows;

  const tokenUsds = tokens.map((d) => {
    const { token_id } = d || {};
    const assetData = assets.data[token_id];
    if (!assetData) return 0;
    const { price, metadata, config } = assetData;

    const tokenUsd =
      Number(
        shrinkToken(d?.balance || 0, metadata.decimals + config.extra_decimals)
      ) * (price?.usd || 0);

    return tokenUsd;
  });

  return tokenUsds;
};
