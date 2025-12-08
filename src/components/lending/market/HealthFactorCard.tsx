import React from "react";
import Decimal from "decimal.js";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { getTotalAccountBalance } from "@/redux/selectors/getTotalAccountBalance";
import { useUserHealth } from "@/hooks/lending/useUserHealth";
import { toInternationalCurrencySystem_usd } from "@/utils/uiNumber";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/redux/store";
import { sumReducer, hasAssets } from "@/utils/lendingUtil";
import { shrinkToken } from "@/utils/numbers";
import { HealthFactorWarnIcon } from "../icon";
import { DefaultToolTip } from "../../common/toolTip";
import { getHealthStatus } from "@/redux/selectors/getHealthFactor";

const getTotalCollateral = createSelector(
  (state: RootState) => state.assets,
  (state: RootState) => state.account,
  (assets, account) => {
    if (!hasAssets(assets)) return 0;
    const { collaterals } = account.portfolio || {};
    if (!collaterals) return 0;

    const tokenUsds = collaterals.map((d) => {
      const { token_id } = d || {};
      const assetData = assets.data[token_id];
      if (!assetData) return 0;
      const { price, metadata, config } = assetData;
      const tokenUsd = new Decimal(
        shrinkToken(d?.balance || 0, metadata.decimals + config.extra_decimals)
      )
        .mul(price?.usd || 0)
        .toNumber();
      return tokenUsd;
    });

    return tokenUsds.reduce(sumReducer, 0);
  }
);

const healthBackgroundColor = {
  good: "#00F7A5",
  warning: "#FFD300",
  danger: "#FF4901",
};

export const HealthFactorCard = () => {
  const userHealth = useUserHealth();
  const userBorrowed = useAppSelector(getTotalAccountBalance("borrowed"));
  const userCollateral = useAppSelector(getTotalCollateral);

  const healthFactor =
    userHealth?.allHealths?.[0]?.healthFactor || userHealth?.healthFactor;

  const healthPercentage =
    healthFactor !== null && healthFactor !== undefined && healthFactor !== -1
      ? healthFactor
      : null;

  // Get health status and corresponding colors
  const healthStatus =
    healthFactor !== null && healthFactor !== -1
      ? getHealthStatus(healthFactor)
      : "null";

  const color =
    healthFactor === -1 || healthFactor === null
      ? "#EAEAEA"
      : healthBackgroundColor[healthStatus];

  return (
    <div className="w-1/3 bg-white rounded-2xl p-6 border border-gray-30 max-sm:w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-green-10`} />
          <p className="text-base text-gray-20">HEALTH FACTOR</p>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-b-10">
            {healthPercentage !== null
              ? `${healthPercentage.toFixed(0)}%`
              : "-"}
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 relative pl-1">
            <div className="w-full h-2 bg-gray-210 overflow-hidden">
              <div
                className="h-full"
                style={{
                  backgroundColor: color,
                  width: "100%",
                }}
              />
            </div>
            {/* Dynamic middle line based on health factor */}
            {healthPercentage !== null && (
              <div
                className="absolute top-[-6px] w-px h-4 bg-red-10 transform -translate-y-0.5"
                style={{
                  left: `${Math.min((healthPercentage / 1000) * 100, 100)}%`,
                }}
              />
            )}
          </div>
          <div className="flex items-center h-2">
            <DefaultToolTip
              tip={
                <div className="text-xs text-gray-110 w-[249px]">
                  Shows the total collateral ratio of your borrowed assets. If
                  this value drops below&nbsp;
                  <span className="text-black font-medium">100%</span>, your
                  account becomes eligible for partial liquidation.
                </div>
              }
            >
              <HealthFactorWarnIcon
                className={
                  healthStatus === "danger"
                    ? "text-[#FF5016] cursor-pointer"
                    : "text-[#CBCBCB] cursor-pointer"
                }
              />
            </DefaultToolTip>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-gray-80 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-20">Your Collateral</span>
          <span className="text-sm font-bold text-b-10">
            {userCollateral
              ? toInternationalCurrencySystem_usd(userCollateral)
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-20">Your Borrowed</span>
          <span className="text-sm font-bold text-red-10">
            {userBorrowed
              ? toInternationalCurrencySystem_usd(userBorrowed)
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
};
