import Decimal from "decimal.js";
import Big from "big.js";
import { pick, omit } from "ramda";
import { isEmpty } from "lodash";
import { shrinkToken } from "@/utils/numbers";
import type { AssetsState } from "@/redux/state/assetState";
import type { Asset } from "@rhea-finance/cross-chain-sdk";
import type {
  Assets,
  IAssetFarmReward,
  IAssetsView,
} from "@rhea-finance/cross-chain-sdk";
import type { AccountState } from "@/redux/state/accountState";
import type { AppState } from "@/redux/slice/appSlice";
import { UIAsset, IPortfolioReward } from "@/interface/lending";
import {
  AccountFarmRewardView,
  Farm,
  Portfolio,
} from "@rhea-finance/cross-chain-sdk";
import { nearMetadata, fraxMetadata, YUMetadata } from "@/utils/tokens";
import { formatSymbolName } from "@/utils/chainsUtil";

export const sumReducer = (sum: number, a: number) => sum + a;

export const hasAssets = (assets: AssetsState) =>
  Object.entries(assets.data).length > 0;

export const listToMap = (list) =>
  list
    .map((asset) => ({ [asset.token_id]: omit(["token_id"], asset) }))
    .reduce((a, b) => ({ ...a, ...b }), {});

export const toUsd = (balance: string, asset: Asset) =>
  asset?.price?.usd
    ? Number(
        shrinkToken(
          balance,
          (asset?.metadata?.decimals || 0) +
            (asset?.config?.extra_decimals || 0)
        )
      ) * +(asset.price.usd || 0)
    : 0;

export const emptySuppliedAsset = (asset: {
  price: string | number;
  supplied: string | number;
}): boolean => {
  if (new Decimal(asset.price).gt(0)) {
    return new Decimal(asset.supplied || 0).mul(asset.price || 0).gte(0.01);
  } else {
    return !(
      asset.supplied.toLocaleString(undefined) === (0).toLocaleString(undefined)
    );
  }
};

export const emptyBorrowedAsset = (asset: {
  price: string | number;
  borrowed: string | number;
}): boolean => {
  if (new Decimal(asset.price).gt(0)) {
    return new Decimal(asset.borrowed || 0).mul(asset.price || 0).gte(0.01);
  } else {
    return !(
      asset.borrowed.toLocaleString(undefined) === (0).toLocaleString(undefined)
    );
  }
};

export const hasZeroSharesFarmRewards = (farms): boolean => {
  return farms.some((farm) =>
    farm.rewards.some((reward) => reward.boosted_shares === "0")
  );
};

