import Decimal from "decimal.js";
import { useAppSelector } from "./useRedux";
import { getAssetDataByTokenId } from "@/redux/selectors/appSelectors";
import { getAccountPortfolio } from "@/redux/selectors/accountSelectors";
import { NEAR_STORAGE_RESERVED } from "@/services/constantConfig";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { getBorrowMaxAmount } from "@rhea-finance/cross-chain-sdk";

export function useUserBalance(tokenId: string, isWrappedNear: boolean) {
  const asset = useAppSelector(getAssetDataByTokenId(tokenId));
  const portfolio = useAppSelector(getAccountPortfolio);
  const assets = useAppSelector(getAssets);
  const maxBorrowAmountPositions = getBorrowMaxAmount({
    tokenId,
    portfolio,
    assets: assets.data,
  });

  const { available, availableNEAR } = asset;
  // get supply balance
  let supplyBalance = "0";
  if (isWrappedNear) {
    supplyBalance = Decimal.max(
      new Decimal(available || 0)
        .plus(availableNEAR || 0)
        .minus(NEAR_STORAGE_RESERVED),
      0
    ).toFixed();
  } else {
    supplyBalance = new Decimal(available || 0).toFixed();
  }
  return {
    supplyBalance,
    maxBorrowAmountPositions,
  };
}
