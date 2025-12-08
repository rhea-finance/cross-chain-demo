import React, { useMemo, useState } from "react";
import Big from "big.js";
import { useUserHealth } from "@/hooks/lending/useUserHealth";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { useAverageAPY } from "@/hooks/lending/useAverageAPY";
import { getAverageSupplyRewardApy } from "@/redux/selectors/getAverageSuppliedRewardApy";
import { getAverageBorrowedRewardApy } from "@/redux/selectors/getAverageBorrowedRewardApy";
import { getAverageNetRewardApy } from "@/redux/selectors/getAverageNetRewardApy";
import { getListTokenNetRewardApy } from "@/redux/selectors/getListTokenNetRewardApy";
import { getTotalAccountBalance } from "@/redux/selectors/getTotalAccountBalance";
import { useDailyRewards } from "@/hooks/lending/useRewards";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { DefaultToolTip, TagToolTip } from "@/components/common/toolTip";

export function NetApy() {
  const [tip] = useState(
    "Net APY = Daily Total Profit / Your Net Liquidity * 365 days"
  );

  // Get daily rewards and net liquidity for correct calculation
  const { totalUsdDaily } = useDailyRewards();
  const userDeposited = useAppSelector(getTotalAccountBalance("supplied"));
  const userBorrowed = useAppSelector(getTotalAccountBalance("borrowed"));
  const netLiquidity = new Big(userDeposited || 0)
    .minus(userBorrowed || 0)
    .toNumber();

  // Calculate Net APY using the correct formula: (Daily Rewards / Net Liquidity) * 365 * 100
  // Multiply by 100 to convert from decimal to percentage
  const netApy = useMemo(() => {
    if (netLiquidity <= 0 || !totalUsdDaily) return 0;
    return new Big(totalUsdDaily).div(netLiquidity).mul(365).mul(100).toFixed();
  }, [totalUsdDaily, netLiquidity]);

  return (
    <>
      {/* pc */}
      <div
        className={`flex items-center border border-white/20 rounded-lg h-[36px] px-2 max-sm:hidden`}
      >
        <span className="flex items-center gap-1 mr-2">
          <span className="text-gray-410 text-sm paceGrotesk-Bold ">
            Net APY:
          </span>
          <TagToolTip title="Net APY = Daily Total Profit / Your Net Liquidity * 365 days" />
        </span>
        <span className="relative -top-px">
          {beautifyNumber({
            num: netApy || 0,
            isPercent: true,
          })}
        </span>
      </div>
      {/* mobile */}
      <div className="lg:hidden px-4">
        <span className="flex items-center gap-1 mr-2">
          <span className="text-black text-sm paceGrotesk-Bold ">Net APY</span>
          <TagToolTip title="Net APY = Daily Total Profit / Your Net Liquidity * 365 days" />
        </span>
        <span>
          {beautifyNumber({
            num: netApy || 0,
            isPercent: true,
            className: "text-gray-60",
          })}
        </span>
      </div>
    </>
  );
}

export function NetApySimple() {
  const { averageSupplyApy, averageBorrowedApy } = useAverageAPY();
  const userSupplyApy = useAppSelector(getAverageSupplyRewardApy);
  const userBorrowedApy = useAppSelector(getAverageBorrowedRewardApy);
  const userNetApy = useAppSelector(getAverageNetRewardApy);
  const userListTokenNetApy = useAppSelector(getListTokenNetRewardApy());
  const empty =
    !userSupplyApy &&
    !userBorrowedApy &&
    !userNetApy &&
    !userListTokenNetApy.length;

  // Get daily rewards and net liquidity for correct calculation
  const { totalUsdDaily } = useDailyRewards();
  const userDeposited = useAppSelector(getTotalAccountBalance("supplied"));
  const userBorrowed = useAppSelector(getTotalAccountBalance("borrowed"));
  const netLiquidity = new Big(userDeposited || 0)
    .minus(userBorrowed || 0)
    .toNumber();

  // Calculate Net APY using the correct formula: (Daily Rewards / Net Liquidity) * 365 * 100
  // Multiply by 100 to convert from decimal to percentage
  const netApy = useMemo(() => {
    if (netLiquidity <= 0 || !totalUsdDaily) return 0;
    return new Big(totalUsdDaily).div(netLiquidity).mul(365).mul(100).toFixed();
  }, [totalUsdDaily, netLiquidity]);

  return (
    <>
      <DefaultToolTip
        className="relative z-5"
        tip={
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-50">Avg. Supply APY</span>
              <span>
                {beautifyNumber({
                  num: averageSupplyApy || 0,
                  className: "text-black text-sm",
                  isPercent: true,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-50">Avg. Borrow APY</span>
              <span>
                {beautifyNumber({
                  num: averageBorrowedApy || 0,
                  className: "text-black text-sm",
                  isPercent: true,
                })}
              </span>
            </div>
            {userSupplyApy ? (
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-50">Avg. Supply Reward APY</span>
                <span>
                  {beautifyNumber({
                    num: userSupplyApy || 0,
                    className: "text-black text-sm",
                    isPercent: true,
                  })}
                </span>
              </div>
            ) : null}
            {userBorrowedApy ? (
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-50">Avg. Borrow Reward APY</span>
                <span>
                  {beautifyNumber({
                    num: userBorrowedApy || 0,
                    className: "text-black text-sm",
                    isPercent: true,
                  })}
                </span>
              </div>
            ) : null}
            {userListTokenNetApy.length
              ? userListTokenNetApy.map((apyData) => {
                  return (
                    <div
                      className="flex items-center justify-between text-sm gap-4"
                      key={apyData.asset.token_id}
                    >
                      <span className="text-gray-50">
                        {apyData.asset.metadata.symbol} Net Liquidity Reward APY
                      </span>
                      <span>
                        {beautifyNumber({
                          num: apyData.apy || 0,
                          className: "text-black text-sm",
                          isPercent: true,
                        })}
                      </span>
                    </div>
                  );
                })
              : null}
          </div>
        }
        openWay="hover"
      >
        <span className="cursor-pointer">
          {beautifyNumber({
            num: netApy || 0,
            isPercent: true,
            className:
              "text-2xl text-black border-b border-dotted max-sm:text-xl",
          })}
        </span>
      </DefaultToolTip>
    </>
  );
}
