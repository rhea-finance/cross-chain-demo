import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  getAvailableAssets,
  isAssetsLoading,
} from "@/redux/selectors/assetsSelectors";
import {
  getAccountId,
  getHasNonFarmedAssets,
  isAccountLoading,
} from "@/redux/selectors/accountSelectors";
import { getPortfolioAssets } from "@/redux/selectors/getPortfolioAssets";
import {
  getConfig,
  getDegenMode,
  getUnreadLiquidation,
  getCurrentChain,
  getSupplyChain,
  getBorrowChain,
} from "@/redux/selectors/appSelectors";
import {
  setRepayFrom,
  toggleDegenMode,
  setUnreadLiquidation,
  setCurrentChain,
  setSupplyChain,
  setBorrowChain,
} from "@/redux/slice/appSlice";
import {
  getWeightedAssets,
  getWeightedNetLiquidity,
} from "@/redux/selectors/getAccountRewards";
import { get_liquidations } from "@rhea-finance/cross-chain-sdk";

export function useLoading() {
  const isLoadingAssets = useAppSelector(isAssetsLoading);
  const isLoadingAccount = useAppSelector(isAccountLoading);
  return isLoadingAssets || isLoadingAccount;
}

export function useConfig() {
  return useAppSelector(getConfig);
}

export function useAccountId() {
  return useAppSelector(getAccountId);
}

export function useNonFarmedAssets() {
  const weightedNetLiquidity = useAppSelector(getWeightedNetLiquidity);
  const hasNonFarmedAssets = useAppSelector(getHasNonFarmedAssets);
  const assets = useAppSelector(getWeightedAssets);
  const hasNegativeNetLiquidity = weightedNetLiquidity < 0;

  return {
    hasNonFarmedAssets,
    weightedNetLiquidity,
    hasNegativeNetLiquidity,
    assets,
  };
}

export function useAvailableAssets(params?: {
  source?: "supply" | "borrow" | "";
  chain?: string | null;
}) {
  const { source, chain } = params || {};
  const rows = useAppSelector(getAvailableAssets({ source, chain }));
  return rows;
}

export function usePortfolioAssets() {
  return useAppSelector(getPortfolioAssets);
}

export function useDegenMode() {
  const degenMode = useAppSelector(getDegenMode);
  const dispatch = useAppDispatch();

  const setDegenMode = () => {
    dispatch(toggleDegenMode());
  };

  const setRepayFromDeposits = (repayFromDeposits: boolean) => {
    dispatch(setRepayFrom({ repayFromDeposits }));
  };

  const isRepayFromDeposits = degenMode.enabled && degenMode.repayFromDeposits;

  return { degenMode, setDegenMode, isRepayFromDeposits, setRepayFromDeposits };
}

export function useUnreadLiquidation({
  liquidationPage = 1,
}: {
  liquidationPage?: number;
}) {
  const unreadLiquidation = useAppSelector(getUnreadLiquidation);
  const accountId = useAccountId();
  const dispatch = useAppDispatch();

  const fetchUnreadLiquidation = async () => {
    try {
      const { liquidationData } = await get_liquidations(
        accountId,
        liquidationPage || 1,
        10
      );
      if (liquidationData?.unread !== undefined) {
        dispatch(
          setUnreadLiquidation({
            count: liquidationData.unread,
            unreadIds: unreadLiquidation?.unreadIds || [],
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return { unreadLiquidation, fetchUnreadLiquidation };
}

export function useCurrentChain() {
  const currentChain = useAppSelector(getCurrentChain);
  const dispatch = useAppDispatch();

  const setChain = (chain: string | null) => {
    dispatch(setCurrentChain(chain));
  };

  return { currentChain, setChain };
}

export function useSupplyChain() {
  const supplyChain = useAppSelector(getSupplyChain);
  const dispatch = useAppDispatch();

  const setChain = (chain: string | null) => {
    dispatch(setSupplyChain(chain));
  };

  // Default to first chain if no chain is selected
  const defaultChain = supplyChain || "solana";

  return { supplyChain: defaultChain, setChain };
}

export function useBorrowChain() {
  const borrowChain = useAppSelector(getBorrowChain);
  const dispatch = useAppDispatch();

  const setChain = (chain: string | null) => {
    dispatch(setBorrowChain(chain));
  };

  // Default to first chain if no chain is selected
  const defaultChain = borrowChain || "solana";

  return { borrowChain: defaultChain, setChain };
}
