import { createSelector } from "@reduxjs/toolkit";
import { shrinkToken } from "@/utils/numbers";
import { RootState } from "../store";

export const getStaking = (tokenId?: string) => {
  return createSelector(
    (state: RootState) => state.account,
    (state: RootState) => state.app,
    (account, app) => {
      const { config, boosterTokens } = app;
      const boosterConfig =
        tokenId && Object.keys(boosterTokens).length > 0
          ? boosterTokens?.[tokenId]
          : config;
      const { amount, months } = app.staking;
      // BRRR amount staked
      const BRRR = tokenId
        ? Number(
            shrinkToken(
              account.portfolio?.stakings?.[tokenId]?.staked_booster_amount ||
                0,
              boosterConfig?.booster_decimals
            )
          )
        : Number(
            shrinkToken(
              account.portfolio?.staking?.staked_booster_amount || 0,
              boosterConfig?.booster_decimals
            )
          );
      // xBRRR amount staked
      const xBRRR = tokenId
        ? Number(
            shrinkToken(
              account.portfolio?.stakings?.[tokenId]?.x_booster_amount || 0,
              boosterConfig?.booster_decimals
            )
          )
        : Number(
            shrinkToken(
              account.portfolio?.staking?.x_booster_amount || 0,
              boosterConfig?.booster_decimals
            )
          );

      // the multiple of amount that is incentivized by months.
      const xBRRRMultiplier =
        1 +
        ((months * boosterConfig.minimum_staking_duration_sec -
          boosterConfig.minimum_staking_duration_sec) /
          (boosterConfig.maximum_staking_duration_sec -
            boosterConfig.minimum_staking_duration_sec)) *
          (boosterConfig.x_booster_multiplier_at_maximum_staking_duration /
            10000 -
            1);

      // xBRRR new amount
      const extraXBRRRAmount = Number(amount) * xBRRRMultiplier;
      // xBRRR staked + xBRRR new amount
      const totalXBRRR = xBRRR + extraXBRRRAmount;
      return {
        BRRR,
        xBRRR,
        amount,
        months,
        extraXBRRRAmount,
        totalXBRRR,
      };
    }
  );
};
