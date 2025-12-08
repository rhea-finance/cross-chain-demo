import { createSelector } from "@reduxjs/toolkit";
import { FRACTION_DIGITS } from "@/services/constantConfig";
import { shrinkToken } from "@/utils/numbers";
import type { RootState } from "../store";

export const getAccountId = createSelector(
  (state: RootState) => state.account,
  (account) => account.accountId
);
export const getAccountCategory = createSelector(
  (state: RootState) => state.account,
  (account) => {
    return account;
  }
);

export const getAccountPortfolio = createSelector(
  (state: RootState) => state.account,
  (account) => {
    return account.portfolio;
  }
);

export const getAccountBalance = createSelector(
  (state: RootState) => state.account.balances,
  (balances) => {
    return balances?.near
      ? shrinkToken(balances?.near, 24, FRACTION_DIGITS)
      : "0";
  }
);
export const getTotalAccountBalance = createSelector(
  (state: RootState) => state.account.balances,
  (balances) => {
    return shrinkToken(balances?.totalNear || 0, 24);
  }
);

export const isAccountLoading = createSelector(
  (state: RootState) => state.account,
  (account) => account.status === "pending"
);

export const isClaiming = createSelector(
  (state: RootState) => state.account,
  (account) => {
    const status = account.isClaiming == "pending";
    return status;
  }
);

export const getHasNonFarmedAssets = createSelector(
  (state: RootState) => state.account,
  (account) => {
    return account.portfolio.hasNonFarmedAssets;
  }
);
