import { createSelector } from "@reduxjs/toolkit";
import { MAX_RATIO, DEFAULT_POSITION } from "@/services/constantConfig";
import { RootState } from "../store";
import { hasAssets } from "@/utils/lendingUtil";
import { getAdjustedSum } from "@rhea-finance/cross-chain-sdk";

export const LOW_HEALTH_FACTOR = 180;
export const DANGER_HEALTH_FACTOR = 100;

export const getHealthFactor = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account.portfolio,
  (assets, portfolio) => {
    if (!hasAssets(assets)) return null;
    if (!portfolio) return null;
    // Let calHealthFactor handle all cases including when there's collateral but no borrowed
    return calHealthFactor(portfolio, assets);
  }
);
export const getLPHealthFactor = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account.portfolio,
  (assets, portfolio) => {
    if (!hasAssets(assets)) return null;
    if (!portfolio?.positions) return null;
    const LPToken = {};
    Object.entries(portfolio?.positions).forEach(([key, value]: any) => {
      if (key !== DEFAULT_POSITION) {
        const asset = assets?.data?.[key];
        const healthFactor = calHealthFactor(portfolio, assets, key);
        LPToken[key] = {
          ...value,
          metadata: asset?.metadata,
          healthFactor: Math.trunc(healthFactor),
          healthStatus: getHealthStatus(healthFactor),
        };
      }
    });
    return LPToken;
  }
);

const calHealthFactor = (portfolio: any, assets: any, positionId?: string) => {
  const adjustedCollateralSum = getAdjustedSum({
    type: "collateral",
    portfolio,
    assets: assets.data,
  });
  const adjustedBorrowedSum = getAdjustedSum({
    type: "borrowed",
    portfolio,
    assets: assets.data,
  });
  // If no collateral or no borrowed amount, return appropriate value
  if (adjustedCollateralSum.isZero() && adjustedBorrowedSum.isZero()) {
    return -1; // No position
  }
  if (adjustedCollateralSum.isZero() && !adjustedBorrowedSum.isZero()) {
    return -1; // No collateral but has borrowed - should not happen in normal flow
  }
  if (!adjustedCollateralSum.isZero() && adjustedBorrowedSum.isZero()) {
    return MAX_RATIO; // Has collateral but no borrowed - perfect health
  }

  const healthFactor = adjustedCollateralSum
    .div(adjustedBorrowedSum)
    .mul(100)
    .toNumber();
  return healthFactor < MAX_RATIO ? healthFactor : MAX_RATIO;
};

export const getHealthStatus = (healthFactor) => {
  const isDanger = healthFactor !== -1 && healthFactor < DANGER_HEALTH_FACTOR;
  const isWarning = healthFactor !== -1 && healthFactor < LOW_HEALTH_FACTOR;
  let healthStatus = "good";
  if (isWarning) {
    healthStatus = "warning";
  }
  if (isDanger) {
    healthStatus = "danger";
  }
  return healthStatus;
};
