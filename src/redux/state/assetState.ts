import { IAssetsView, IFarms } from "@rhea-finance/cross-chain-sdk";

export interface AssetsState {
  data: IAssetsView;
  netTvlFarm: Record<string, any>;
  allFarms: IFarms;
  status: "pending" | "fulfilled" | "rejected" | "fetching" | null;
  fetchedAt: string | undefined;
}

export const initialState: AssetsState = {
  data: {},
  netTvlFarm: {},
  allFarms: { tokenNetBalance: {}, supplied: {}, borrowed: {}, netTvl: {} },
  status: null,
  fetchedAt: undefined,
};