export const transformAsset = (
  asset: Asset,
  account: AccountState,
  assets: IAssetsView,
  app: AppState
): UIAsset => {
  const tokenId = asset.token_id;
  const brrrTokenId = app.config.booster_token_id;
  const totalSupplyD = new Decimal(asset.supplied.balance)
    .plus(new Decimal(asset.reserved))
    .plus(asset.prot_fee)
    .toFixed();
  const totalBorrowedD = new Decimal(asset.borrowed.balance)
    .plus(new Decimal(asset?.margin_debt?.balance || 0))
    .plus(new Decimal(asset?.margin_pending_debt || 0))
    .toFixed();
  const totalSupply = Number(
    shrinkToken(
      totalSupplyD,
      asset.metadata.decimals + asset.config.extra_decimals
    )
  );
  const totalBorrowed = Number(
    shrinkToken(
      totalBorrowedD,
      asset.metadata.decimals + asset.config.extra_decimals
    )
  );

  const temp1 = new Decimal(asset.supplied.balance)
    .plus(new Decimal(asset.reserved))
    .plus(asset.prot_fee)
    .minus(new Decimal(asset.borrowed.balance))
    .minus(new Decimal(asset?.margin_debt?.balance || 0))
    .minus(new Decimal(asset?.margin_pending_debt || 0));
  const temp2 = temp1.minus(temp1.mul(0.001)).toFixed(0);
  const availableLiquidity = Number(
    shrinkToken(temp2, asset.metadata.decimals + asset.config.extra_decimals)
  );
  const availableLiquidity$ = toUsd(temp2, asset).toLocaleString(undefined);
  const availableLiquidityMoney = toUsd(temp2, asset);

  let accountAttrs = {
    supplied: 0,
    collateral: 0,
    borrowed: 0,
    deposited: 0,
    availableNEAR: 0,
    available: 0,
    extraDecimals: 0,
  };

  if (account.accountId) {
    const decimals = asset.metadata.decimals + asset.config.extra_decimals;
    const supplied = Number(
      shrinkToken(account.portfolio.supplied[tokenId]?.balance || 0, decimals)
    );
    const collateral = Number(
      shrinkToken(
        asset.isLpToken
          ? account.portfolio.positions?.[tokenId]?.collateral?.[tokenId]
              ?.balance || 0
          : account.portfolio.collateral?.[tokenId]?.balance || 0,
        decimals
      )
    );
    const borrowed = asset.isLpToken
      ? account.portfolio.positions?.[tokenId]?.borrowed?.[tokenId]?.balance ||
        0
      : account.portfolio.borrowed?.[tokenId]?.balance || 0;
    const available = account.balances[tokenId] || 0;
    const availableNEAR = account.balances.near || 0;

    accountAttrs = {
      supplied,
      collateral,
      deposited: supplied + collateral,
      borrowed: Number(shrinkToken(borrowed, decimals)),
      available: Number(shrinkToken(available, asset.metadata.decimals)),
      availableNEAR: Number(
        shrinkToken(availableNEAR, asset.metadata.decimals)
      ),
      extraDecimals: asset.config.extra_decimals,
    };
  }
  const metadataFields = pick(
    ["icon", "symbol", "name", "decimals", "tokens"],
    asset.metadata
  );
  // Format symbol for display
  if (metadataFields.symbol) {
    metadataFields.symbol =
      formatSymbolName(metadataFields.symbol) || metadataFields.symbol;
  }
  // Format symbols in tokens array if present
  if (metadataFields.tokens && Array.isArray(metadataFields.tokens)) {
    metadataFields.tokens = metadataFields.tokens.map((token) => ({
      ...token,
      metadata: token.metadata
        ? {
            ...token.metadata,
            symbol: token.metadata.symbol
              ? formatSymbolName(token.metadata.symbol) || token.metadata.symbol
              : token.metadata.symbol,
          }
        : token.metadata,
    }));
  }
  return {
    tokenId,
    ...metadataFields,
    price: asset.price ? asset.price.usd : 0,
    supplyApy: Number(asset.supply_apr) * 100,
    totalSupply,
    totalSupply$: toUsd(totalSupplyD, asset).toLocaleString(undefined),
    totalSupplyMoney: toUsd(totalSupplyD, asset),
    totalBorrowed,
    totalBorrowed$: toUsd(totalBorrowedD, asset).toLocaleString(undefined),
    totalBorrowedMoney: toUsd(totalBorrowedD, asset),
    borrowApy: Number(asset.borrow_apr) * 100,
    availableLiquidity,
    availableLiquidity$,
    availableLiquidityMoney,
    collateralFactor: `${Number(asset.config.volatility_ratio / 100)}%`,
    canUseAsCollateral: asset.config.can_use_as_collateral,
    ...accountAttrs,
    brrrBorrow: brrrTokenId
      ? Number(
          shrinkToken(
            asset.farms.borrowed[brrrTokenId]?.reward_per_day || "0",
            assets[brrrTokenId]?.metadata?.decimals || 0
          )
        )
      : 0,
    brrrSupply: brrrTokenId
      ? Number(
          shrinkToken(
            asset.farms.supplied[brrrTokenId]?.reward_per_day || "0",
            assets[brrrTokenId]?.metadata?.decimals || 0
          )
        )
      : 0,
    depositRewards: getRewards("supplied", asset, assets),
    borrowRewards: getRewards("borrowed", asset, assets),
    can_borrow: asset.config.can_borrow,
    can_deposit: asset.config.can_deposit,
    isLpToken: asset.isLpToken,
  };
};

export const getRewards = (
  action: "supplied" | "borrowed" | "tokennetbalance",
  asset: Asset,
  assets: IAssetsView
) => {
  return Object.entries(asset.farms[action] || {}).map(
    ([tokenId, rewards]) => ({
      rewards,
      metadata: assets[tokenId].metadata,
      config: assets[tokenId].config,
      price: assets[tokenId].price?.usd ?? 0,
    })
  );
};
export function accountTrim(accountId: string) {
  return accountId && accountId.length > 14 + 14 + 1
    ? `${accountId.slice(0, 6)}...${accountId.slice(-6)}`
    : accountId;
}

export const getLocalAppVersion = () => {
  return process.env.CONFIG_BUILD_ID;
};

export const getRemoteAppVersion = async () => {
  const res = await fetch(window.location.origin);
  const html = await res.text();
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(html, "text/html");
  const data = JSON.parse(
    htmlDoc.querySelector("#__NEXT_DATA__")?.textContent as string
  );
  return data.buildId;
};

export function decimalMax(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  a = new Decimal(a);
  b = new Decimal(b);
  return a.gt(b) ? a : b;
}

export function decimalMin(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  a = new Decimal(a);
  b = new Decimal(b);
  return a.lt(b) ? a : b;
}

