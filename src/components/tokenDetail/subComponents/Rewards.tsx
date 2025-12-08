import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { shrinkToken } from "@/utils/numbers";
import {
  useProRataNetLiquidityReward,
  useTokenNetLiquidityRewards,
} from "@/hooks/lending/useRewards";
import { getNetLiquidityRewards } from "@/redux/selectors/getProtocolRewards";
import { toInternationalCurrencySystem_usd } from "@/utils/uiNumber";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { standardizeAsset } from "@/utils/lendingUtil";
import { getRandomString } from "@/utils/common";
import { IReward } from "@/interface/lending/asset";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { Tooltip } from "@heroui/react";

interface Props {
  rewards?: IReward[];
  layout?: "horizontal" | "vertical";
  fontWeight?: "normal" | "bold";
  page?: "deposit" | "borrow";
  tokenId: string;
}

export const RewardsV2 = ({
  rewards: list = [],
  layout,
  page,
  tokenId,
}: Props) => {
  const isHorizontalLayout = layout === "horizontal";
  const assets = useAppSelector(getAssets);
  const asset = assets.data[tokenId];
  const netLiquidityRewards = useAppSelector(getNetLiquidityRewards);
  const tokenNetLiquidityRewards = useTokenNetLiquidityRewards(tokenId);
  const netReward = netLiquidityRewards[0];
  return (
    <RewardsTooltipV2
      hidden={!isHorizontalLayout}
      poolRewards={list}
      netLiquidityRewards={netReward}
      tokenNetLiquidityRewards={tokenNetLiquidityRewards}
      tokenId={tokenId}
      asset={asset}
    >
      <TotalDailyRewardsUsd
        poolRewards={list}
        netLiquidityRewards={netReward}
        tokenNetLiquidityRewards={tokenNetLiquidityRewards}
        tokenId={tokenId}
      />
    </RewardsTooltipV2>
  );
};
const RewardsTooltipV2 = ({
  children,
  hidden,
  poolRewards,
  netLiquidityRewards,
  tokenNetLiquidityRewards,
  tokenId,
  asset,
}: any) => {
  const toolTipId = useMemo(() => {
    return getRandomString();
  }, []);
  if (hidden) return children;
  const hasPoolRewards = !!poolRewards?.length;
  const hasTokenetRewards = !!tokenNetLiquidityRewards?.length;
  const hasNetLiquidityRewards =
    !!netLiquidityRewards && asset?.config?.net_tvl_multiplier > 0;
  const isEmpty =
    !hasPoolRewards && !hasTokenetRewards && !hasNetLiquidityRewards;
  const assetMetadata = standardizeAsset(
    JSON.parse(JSON.stringify(asset?.metadata || {}))
  );
  return (
    <div>
      <div>{children}</div>
      <Tooltip id={toolTipId}>
        {isEmpty ? (
          ""
        ) : (
          <div>
            {/* {hasPoolRewards && (
              <div className="flex items-start justify-between gap-5">
                <span className="text-gray-300 text-xs">Pool</span>
                <div className="flex items-center text-xs text-white">
                  <RewardV2List rewardsList={poolRewards} />
                </div>
              </div>
            )} */}
            {/* {hasNetLiquidityRewards && (
              <div className="flex items-center justify-between gap-5">
                <span className="text-gray-300 text-xs">Net Liquidity</span>
                <div className="flex items-center text-xs text-white">
                  <RewardV2
                    key={netLiquidityRewards.metadata.symbol}
                    {...netLiquidityRewards}
                    tokenId={tokenId}
                  />
                </div>
              </div>
            )}
            {hasTokenetRewards && (
              <div className="flex items-start justify-between gap-5">
                <span className="text-gray-300 text-xs">
                  {assetMetadata?.symbol} Net Liquidity
                </span>
                <div className="flex items-center text-xs text-white">
                  <RewardV2List rewardsList={tokenNetLiquidityRewards} />
                </div>
              </div>
            )} */}
          </div>
        )}
      </Tooltip>
    </div>
  );
};
const RewardV2 = ({ metadata, rewards, config, tokenId }: any) => {
  const { token_id, icon, decimals } = metadata;
  const dailyRewards = shrinkToken(
    rewards.reward_per_day || 0,
    decimals + config.extra_decimals
  );
  const rewardAmount = useProRataNetLiquidityReward(tokenId, dailyRewards);

  const amount = beautifyNumber({
    num: Number(rewardAmount),
  });
  return (
    <div className="flex items-center gap-1">
      <img className="w-4 h-4 rounded-full" alt="" src={icon} />
      {amount}
    </div>
  );
};
const RewardV2List = ({ rewardsList }: any) => {
  const rewardsDetailList = getRewardsDetailData(rewardsList);
  return (
    <div className="flex flex-col gap-1">
      {rewardsDetailList.map((reward) => {
        const { rewardTokenId, metadata, dailyReward } = reward;
        const amount = beautifyNumber({
          num: Number(dailyReward),
        });
        return (
          <div key={rewardTokenId} className="flex items-center gap-1">
            <img
              className="w-4 h-4 rounded-full flex-shrink-0"
              alt=""
              src={metadata?.icon}
            />
            {amount}
          </div>
        );
      })}
    </div>
  );
};
const TotalDailyRewardsUsd = ({
  poolRewards,
  netLiquidityRewards,
  tokenNetLiquidityRewards,
  tokenId,
}: any) => {
  const rewardsMetadataMap = {};
  const poolRewardsDetailList = getRewardsDetailData(poolRewards);
  const tokennetRewardsDetailList = getRewardsDetailData(
    tokenNetLiquidityRewards
  );
  let netLiquidityDailyAmount = "0";
  if (netLiquidityRewards) {
    const { metadata, rewards, config } = netLiquidityRewards;
    const { decimals, token_id } = metadata;
    netLiquidityDailyAmount = shrinkToken(
      rewards.reward_per_day || 0,
      decimals + config.extra_decimals
    );
    rewardsMetadataMap[token_id] = metadata;
  }
  const netLiquidityDailyRewardsForToken = useProRataNetLiquidityReward(
    tokenId,
    netLiquidityDailyAmount
  );
  const net_total_usd = new Decimal(netLiquidityRewards?.price || 0).mul(
    netLiquidityDailyRewardsForToken || 0
  );
  const pool_total_usd = poolRewardsDetailList.reduce((acc, cur) => {
    const t = acc.plus(cur.dailyRewardUsd);
    rewardsMetadataMap[cur.rewardTokenId] = cur.metadata;
    return t;
  }, new Decimal(0));
  const tokennet_total_usd = tokennetRewardsDetailList.reduce((acc, cur) => {
    const t = acc.plus(cur.dailyRewardUsd);
    rewardsMetadataMap[cur.rewardTokenId] = cur.metadata;
    return t;
  }, new Decimal(0));
  const total_usd = toInternationalCurrencySystem_usd(
    net_total_usd.plus(pool_total_usd).plus(tokennet_total_usd).toFixed()
  );
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex items-center">
        {Object.entries(rewardsMetadataMap).map(
          ([token_id, tokenMetadata]: any, index) => {
            return (
              <img
                className={`w-4 h-4 rounded-full flex-shrink-0 ${
                  index > 0 ? "-ml-1" : ""
                }`}
                key={token_id}
                src={tokenMetadata.icon}
                alt=""
              />
            );
          }
        )}
        {Object.keys(rewardsMetadataMap).length > 4 ? (
          <div className="w-4 h-4 rounded-3xl bg-dark-360 flex items-center justify-center -ml-1 z-50">
            {/* <ThreeDotIcon /> */}
          </div>
        ) : null}
      </div>
      <span className="text-black text-base max-sm:text-lg font-semibold">
        {total_usd}
      </span>
    </div>
  );
};
function getRewardsDetailData(rewardList: any) {
  const list = rewardList.map((cur) => {
    const { metadata, rewards, config, price } = cur;
    const { decimals, token_id } = metadata;
    const dailyReward = shrinkToken(
      rewards.reward_per_day || 0,
      decimals + config.extra_decimals
    );
    const dailyRewardUsd = new Decimal(dailyReward).mul(price).toFixed();
    return {
      rewardTokenId: token_id,
      metadata,
      dailyReward,
      dailyRewardUsd,
    };
  });
  return list;
}
