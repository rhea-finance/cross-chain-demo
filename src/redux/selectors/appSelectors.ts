import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { transformAsset } from "@/utils/lendingUtil";

export const getConfig = createSelector(
  (state: RootState) => state.app,
  (app) => app.config
);

export const getBoosterTokens = createSelector(
  (state: RootState) => state.app,
  (app) => app.boosterTokens
);

export const getModalStatus = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app.showModal;
  }
);

export const getModalData = createSelector(
  (state: RootState) => state.app,
  (app) => app.selected
);

export const getAppState = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app;
  }
);

export const getTableSorting = createSelector(
  (state: RootState) => state.app,
  (app) => app.tableSorting
);

export const getDegenMode = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app.degenMode;
  }
);

export const getAssetData = createSelector(
  (state: RootState) => state.app,
  (state: RootState) => state.assets.data,
  (state: RootState) => state.account,
  (app, assets, account) => {
    const asset = assets[app.selected?.tokenId];
    const portfolio = account.portfolio;
    return {
      tokenId: asset?.token_id,
      action: app.selected.action,
      position: app.selected.position,
      portfolio,
      assetOrigin: asset,
      ...(asset ? transformAsset(asset, account, assets, app) : {}),
    };
  }
);

export const getAssetDataByTokenId = (tokenId: string) =>
  createSelector(
    (state: RootState) => state.app,
    (state: RootState) => state.assets.data,
    (state: RootState) => state.account,
    (app, assets, account) => {
      const asset = assets[tokenId];
      return {
        tokenId: asset?.token_id,
        ...(asset ? transformAsset(asset, account, assets, app) : {}),
      };
    }
  );

export const getSelectedValues = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app.selected;
  }
);

export const getUnreadLiquidation = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app.unreadLiquidation;
  }
);

export const getWalletModalStatus = createSelector(
  (state: RootState) => state.app,
  (app) => {
    return app.showWalletModal;
  }
);

export const getCurrentChain = createSelector(
  (state: RootState) => state.app,
  (app) => app.currentChain
);

export const getSupplyChain = createSelector(
  (state: RootState) => state.app,
  (app) => app.supplyChain
);

export const getBorrowChain = createSelector(
  (state: RootState) => state.app,
  (app) => app.borrowChain
);

export const getIntentsModalStatus = createSelector(
  (state: RootState) => state.app,
  (app) => app.showIntentsModal
);
export const getIntentsModalResult = createSelector(
  (state: RootState) => state.app,
  (app) => app.intentResult
);

export const getShowDust = createSelector(
  (state: RootState) => state.app,
  (app) => app.showDust
);
