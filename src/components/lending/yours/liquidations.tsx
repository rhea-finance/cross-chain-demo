import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { shrinkToken } from "@/utils/numbers";
import { useAppDispatch, useAppSelector } from "@/hooks/lending/useRedux";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { getAccountId } from "@/redux/selectors/accountSelectors";
import { get_liquidations } from "@rhea-finance/cross-chain-sdk";
import { setUnreadLiquidation } from "@/redux/slice/appSlice";
import { getDateString } from "@/utils/lendingUtil";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { Img } from "@/components/common/img";
import Pagination from "@/components/common/Pagination";

const Liquidations = ({ hidden }: { hidden: boolean }) => {
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<{
    page?: number;
    totalPages?: number;
  }>({
    page: 1,
    totalPages: 1,
  });
  const dispatch = useAppDispatch();
  const assets = useAppSelector(getAssets);
  const accountId = useAppSelector(getAccountId);
  useEffect(() => {
    if (pagination?.page) {
      fetchData({
        page: pagination.page,
      });
    }
  }, [pagination?.page]);

  useEffect(() => {
    if (accountId && !pagination?.page) {
      fetchData({ page: 1 });
    }
  }, [accountId]);

  const fetchData = async ({ page }: { page: number }) => {
    try {
      setIsLoading(true);
      const { liquidationData, unreadIds } = await get_liquidations(
        accountId,
        page,
        10,
        assets
      );
      let newUnreadCount = 0;
      liquidationData?.record_list?.forEach((d) => {
        if (d.isRead === false) newUnreadCount++;
      });
      dispatch(
        setUnreadLiquidation({
          count: liquidationData?.unread,
          unreadIds,
        })
      );
      setDocs(liquidationData?.record_list);
      setPagination((d) => {
        return {
          ...d,
          totalPages: liquidationData?.total_page || 1,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  const isEmpty = docs?.length == 0 && !isLoading;
  return (
    <div className={`${hidden ? "hidden" : ""}`}>
      {/* PC */}
      <div className="max-sm:hidden">
        {/* HEAD */}
        <div className="grid grid-cols-4 text-sm text-gray-50 items-center justify-start h-[48px]">
          <span className="col-span-1">Time</span>
          <span className="col-span-1">Collateral Type</span>
          <span className="col-span-1">Repaid Assets Amount</span>
          <span className="col-span-1">Liquidated Assets</span>
        </div>
        {/* BODY */}
        <div className="h-[400px] overflow-y-auto">
          {docs?.length == 0 && isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Icon
                icon="eos-icons:three-dots-loading"
                className="text-[60px] text-black"
              />
            </div>
          ) : null}
          {isEmpty ? (
            <div className="flex items-center justify-center h-[400px] text-gray-50 text-sm">
              No Data
            </div>
          ) : null}
          {docs?.map((liquidation: any) => {
            const { createdAt, receipt_id, LiquidatedAssets, RepaidAssets } =
              liquidation || {};
            return (
              <div
                key={receipt_id}
                className="grid grid-cols-4 text-sm items-center justify-start h-[50px] text-black"
              >
                <div className="flex items-center space-x-2 col-span-1">
                  {getDateString(createdAt * 1000)}
                </div>
                <div className="col-span-1">
                  {LiquidatedAssets?.[0]?.data?.isLpToken
                    ? "LP token"
                    : "Standard Token"}
                </div>
                <div className="col-span-1">
                  {!RepaidAssets?.length
                    ? "-"
                    : RepaidAssets?.map((d) => {
                        const { metadata, config } = d.data || {};
                        const { extra_decimals } = config || {};
                        const tokenSymbol = metadata?.symbol || d.token_id;

                        const tokenAmount = Number(
                          shrinkToken(
                            d.amount,
                            (metadata?.decimals || 0) + (extra_decimals || 0)
                          )
                        );

                        return (
                          <div
                            key={d.token_id}
                            className="whitespace-normal"
                            title={`${tokenAmount.toLocaleString(
                              undefined
                            )} ${tokenSymbol}`}
                          >
                            {beautifyNumber({
                              num: tokenAmount || 0,
                            })}{" "}
                            {tokenSymbol}
                          </div>
                        );
                      })}
                </div>
                <div className="col-span-1">
                  {!LiquidatedAssets?.length
                    ? "-"
                    : LiquidatedAssets?.map((d) => {
                        const { metadata, config } = d.data || {};
                        const { extra_decimals } = config || {};
                        let tokenSymbol = "";
                        if (metadata?.tokens?.length) {
                          metadata?.tokens?.forEach((t, i) => {
                            const { symbol, token_id } = t.metadata || {};
                            tokenSymbol += `${i !== 0 ? "-" : ""}${
                              symbol || token_id
                            }`;
                          });
                        }
                        if (!tokenSymbol) {
                          tokenSymbol = metadata?.symbol || d.token_id;
                        }

                        const tokenAmount = Number(
                          shrinkToken(
                            d.amount,
                            (metadata?.decimals || 0) + (extra_decimals || 0)
                          )
                        );

                        return (
                          <div
                            key={d.token_id}
                            className="whitespace-normal"
                            title={`${tokenAmount.toLocaleString(
                              undefined
                            )} ${tokenSymbol}`}
                          >
                            {beautifyNumber({
                              num: tokenAmount,
                            })}{" "}
                            {tokenSymbol}
                          </div>
                        );
                      })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Mobile */}
      <div className="lg:hidden w-full overflow-x-auto">
        {docs?.length ? (
          <table>
            {/* Head */}
            <thead>
              <tr className="h-[48px] text-sm text-gray-50 whitespace-nowrap">
                <th className="text-left">
                  <span className="pl-4">Time</span>
                </th>
                <th className="text-left">
                  <span className="pl-4">Collateral Type</span>
                </th>
                <th className="text-left">
                  <span className="pl-4">Repaid Assets Amount</span>
                </th>
                <th className="text-left">
                  <span className="pl-4">Liquidated Assets</span>
                </th>
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {docs?.map((liquidation) => {
                const {
                  createdAt,
                  receipt_id,
                  LiquidatedAssets,
                  RepaidAssets,
                } = liquidation || {};
                return (
                  <tr
                    key={receipt_id}
                    className={`h-[70px] border-t border-divide`}
                  >
                    <td>
                      <div className="flex items-center space-x-2 pl-4 whitespace-nowrap">
                        {getDateString(createdAt * 1000)}
                      </div>
                    </td>
                    <td>
                      <div className="pl-4">
                        {LiquidatedAssets?.[0]?.data?.isLpToken
                          ? "LP token"
                          : "Standard Token"}
                      </div>
                    </td>
                    <td>
                      <div className="pl-4">
                        {!RepaidAssets?.length
                          ? "-"
                          : RepaidAssets?.map((d) => {
                              const { metadata, config } = d.data || {};
                              const { extra_decimals } = config || {};
                              const tokenSymbol =
                                metadata?.symbol || d.token_id;

                              const tokenAmount = Number(
                                shrinkToken(
                                  d.amount,
                                  (metadata?.decimals || 0) +
                                    (extra_decimals || 0)
                                )
                              );

                              return (
                                <div
                                  key={d.token_id}
                                  className="whitespace-normal"
                                  title={`${tokenAmount.toLocaleString(
                                    undefined
                                  )} ${tokenSymbol}`}
                                >
                                  {beautifyNumber({
                                    num: tokenAmount || 0,
                                  })}{" "}
                                  {tokenSymbol}
                                </div>
                              );
                            })}
                      </div>
                    </td>
                    <td>
                      <div className="px-4">
                        {!LiquidatedAssets?.length
                          ? "-"
                          : LiquidatedAssets?.map((d) => {
                              const { metadata, config } = d.data || {};
                              const { extra_decimals } = config || {};
                              let tokenSymbol = "";
                              if (metadata?.tokens?.length) {
                                metadata?.tokens?.forEach((t, i) => {
                                  const { symbol, token_id } = t.metadata || {};
                                  tokenSymbol += `${i !== 0 ? "-" : ""}${
                                    symbol || token_id
                                  }`;
                                });
                              }
                              if (!tokenSymbol) {
                                tokenSymbol = metadata?.symbol || d.token_id;
                              }

                              const tokenAmount = Number(
                                shrinkToken(
                                  d.amount,
                                  (metadata?.decimals || 0) +
                                    (extra_decimals || 0)
                                )
                              );

                              return (
                                <div
                                  key={d.token_id}
                                  className="whitespace-normal"
                                  title={`${tokenAmount.toLocaleString(
                                    undefined
                                  )} ${tokenSymbol}`}
                                >
                                  {beautifyNumber({
                                    num: tokenAmount,
                                  })}{" "}
                                  {tokenSymbol}
                                </div>
                              );
                            })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center text-gray-60 min-h-[200px] whitespace-nowrap">
            <Img path="EmptyIcon.svg" />
            No data
          </div>
        )}
      </div>
      {/* PAGINATION */}
      {isEmpty ? null : (
        <div className="flex items-center justify-center border-t border-gray-140 pt-3 mt-2">
          <Pagination
            currentPage={pagination.page}
            onPageChange={(curPage) => {
              setPagination({
                ...pagination,
                page: curPage,
              });
            }}
            totalPages={pagination.totalPages}
          />
        </div>
      )}
    </div>
  );
};
export default Liquidations;
