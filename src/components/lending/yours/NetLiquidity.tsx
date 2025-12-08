import React, { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { getTotalAccountBalance } from "@/redux/selectors/getTotalAccountBalance";
import { DefaultToolTip } from "@/components/common/toolTip";
import { beautifyNumber } from "@/utils/beautifyNumber";

export function NetLiquidity({}) {
  const userDeposited = useAppSelector(getTotalAccountBalance("supplied"));
  const userBorrowed = useAppSelector(getTotalAccountBalance("borrowed"));

  const userNetLiquidity = new Decimal(userDeposited || 0)
    .minus(userBorrowed || 0)
    .toNumber();

  return (
    <>
      <DefaultToolTip
        className="relative z-5"
        tip={
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-50">Supplied</span>
              <span>
                {beautifyNumber({
                  num: userDeposited || "0",
                  className: "text-black text-sm",
                  isUsd: true,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-50">Borrowed</span>
              <span>
                {beautifyNumber({
                  num: userBorrowed || "0",
                  className: "text-red-10 text-sm",
                  isUsd: true,
                })}
              </span>
            </div>
          </div>
        }
        place="top"
        openWay="hover"
      >
        <div className="cursor-pointer">
          {beautifyNumber({
            num: userNetLiquidity || "0",
            className:
              "text-black text-2xl border-b border-dotted max-sm:text-xl",
            isUsd: true,
          })}
        </div>
      </DefaultToolTip>
    </>
  );
}