export function filterSentOutFarms(FarmsPending: IAssetFarmRewards) {
  // Filter out the ones rewards sent out
  const tokenNetFarms = Object.entries(FarmsPending).reduce((acc, cur) => {
    const [rewardTokenId, farmData] = cur;
    if (farmData.remaining_rewards !== "0") {
      return {
        ...acc,
        [rewardTokenId]: farmData,
      };
    }
    return acc;
  }, {}) as IAssetFarmRewards;
  return tokenNetFarms;
}
export function filterAccountSentOutFarms(FarmsPending: IAccountFarmRewards) {
  // Filter out the ones rewards sent out
  const accountTokenNetFarms = Object.entries(FarmsPending).reduce(
    (acc, cur) => {
      const [rewardTokenId, farmData] = cur;
      if (farmData.asset_farm_reward.remaining_rewards !== "0") {
        return {
          ...acc,
          [rewardTokenId]: farmData,
        };
      }
      return acc;
    },
    {}
  ) as IAccountFarmRewards;
  return accountTokenNetFarms;
}
export function filterAccountSentOutRewards(RewardsPending: any) {
  // Filter out the ones rewards sent out
  const accountTokenNetFarms = Object.entries(RewardsPending).reduce(
    (acc, cur) => {
      const [rewardTokenId, rewardData] = cur as any;
      if (rewardData.remaining_rewards !== "0") {
        return {
          ...acc,
          [rewardTokenId]: rewardData,
        };
      }
      return acc;
    },
    {}
  ) as IPortfolioReward;
  return accountTokenNetFarms;
}
export function filterAccountAllSentOutFarms(portfolio: Portfolio) {
  // Filter out the ones rewards sent out
  const { supplied, borrowed, netTvl, tokennetbalance } = portfolio.farms;
  const newSupplied = filterTypeFarms(supplied);
  const newBorrowed = filterTypeFarms(borrowed);
  const newTokennetbalance = filterTypeFarms(tokennetbalance);
  const newNetTvl = filterAccountSentOutFarms(netTvl);
  return {
    supplied: newSupplied,
    borrowed: newBorrowed,
    tokennetbalance: newTokennetbalance,
    netTvl: newNetTvl,
  };
}
function filterTypeFarms(typeFarmData): IFarms {
  const newTypeFarmData = Object.entries(typeFarmData).reduce(
    (acc, [tokenId, farm]: any) => {
      const newFarm = JSON.parse(
        JSON.stringify(filterAccountSentOutFarms(farm))
      );
      if (isEmpty(newFarm)) return acc;
      return {
        ...acc,
        [tokenId]: newFarm,
      };
    },
    {}
  );
  return newTypeFarmData;
}
export const cloneObj = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};
export const getDateString = (date) => {
  const today = new Date(date);
  const secNum = today.getSeconds();
  const minNum = today.getMinutes();
  const hourNum = today.getHours();
  const ddNum = today.getDate();
  const mmNum = today.getMonth() + 1; // January is 0!
  const yyyy = today.getFullYear();

  let dd = String(ddNum);
  let mm = String(mmNum);
  let hh = String(hourNum);
  let min = String(minNum);
  let sec = String(secNum);
  if (ddNum < 10) {
    dd = `0${dd}`;
  }

  if (mmNum < 10) {
    mm = `0${mm}`;
  }

  if (hourNum < 10) {
    hh = `0${hh}`;
  }

  if (minNum < 10) {
    min = `0${min}`;
  }

  if (secNum < 10) {
    sec = `0${sec}`;
  }

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
};

export function getPositionType(token_c_id: string, token_d_id: string) {
  if (token_c_id == token_d_id) {
    return {
      label: "Long",
      class: "text-primary",
    };
  } else {
    return {
      label: "Short",
      class: "text-yellow-40",
    };
  }
}

export function standardizeAsset(asset) {
  const serializationAsset = JSON.parse(JSON.stringify(asset || {}));
  if (serializationAsset.symbol === "wNEAR") {
    serializationAsset.symbol = nearMetadata.symbol;
    serializationAsset.icon = nearMetadata.icon;
  }
  if (serializationAsset.metadata?.symbol === "wNEAR") {
    serializationAsset.metadata.symbol = nearMetadata.symbol;
    serializationAsset.metadata.icon = nearMetadata.icon;
  }
  if (serializationAsset.symbol === "FRAX") {
    serializationAsset.icon = fraxMetadata.icon;
  }
  if (serializationAsset.metadata?.symbol === "FRAX") {
    serializationAsset.metadata.icon = fraxMetadata.icon;
  }
  if (serializationAsset.symbol === "YU") {
    serializationAsset.icon = YUMetadata.icon;
  }
  if (serializationAsset.metadata?.symbol === "YU") {
    serializationAsset.metadata.icon = YUMetadata.icon;
  }
  return serializationAsset;
}

export function formatDate(date: Date) {
  const options: any = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString("en-US", options).replace(",", "");
}

export function formatPercent(
  val: string | number | undefined,
  options?: {
    maxDigits?: number;
    showPlus?: boolean;
    decimals?: number;
    rm?: Big.RoundingMode;
    displayMinimum?: boolean;
  }
) {
  const _val = isNaN(Number(val)) ? 0 : Number(val);
  const symbol = options?.showPlus && _val > 0 ? "+" : "";
  const value = new Big(_val)
    .times(10 ** (options?.decimals || 0))
    .round(options?.maxDigits ?? 2, options?.rm);
  if (options?.displayMinimum && value.abs().gt(0) && value.abs().lt(1)) {
    return `< ${value.lt(0) ? "-" : ""}1%`;
  }
  return symbol + value.toString() + "%";
}

interface IFarms {
  [tokenId: string]: Farm;
}
interface IAssetFarmRewards {
  [token: string]: IAssetFarmReward;
}
interface IAccountFarmRewards {
  [token: string]: AccountFarmRewardView;
}
