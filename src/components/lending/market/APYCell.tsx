import React, { useMemo, useCallback } from "react";
import Decimal from "decimal.js";
import { useExtraAPY } from "@/hooks/lending/useExtraAPY";
import { useAPY } from "@/hooks/lending/useAPY";
import { format_apy } from "@/utils/uiNumber";
import { standardizeAsset } from "@/utils/lendingUtil";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { getProtocolRewards } from "@/redux/selectors/getProtocolRewards";
import { Tooltip } from "@heroui/react";

interface APYCellProps {
  baseAPY: number;
  rewards: any[];
  page: string;
  tokenId: string;
  isStaking?: boolean;
  onlyMarket?: boolean;
  excludeNetApy?: boolean;
  textColor?: string;
}

export const APYCell = ({
  baseAPY,
  rewards,
  page,
  tokenId,
  isStaking = false,
  onlyMarket = false,
  excludeNetApy = false,
  textColor,
}: APYCellProps) => {
  // Filter out the ones rewards sent out
  const list = useMemo(
    () => rewards?.filter((reward) => reward.rewards.remaining_rewards !== "0"),
    [rewards]
  );

  const isBorrow = page === "borrow";
  const [boostedAPY, stakeBoostedAPY] = useAPY({
    baseAPY,
    rewards: list,
    tokenId,
    page,
    onlyMarket,
    excludeNetApy,
  });

  const stakeBooster = useMemo(
    () => new Decimal(stakeBoostedAPY).gt(boostedAPY),
    [boostedAPY, stakeBoostedAPY]
  );
  return (
    <ToolTip
      tokenId={tokenId}
      list={list}
      baseAPY={baseAPY}
      isBorrow={isBorrow}
      isStaking={isStaking}
      onlyMarket={onlyMarket}
      excludeNetApy={excludeNetApy}
      stakeBooster={stakeBooster}
    >
      <span
        className={`border-b border-dashed pb-0.5 whitespace-nowrap border-blac cursor-pointer ${
          textColor || "text-black"
        }`}
      >
        {format_apy(boostedAPY)}{" "}
        {stakeBooster ? `~ ${format_apy(stakeBoostedAPY)}` : ""}
      </span>
    </ToolTip>
  );
};

interface ToolTipProps {
  children: React.ReactNode;
  tokenId: string;
  list: any[];
  baseAPY: number;
  isBorrow: boolean;
  isStaking: boolean;
  onlyMarket: boolean;
  excludeNetApy: boolean;
  stakeBooster: boolean;
}

const ToolTip = ({
  children,
  tokenId,
  list,
  baseAPY,
  isBorrow,
  isStaking,
  onlyMarket,
  excludeNetApy,
  stakeBooster,
}: ToolTipProps) => {
  const assets = useAppSelector((state) => state.assets);
  const netTvlRewards = useAppSelector(getProtocolRewards);

  const {
    computeRewardAPY,
    computeStakingRewardAPY,
    netLiquidityAPY,
    netTvlMultiplier,
    computeTokenNetRewardAPY,
  } = useExtraAPY({ tokenId, isBorrow, onlyMarket });

  const netTvlFarmTokenId = useMemo(
    () => Object.keys(assets?.netTvlFarm || {})[0],
    [assets?.netTvlFarm]
  );

  const getNetTvlFarmRewardIcon = useCallback(() => {
    const asset = assets.data[netTvlFarmTokenId];
    return asset?.metadata?.icon;
  }, [assets.data, netTvlFarmTokenId]);

  const assetMetadata = useMemo(
    () =>
      standardizeAsset(
        JSON.parse(JSON.stringify(assets?.data?.[tokenId]?.metadata || {}))
      ),
    [assets?.data, tokenId]
  );

  const { apy, tokenNetRewards } = computeTokenNetRewardAPY();
  return (
    <Tooltip
      content={
        <div className="text-gray-110 text-xs pt-2 max-w-sm">
          {/* base APY */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <span>Base APY</span>
            <span className="text-black">{format_apy(baseAPY)}</span>
          </div>
          {/* Net Liquidity APY */}
          {!isBorrow &&
          !excludeNetApy &&
          Array.isArray(netTvlRewards) &&
          netTvlRewards.length > 0 ? (
            <div className="flex items-center justify-between mb-2">
              <span>Net Liquidity APY</span>
              <div className="flex items-center justify-end gap-1.5 text-black">
                <img
                  className="w-4 h-4 rounded-full"
                  alt=""
                  src={getNetTvlFarmRewardIcon()}
                />
                {format_apy(netLiquidityAPY * netTvlMultiplier)}
              </div>
            </div>
          ) : null}
          {/* Token Liquidity APY */}
          {!isBorrow && tokenNetRewards.length > 0 ? (
            <div className="flex flex-col mb-2">
              <div className="flex items-center justify-between gap-4">
                <span className="whitespace-nowrap">
                  {assetMetadata?.symbol} Net Liquidity Reward APY
                </span>
                <div className="flex items-center justify-end gap-1.5 break-all text-black">
                  <div className="flex items-center flex-shrink-0">
                    {tokenNetRewards.map((reward, index) => {
                      return (
                        <img
                          key={reward.token_id}
                          className={`w-4 h-4 rounded-full flex-shrink-0 ${
                            index > 0 ? "-ml-1.5" : ""
                          }`}
                          alt=""
                          src={reward.icon}
                        />
                      );
                    })}
                  </div>
                  {format_apy(apy)}{" "}
                  {stakeBooster
                    ? `~ ${format_apy(Number(apy || 0) * 1.5)}`
                    : ""}
                </div>
              </div>
            </div>
          ) : null}

          {list.map(({ rewards, metadata, price, config }) => {
            const { symbol, icon } = metadata;
            const rewardAPY = computeRewardAPY({
              rewardTokenId: metadata.token_id,
              rewardData: rewards,
            });

            const stakingRewardAPY = computeStakingRewardAPY(metadata.token_id);
            return (
              <div
                className="flex items-center justify-between"
                key={metadata?.token_id}
              >
                <div className="flex items-center gap-2">
                  <img width={16} height={16} src={icon} alt={symbol} />
                  <span>{symbol}</span>
                </div>
                <div className="text-black">
                  {isBorrow ? "-" : ""}
                  {format_apy(isStaking ? stakingRewardAPY : rewardAPY)}
                </div>
              </div>
            );
          })}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

export default APYCell;
