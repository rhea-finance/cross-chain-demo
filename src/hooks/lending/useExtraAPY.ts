import Decimal from "decimal.js";
import _ from "lodash";
import { getAccountPortfolio } from "@/redux/selectors/accountSelectors";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { computePoolsDailyAmount } from "@/redux/selectors/getAccountRewards";
import { getStaking } from "@/redux/selectors/getStaking";
import { getConfig } from "@/redux/selectors/appSelectors";
import { useAppSelector } from "./useRedux";
import { shrinkToken } from "@/utils/numbers";
import { getNetTvlAPY, getTotalNetTvlAPY } from "@/redux/selectors/getNetAPY";
import { useNonFarmedAssets } from "./hooks";
import { DEFAULT_POSITION } from "@/services/constantConfig";
import {
  filterSentOutFarms,
  filterAccountSentOutFarms,
} from "@/utils/lendingUtil";
import { AssetsState } from "@/redux/state/assetState";

export function useExtraAPY({
  tokenId: assetId,
  isBorrow,
  onlyMarket,
}: {
  tokenId: string;
  isBorrow: boolean | undefined;
  onlyMarket?: boolean;
}) {
  const { xBRRR = 0, extraXBRRRAmount = 0 } = useAppSelector(getStaking());
  const portfolio = useAppSelector(getAccountPortfolio);
  const appConfig = useAppSelector(getConfig);
  const assets = useAppSelector(getAssets);
  const userNetTvlAPY = useAppSelector(getNetTvlAPY({ isStaking: false }));
  const totalNetTvlApy = useAppSelector(getTotalNetTvlAPY);
  const { hasNegativeNetLiquidity } = useNonFarmedAssets();
  const asset = assets.data[assetId];
  if (!asset)
    return {
      computeRewardAPY: () => 0,
      computeStakingRewardAPY: () => 0,
      netLiquidityAPY: 0,
      netTvlMultiplier: 0,
      computeTokenNetRewardAPY: () => ({
        apy: 0,
        tokenNetRewards: [],
        canBeBooster: false,
      }),
    };
  const assetDecimals = asset.metadata.decimals + asset.config.extra_decimals;
  const assetPrice = assets.data[assetId].price?.usd || 0;
  const position = DEFAULT_POSITION;
  const hasNetTvlFarms = Object.keys(portfolio.farms.netTvl).length > 0;
  const suppliedBalancePerShare = new Decimal(asset.supplied.balance).div(
    asset.supplied.shares || "1"
  );
  const borrowedBalancePerShare = new Decimal(asset.borrowed.balance).div(
    asset.borrowed.shares || "1"
  );

  let netLiquidityAPY;
  if (onlyMarket) {
    netLiquidityAPY = totalNetTvlApy;
  } else if (hasNegativeNetLiquidity) {
    netLiquidityAPY = 0;
  } else if (hasNetTvlFarms) {
    netLiquidityAPY = userNetTvlAPY;
  } else {
    netLiquidityAPY = totalNetTvlApy;
  }
  const totalBorrowAssetUSD =
    Number(
      shrinkToken(
        portfolio.positions?.[position]?.borrowed?.[assetId]?.balance || 0,
        assetDecimals
      )
    ) * +(assetPrice || 0);
  const totalSupplyAssetUSD =
    Number(
      shrinkToken(portfolio.supplied[assetId]?.balance || 0, assetDecimals)
    ) * +(assetPrice || 0);
  const totalCollateralAssetUSD =
    Number(
      shrinkToken(
        portfolio.positions?.[position]?.collateral?.[assetId]?.balance || 0,
        assetDecimals
      )
    ) * +(assetPrice || 0);

  const totalUserAssetUSD = isBorrow
    ? totalBorrowAssetUSD
    : totalSupplyAssetUSD + totalCollateralAssetUSD;

  const computeTokenNetRewardAPY = () => {
    const tokenNetFarmsPending = asset.farms.tokennetbalance || {};
    // Filter out the ones rewards sent out
    const tokenNetFarms = filterSentOutFarms(tokenNetFarmsPending);
    // rewards token metas
    const rewardMetas = Object.keys(tokenNetFarms).map(
      (rewardTokenId) => assets.data[rewardTokenId].metadata
    );
    const canBeBooster = !_.isEmpty(
      Object.values(tokenNetFarms)[0]?.booster_log_bases
    );
    if (onlyMarket) {
      // market
      const marketApy = Object.entries(tokenNetFarms).reduce(
        (acc, [rewardTokenId, farmData]) => {
          const rewardAsset = assets.data[rewardTokenId];
          const rewardAPY = new Decimal(farmData.reward_per_day)
            .div(
              new Decimal(10).pow(
                rewardAsset.metadata.decimals +
                  rewardAsset.config.extra_decimals
              )
            )
            .mul(365)
            .mul(rewardAsset.price?.usd || "0")
            .div(
              new Decimal(
                shrinkToken(farmData.boosted_shares, assetDecimals)
              ).mul(asset.price?.usd || "0")
            )
            .mul(100);
          acc = acc.plus(rewardAPY);
          return acc;
        },
        new Decimal(0)
      );

      return {
        apy: marketApy.toNumber(),
        tokenNetRewards: rewardMetas,
        canBeBooster,
      };
    } else {
      // user
      const userTokenNetFarmsPending =
        portfolio.farms.tokennetbalance[assetId] || {};
      const userTokenNetFarms = filterAccountSentOutFarms(
        userTokenNetFarmsPending
      );
      const userTokenNetTvl =
        totalSupplyAssetUSD + totalCollateralAssetUSD - totalBorrowAssetUSD;
      const userApy = Object.entries(userTokenNetFarms).reduce(
        (acc, [rewardTokenId, farmData]) => {
          const rewardAsset = assets.data[rewardTokenId];
          const { dailyAmount } = computePoolsDailyAmount(
            "tokennetbalance",
            asset,
            assets.data[rewardTokenId],
            portfolio,
            xBRRR,
            farmData,
            appConfig.booster_decimals,
            appConfig.boost_suppress_factor
          );
          const userRewardAPY = new Decimal(dailyAmount)
            .mul(rewardAsset.price?.usd || "0")
            .mul(365)
            .div(userTokenNetTvl)
            .mul(100);
          acc = acc.plus(userRewardAPY);
          return acc;
        },
        new Decimal(0)
      );
      return {
        apy: userApy.toNumber(),
        tokenNetRewards: rewardMetas,
        canBeBooster,
      };
    }
  };
  const computeRewardAPY = ({ rewardTokenId, rewardData }) => {
    const { reward_per_day, boosted_shares } = rewardData;
    const rewardAsset = assets.data[rewardTokenId];
    const rewardDecimals =
      rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals;
    const type = isBorrow ? "borrowed" : "supplied";
    const farmData = portfolio.farms?.[type]?.[assetId]?.[rewardTokenId];

    const totalDailyRewards = new Decimal(reward_per_day)
      .div(new Decimal(10).pow(rewardDecimals))
      .toNumber();

    const totalDeposits = (
      isBorrow ? borrowedBalancePerShare : suppliedBalancePerShare
    )
      .mul(boosted_shares)
      .div(new Decimal(10).pow(assetDecimals))
      .mul(asset.price?.usd || "0");

    if (!farmData || onlyMarket) {
      return (
        new Decimal(reward_per_day)
          .div(new Decimal(10).pow(rewardDecimals))
          .mul(365)
          .mul(rewardAsset.price?.usd || "0")
          .div(totalDeposits)
          .mul(100)
          .toNumber() || 0
      );
    }
    const { multiplier, totalBoostedShares, shares } = computePoolsDailyAmount(
      type,
      asset,
      rewardAsset,
      portfolio,
      xBRRR,
      farmData,
      appConfig.booster_decimals,
      appConfig.boost_suppress_factor
    );

    const apy =
      ((totalDailyRewards *
        +(rewardAsset.price?.usd || "0") *
        365 *
        multiplier) /
        ((totalUserAssetUSD * totalBoostedShares) / shares)) *
      100;
    return apy || 0;
  };

  const computeStakingRewardAPY = (rewardTokenId: string) => {
    const rewardAsset = assets.data[rewardTokenId];
    const type = isBorrow ? "borrowed" : "supplied";
    const farmData = portfolio.farms?.[type]?.[assetId]?.[rewardTokenId];

    if (!farmData) return 0;

    const { newDailyAmount } = computePoolsDailyAmount(
      type,
      asset,
      rewardAsset,
      portfolio,
      xBRRR + extraXBRRRAmount,
      farmData,
      appConfig.booster_decimals,
      appConfig.boost_suppress_factor
    );

    const rewardAssetPrice = assets.data[rewardTokenId].price?.usd || 0;

    const apy =
      ((newDailyAmount * 365 * +(rewardAssetPrice || 0)) / totalUserAssetUSD) *
      100;

    return apy;
  };

  const netTvlMultiplier = asset.config.net_tvl_multiplier / 10000;

  return {
    computeRewardAPY,
    computeStakingRewardAPY,
    netLiquidityAPY,
    netTvlMultiplier,
    computeTokenNetRewardAPY,
  };
}

