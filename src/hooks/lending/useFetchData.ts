import _ from "lodash";
import {
  fetchAccount,
  setAccountId,
  logoutAccount,
  fetchTokenBalances,
} from "@/redux/slice/accountSlice";

import {
  hideModal as _hideModal,
  fetchConfig,
  fetchBoosterTokens,
} from "@/redux/slice/appSlice";

import { fetchAssets } from "@/redux/slice/assetsSlice";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { batchViews } from "@rhea-finance/cross-chain-sdk";

export const useFetchData = () => {
  const dispatch = useAppDispatch();
  const fetchData = async ({
    accountId,
    tokenIds,
  }: {
    accountId?: string;
    tokenIds?: string[];
  }) => {
    dispatch(setAccountId(accountId || ""));
    const main_batch_views = await batchViews(accountId);
    if (accountId && !_.isEmpty(main_batch_views)) {
      dispatch(
        fetchTokenBalances({
          accountId,
          accountbalance: true,
          tokenIds,
        })
      );
      dispatch(
        fetchAccount({
          account_all_positions: main_batch_views.account_all_positions,
          account_id: accountId,
        })
      );
    } else {
      dispatch(logoutAccount());
    }
    if (!_.isEmpty(main_batch_views)) {
      // Do not overwrite the original data When rpc exception
      dispatch(
        fetchConfig({
          config: main_batch_views.config,
        })
      );
      dispatch(
        fetchAssets({
          assets_paged_detailed: main_batch_views.assets_paged_detailed,
          token_pyth_infos: main_batch_views.token_pyth_infos,
          config: main_batch_views.config,
        })
      );
      dispatch(fetchBoosterTokens());
    }
  };
  return {
    fetchData,
  };
};
