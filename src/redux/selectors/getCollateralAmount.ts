import { createSelector } from "@reduxjs/toolkit";
import { shrinkToken } from "@/utils/numbers";
import { RootState } from "../store";
import { hasAssets } from "@/utils/lendingUtil";
import { toDecimal } from "@/utils/uiNumber";
import { DEFAULT_POSITION } from "@/services/constantConfig";

export const getCollateralAmount = (tokenId: string) =>
  createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.account,
    (assets, account) => {
      if (!hasAssets(assets)) return "0";
      try {
        const { metadata, config } = assets.data[tokenId];
        const position = DEFAULT_POSITION;
        const collateral =
          account.portfolio.positions[position]?.collateral?.[tokenId];
        if (!collateral) return "0";
        return toDecimal(
          shrinkToken(
            collateral.balance || 0,
            metadata.decimals + config.extra_decimals
          )
        );
      } catch (error) {}
    }
  );