export function computeTokenNetRewardAPY({
  assets,
  assetId,
}: {
  assets: AssetsState;
  assetId: string;
}) {
  const asset = assets.data[assetId];
  const assetDecimals = asset.metadata.decimals + asset.config.extra_decimals;
  const tokenNetFarmsPending = asset.farms.tokennetbalance || {};
  // Filter out the ones rewards sent out
  const tokenNetFarms = filterSentOutFarms(tokenNetFarmsPending);
  // rewards token metas
  const rewardMetas = Object.keys(tokenNetFarms).map(
    (rewardTokenId) => assets.data[rewardTokenId].metadata
  );
  const canBeBooster = !_.isEmpty(
    Object.values(tokenNetFarms)[0]?.booster_log_bases
  );
  const marketApy = Object.entries(tokenNetFarms).reduce(
    (acc, [rewardTokenId, farmData]) => {
      const rewardAsset = assets.data[rewardTokenId];
      const rewardAPY = new Decimal(farmData.reward_per_day)
        .div(
          new Decimal(10).pow(
            rewardAsset.metadata.decimals + rewardAsset.config.extra_decimals
          )
        )
        .mul(365)
        .mul(rewardAsset.price?.usd || "0")
        .div(
          new Decimal(shrinkToken(farmData.boosted_shares, assetDecimals)).mul(
            asset.price?.usd || "0"
          )
        )
        .mul(100);
      acc = acc.plus(rewardAPY);
      return acc;
    },
    new Decimal(0)
  );

  return {
    tokenNetApy: marketApy.toNumber(),
    tokenNetRewards: rewardMetas,
    canBeBooster,
  };
}
