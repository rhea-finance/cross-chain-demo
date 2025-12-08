import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialState } from "../state/assetState";
import {
  IAssetDetailed,
  IPythInfo,
  IConfig,
  getAssets,
  getAllFarms,
  transformAssets,
  transformFarms,
} from "@rhea-finance/cross-chain-sdk";
export const fetchAssets = createAsyncThunk(
  "assets/fetchAssets",
  async ({
    assets_paged_detailed,
    token_pyth_infos,
    config,
  }: {
    assets_paged_detailed?: IAssetDetailed[];
    token_pyth_infos?: Record<string, IPythInfo>;
    config: IConfig;
  }) => {
    const assets = await getAssets({
      assets_paged_detailed,
      token_pyth_infos,
      config,
    }).then(transformAssets);
    const netTvlFarm = { rewards: {} };
    const allFarms = await getAllFarms().then(transformFarms);
    return { assets, allFarms, netTvlFarm };
  }
);

export const assetSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchAssets.pending, (state) => {
      state.status = "fetching";
    });
    builder.addCase(fetchAssets.fulfilled, (state, action) => {
      state.data = action.payload.assets;
      state.netTvlFarm = action.payload.netTvlFarm?.rewards || {};
      state.allFarms = action.payload.allFarms;
      state.status = action.meta.requestStatus;
      state.fetchedAt = new Date().toString();
    });
    builder.addCase(fetchAssets.rejected, (state, action) => {
      state.status = action.meta.requestStatus;
      console.error(action.payload);
      throw new Error("Failed to fetch assets and metadata");
    });
  },
});

export default assetSlice.reducer;
