import Decimal from "decimal.js";
import { shrinkToken } from "@/utils/numbers";
import { standardizeAsset } from "@/utils/lendingUtil";
import { IReward } from "@/interface/lending";
import { IMetadata } from "@rhea-finance/cross-chain-sdk";
import { beautifyNumber } from "@/utils/beautifyNumber";

interface RewardProps {
  rewardList?: IReward[];
  supplyReward?: {
    supplyDailyAmount: string;
    supplyDailyAmountUsd: string;
    metadata: IMetadata;
  };
  page?: "deposit" | "borrow";
}

const DashboardReward = ({ rewardList = [], supplyReward }: RewardProps) => {
  let node;
  let nodeSupply;
  let totalUsd = 0;
  let hasCommonReward = false;
  if (rewardList?.length) {
    node = rewardList.map(({ metadata, rewards, config, price }) => {
      const { symbol, decimals, token_id } = metadata;
      const dailyRewards = shrinkToken(
        rewards.reward_per_day || 0,
        decimals + config.extra_decimals
      );
      const usdPrice = price ? Number(dailyRewards) * price : 0;
      totalUsd += usdPrice;
      if (supplyReward?.metadata?.token_id == token_id) {
        hasCommonReward = true;
      }
      const cloned = metadata && standardizeAsset({ ...metadata });
      return (
        <div key={symbol} style={{ margin: "0 -3px" }}>
          <img src={cloned?.icon} className="w-5 h-5 rounded-full" alt="" />
        </div>
      );
    });
  }
  const clonedSupplyMetadata =
    supplyReward?.metadata && standardizeAsset({ ...supplyReward?.metadata });
  if (clonedSupplyMetadata) {
    if (
      !hasCommonReward &&
      new Decimal(supplyReward?.supplyDailyAmount || 0).gt(0)
    ) {
      nodeSupply = (
        <div
          key={`${clonedSupplyMetadata.token_id}supply`}
          style={{ margin: "0 -3px" }}
        >
          <img
            src={clonedSupplyMetadata.icon}
            className="w-5 h-5 rounded-full"
            alt=""
          />
        </div>
      );
    }

    totalUsd = new Decimal(totalUsd)
      .plus(supplyReward?.supplyDailyAmountUsd || 0)
      .toNumber();
  }
  const usdNode =
    totalUsd !== 0 &&
    beautifyNumber({
      num: totalUsd,
      isUsd: true,
      className: "text-xs text-gray-50",
    });

  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="flex items-center">
        {node}
        {nodeSupply}
      </div>
      <div className="text-gray-50">{usdNode}</div>
    </div>
  );
};

export default DashboardReward;
