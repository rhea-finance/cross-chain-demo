import Decimal from "decimal.js";
import _ from "lodash";
import { USD_FORMAT, NEAR_STORAGE_RESERVED } from "@/services/constantConfig";
import type { UIAsset } from "@/interface/lending";
import { formatWithCommas_number, toDecimal } from "@/utils/uiNumber";
import { expandToken, shrinkToken } from "@/utils/numbers";
import { decimalMax } from "@/utils/lendingUtil";
import { DEFAULT_POSITION, lpTokenPrefix } from "@/services/constantConfig";
import { beautifyNumber } from "@/utils/beautifyNumber";

export interface Alert {
  [key: string]: {
    title: string;
    severity: "error" | "warning" | "info" | "success";
  };
}

interface Props {
  rates: Array<{ label: string; value: string; value$?: string }>;
  apy: number;
  available$: string;
  action: string;
  totalTitle: string;
  healthFactor: number;
  alerts: Alert;
  remainingCollateral?: string;
}

export const actionMapTitle = {
  Supply: "Supply",
  Borrow: "Borrow",
  Adjust: "Adjust Collateral",
  Withdraw: "Withdraw",
  Repay: "Repay",
};

export const getModalData = (
  asset
): UIAsset &
  Props & {
    disabled: boolean;
    walletBalance?: string;
    suppliedBalance?: string;
    selectedChainSymbolWalletBalance?: string;
  } => {
  const {
    symbol,
    action,
    supplyApy,
    borrowApy,
    collateralFactor,
    availableLiquidity,
    price,
    maxBorrowAmount,
    supplied,
    collateral,
    borrowed,
    available,
    availableNEAR,
    healthFactor,
    amount,
    maxWithdrawAmount,
    isRepayFromDeposits,
    canUseAsCollateral,
    tokenId,
    decimals,
    extraDecimals,
    portfolio,
    selectedChainSymbolWalletBalance,
    isMax,
  } = asset;
  const data: any = {
    apy: borrowApy,
    alerts: {},
  };
  let disabled = false;
  if (healthFactor >= 0 && healthFactor <= 105) {
    data.alerts.liquidation = {
      title:
        "Your health factor will be dangerously low and you're at risk of liquidation",
      severity: "error",
    };
  } else {
    delete data.alerts.liquidation;
  }

  const position =
    tokenId?.indexOf(lpTokenPrefix) > -1 ? tokenId : DEFAULT_POSITION;
  const collateralDecimal =
    portfolio.positions[position]?.collateral?.[tokenId]?.balance || 0;
  const suppliedDecimal = portfolio.supplied?.[tokenId]?.balance || 0;

  const availableAdjust = toDecimal(
    new Decimal(
      shrinkToken(collateralDecimal, decimals + extraDecimals) || 0
    ).plus(shrinkToken(suppliedDecimal, decimals + extraDecimals) || 0)
  );
  const isWrappedNear = symbol === "NEAR";
  switch (action) {
    case "Supply":
      data.apy = supplyApy;
      data.totalTitle = `Total Supplied`;
      data.rates = [
        ...(canUseAsCollateral
          ? [{ label: "Collateral Factor", value: collateralFactor }]
          : []),
      ];
      data.available = toDecimal(available);
      if (isWrappedNear) {
        data.available = toDecimal(
          Number(Math.max(0, available + availableNEAR - NEAR_STORAGE_RESERVED))
        );
      }
      data.alerts = {};
      break;
    case "Borrow": {
      data.totalTitle = `Total Borrowed`;
      data.available = toDecimal(
        Math.min(Math.max(0, maxBorrowAmount), availableLiquidity)
      );
      data.rates = [{ label: "Collateral Factor", value: collateralFactor }];
      if (
        new Decimal(amount || 0).gt(0) &&
        new Decimal(amount || 0).toFixed() ===
          new Decimal(maxBorrowAmount || 0).toFixed()
      ) {
        data.alerts.maxBorrow = {
          title:
            "Due to pricing fluctuations the max borrow amount is approximate",
          severity: "warning",
        };
      }
      break;
    }
    case "Withdraw":
      data.totalTitle = `Withdraw Supply Amount`;
      data.apy = supplyApy;
      data.available = toDecimal(
        Math.min(supplied + collateral, maxWithdrawAmount, availableLiquidity)
      );
      data.rates = [
        {
          label: "Remaining Collateral",
          value: formatWithCommas_number(
            Math.abs(Math.min(collateral, collateral + supplied - amount))
          ),
          value$:
            Math.abs(Math.min(collateral, collateral + supplied - amount)) *
            price,
        },
      ];
      break;
    case "Adjust":
      data.totalTitle = `Amount designated as collateral`;
      data.apy = supplyApy;
      data.available = availableAdjust;
      data.rates = [
        {
          label: "Use as Collateral",
          value: formatWithCommas_number(new Decimal(amount || 0).toFixed()),
          value$: new Decimal(price * +amount).toFixed(),
        },
      ];
      break;
    case "Repay": {
      const repayAmount = new Decimal(borrowed || 0).toFixed();
      const _maxWithdrawAmount = maxWithdrawAmount;
      const _walletBalance = selectedChainSymbolWalletBalance;
      data.totalTitle = `Repay Borrow Amount`;
      data.walletBalance = _walletBalance;
      data.suppliedBalance = _maxWithdrawAmount;
      data.available = toDecimal(
        isRepayFromDeposits
          ? Decimal.min(_maxWithdrawAmount, repayAmount)
          : Decimal.min(_walletBalance, repayAmount)
      );
      if (!isRepayFromDeposits && isMax) {
        data.alerts.maxRepay = {
          title:
            "Repay automatically adds a small buffer to cover price slippage and interest during transfer, excess repayment will be added to your Supply balance.",
          severity: "warning",
        };
      } else {
        data.alerts = {};
      }

      data.rates = [
        {
          label: "Remaining Borrow",
          value: beautifyNumber({
            num: decimalMax(
              0,
              new Decimal(borrowed || 0).minus(amount || 0).toFixed()
            ).toFixed(),
          }),
          value$: decimalMax(
            0,
            new Decimal(borrowed - amount).mul(price)
          ).toFixed(),
        },
      ];
      if (isRepayFromDeposits) {
        data.rates.push({
          label: "Remaining Supplied Amount",
          value: beautifyNumber({
            num: decimalMax(
              0,
              new Decimal(supplied || 0)
                .plus(collateral || 0)
                .minus(amount || 0)
                .toFixed()
            ).toFixed(),
          }),
        });
      }
      break;
    }
    default:
  }
  if (action === "Borrow" || action === "Supply" || action === "Withdraw") {
    if (
      new Decimal(amount || 0).gt(0) &&
      new Decimal(expandToken(amount, asset.decimals)).lt(1)
    ) {
      data.alerts.wallet = {
        title:
          "The current balance is too below, so that it cannot be processed by the contract.",
        severity: "warning",
      };
      disabled = true;
    }
  }
  // repay
  if (action == "Repay" && new Decimal(amount || 0).gt(0)) {
    if (
      // amount > balance
      (isRepayFromDeposits &&
        new Decimal(amount || 0).gt(data.suppliedBalance || 0)) ||
      (!isRepayFromDeposits &&
        new Decimal(amount || 0).gt(data.walletBalance || 0))
    ) {
      data.alerts.wallet = {
        title: "Insufficient Balance",
        severity: "warning",
      };
      disabled = true;
    } else if (
      // wallet is to low for contract limit
      !isRepayFromDeposits &&
      new Decimal(data.walletBalance || 0).gt(0) &&
      new Decimal(expandToken(data.walletBalance || 0, asset.decimals)).lt(1)
    ) {
      data.alerts.wallet = {
        title: "Insufficient Balance",
        severity: "warning",
      };
      disabled = true;
    } else if (isRepayFromDeposits) {
      // supplied is to low for contract limit
      const ASSET = asset.assetOrigin;
      const expandAmount = new Decimal(
        expandToken(data.suppliedBalance || 0, asset.decimals)
      );
      const share = new Decimal(ASSET?.borrowed?.shares || 0).div(
        +(ASSET?.borrowed?.balance || 0) || 1
      );
      if (expandAmount.mul(share).lt(1)) {
        data.alerts.wallet = {
          title: "Insufficient Balance",
          severity: "warning",
        };
        disabled = true;
      }
    }
  }
  return {
    ...asset,
    ...data,
    available$: (data.available * price).toLocaleString(
      undefined,
      USD_FORMAT as any
    ),
    disabled,
  };
};
