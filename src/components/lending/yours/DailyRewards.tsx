import React, { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { getTotalAccountBalance } from "@/redux/selectors/getTotalAccountBalance";
import { useRewards, useDailyRewards } from "@/hooks/lending/useRewards";
import { DefaultToolTip } from "@/components/common/toolTip";
import { beautifyNumber } from "@/utils/beautifyNumber";

export function DailyRewards() {
  const {
    baseDepositUsdDaily,
    baseBorrowedUsdDaily,
    farmSuppliedUsdDaily,
    farmBorrowedUsdDaily,
    farmTokenNetUsdDaily,
    farmNetTvlUsdDaily,
    farmTotalUsdDaily,
    totalUsdDaily,
    allRewards,
  } = useDailyRewards();
  const isNegative = totalUsdDaily < 0;

  return (
    <>
      <div
        className={`flex items-center gap-1 ${isNegative ? "text-red-10" : ""}`}
      >
        <DefaultToolTip
          className="relative z-5"
          tip={
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-50">Supply Interest</span>
                <span>
                  {beautifyNumber({
                    num: baseDepositUsdDaily || 0,
                    className: "text-black text-sm",
                    isUsd: true,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-50">Incentive Reward</span>
                <span>
                  {beautifyNumber({
                    num: farmTotalUsdDaily || 0,
                    className: "text-black text-sm",
                    isUsd: true,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-50">Borrow Interest</span>
                <span className="text-red-10">
                  -
                  {beautifyNumber({
                    num: baseBorrowedUsdDaily > 0 ? baseBorrowedUsdDaily : 0,
                    className: "text-red-10 text-sm",
                    isUsd: true,
                  })}
                </span>
              </div>
            </div>
          }
        >
          <span className="flex items-center">
            {isNegative ? "-" : ""}
            {beautifyNumber({
              num: new Decimal(totalUsdDaily || 0).abs().toFixed(),
              isUsd: true,
              className: `border-b border-dotted text-2xl max-sm:text-xl ${
                isNegative ? "text-red-10" : ""
              }`,
            })}
          </span>
        </DefaultToolTip>
        {/* <IconMore allRewards={allRewards} /> */}
      </div>
    </>
  );
}
