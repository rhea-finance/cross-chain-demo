import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getBoosterTokens,
  getConfig,
  IConfig,
} from "@rhea-finance/cross-chain-sdk";
import { DEFAULT_POSITION } from "@/services/constantConfig";
import { IIntentsResult } from "@/interface/lending/chains";

export type TokenAction =
  | "Supply"
  | "Borrow"
  | "Repay"
  | "Adjust"
  | "Withdraw"
  | "Deposit";

export type IOrder = "asc" | "desc";

export interface ITableSorting {
  property: string;
  order: IOrder;
}
export interface AppState {
  degenMode: {
    enabled: boolean;
    repayFromDeposits: boolean;
  };
  showModal: boolean;
  selected: {
    action?: TokenAction;
    tokenId: string;
    useAsCollateral: boolean;
    amount: string;
    isMax: boolean;
    position?: string;
  };
  staking: {
    amount: number;
    months: number;
  };
  tableSorting: {
    market: ITableSorting;
    portfolioDeposited: ITableSorting;
    portfolioBorrowed: ITableSorting;
  };
  config: IConfig;
  boosterTokens?: any;
  unreadLiquidation: {
    count: number;
    unreadIds: [];
  };
  currentChain: string | null;
  supplyChain: string | null;
  borrowChain: string | null;
  showWalletModal: boolean;
  showIntentsModal: boolean;
  intentResult: IIntentsResult;
  showDust: boolean;
}

export const initialState: AppState = {
  unreadLiquidation: {
    count: 0,
    unreadIds: [],
  },
  degenMode: {
    enabled: true,
    repayFromDeposits: false,
  },
  showModal: false,
  selected: {
    action: undefined,
    tokenId: "",
    useAsCollateral: false,
    amount: "0",
    isMax: false,
    position: DEFAULT_POSITION,
  },
  staking: {
    amount: 0,
    months: 1,
  },
  tableSorting: {
    market: {
      property: "totalSupplyMoney",
      order: "desc" as IOrder,
    },
    portfolioDeposited: {
      property: "deposited",
      order: "desc" as IOrder,
    },
    portfolioBorrowed: {
      property: "borrowed",
      order: "desc" as IOrder,
    },
  },
  config: {
    booster_decimals: 0,
    booster_token_id: "",
    force_closing_enabled: 0,
    max_num_assets: 0,
    maximum_recency_duration_sec: 0,
    maximum_staking_duration_sec: 0,
    maximum_staleness_duration_sec: 0,
    minimum_staking_duration_sec: 0,
    oracle_account_id: "",
    ref_exchange_id: "",
    owner_id: "",
    x_booster_multiplier_at_maximum_staking_duration: 0,
    boost_suppress_factor: 0,
    enable_price_oracle: false,
    enable_pyth_oracle: true,
    meme_oracle_account_id: "",
    meme_ref_exchange_id: "",
  },
  boosterTokens: {},
  currentChain: null,
  supplyChain: null,
  borrowChain: null,
  showWalletModal: false,
  showIntentsModal: false,
  intentResult: {},
  showDust: false,
};

export const fetchConfig = createAsyncThunk(
  "account/getConfig",
  async ({ config: configData }: { config?: IConfig } = {}) => {
    const config = configData || (await getConfig());
    return config;
  }
);

export const fetchBoosterTokens = createAsyncThunk(
  "account/getBoosterTokens",
  async () => {
    const boosterTokens = await getBoosterTokens();
    return boosterTokens;
  }
);

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    hideModal(state) {
      state.showModal = false;
    },
    showModal(
      state,
      action: PayloadAction<{
        action: TokenAction;
        amount: string;
        tokenId: string;
        position?: string;
      }>
    ) {
      state.selected = {
        ...state.selected,
        isMax: false,
        ...action.payload,
        position: DEFAULT_POSITION,
      };
      state.showModal = true;
    },
    updateAmount(
      state,
      action: PayloadAction<{ amount: string; isMax: boolean }>
    ) {
      state.selected.amount = action.payload.amount;
      state.selected.isMax = action.payload.isMax;
    },
    updatePosition(state, action: PayloadAction<{ position: string }>) {
      state.selected.position = DEFAULT_POSITION;
    },
    toggleUseAsCollateral(
      state,
      action: PayloadAction<{ useAsCollateral: boolean }>
    ) {
      state.selected.useAsCollateral = action.payload.useAsCollateral;
    },
    setTableSorting(state, action) {
      const { name, property, order } = action.payload;
      state.tableSorting[name] = { property, order };
    },
    setStaking(state, action) {
      state.staking = { ...state.staking, ...action.payload };
    },
    toggleDegenMode(state) {
      state.degenMode = {
        ...state.degenMode,
        enabled: !state.degenMode.enabled,
      };
    },
    setRepayFrom(state, action) {
      state.degenMode = {
        ...state.degenMode,
        repayFromDeposits: action.payload.repayFromDeposits,
      };
      state.selected = {
        ...state.selected,
        amount: "0",
      };
    },
    setUnreadLiquidation(state, action) {
      state.unreadLiquidation = action.payload;
    },
    setCurrentChain(state, action: PayloadAction<string | null>) {
      state.currentChain = action.payload;
    },
    setSupplyChain(state, action: PayloadAction<string | null>) {
      state.supplyChain = action.payload;
    },
    setBorrowChain(state, action: PayloadAction<string | null>) {
      state.borrowChain = action.payload;
    },
    showWalletModal(state) {
      state.showWalletModal = true;
    },
    hideWalletModal(state) {
      state.showWalletModal = false;
    },
    showIntentsModal(state, action: PayloadAction<IIntentsResult>) {
      state.intentResult = action.payload;
      state.showIntentsModal = true;
    },
    hideIntentsModal(state) {
      state.intentResult = {};
      state.showIntentsModal = false;
    },
    toggleShowDust(state) {
      state.showDust = !state.showDust;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConfig.fulfilled, (state, action) => {
      state.config = action.payload;
    });
    builder.addCase(fetchBoosterTokens.fulfilled, (state, action) => {
      state.boosterTokens = action.payload;
    });
  },
});

export const {
  hideModal,
  showModal,
  updateAmount,
  toggleUseAsCollateral,
  setTableSorting,
  setStaking,
  toggleDegenMode,
  setRepayFrom,
  setUnreadLiquidation,
  updatePosition,
  setCurrentChain,
  setSupplyChain,
  setBorrowChain,
  hideWalletModal,
  showWalletModal,
  showIntentsModal,
  hideIntentsModal,
  toggleShowDust,
} = appSlice.actions;

export default appSlice.reducer;
