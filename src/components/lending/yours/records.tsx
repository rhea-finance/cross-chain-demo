import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useChainAccountStore } from "@/stores/chainAccount";
import { getMultichainLendingHistory } from "@rhea-finance/cross-chain-sdk";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { Img } from "@/components/common/img";
import Pagination from "@/components/common/Pagination";
import { WalletChainIcon } from "./WalletChainIcon";
import {
  NearblocksIcon,
  PikespeakIcon,
  TxLeftArrow,
} from "@/components/lending/icon";

type FeeData = Record<string, string>;

interface PageDisplayData {
  action?: string;
  symbol?: string;
  amount?: string;
  fee?: FeeData;
  accountId?: string;
  exploreUrl?: string;
}

interface RecordData {
  id?: number;
  page_display_data?: string;
  wallet?: string;
  created_at?: string;
  request_hash?: string;
}

interface ParsedRecord {
  id: number | string;
  action: string;
  symbol: string;
  amount: string;
  fee: FeeData;
  accountId: string;
  totalFee: string;
  feeDetails: string[];
  time: string;
  wallet: string;
  requestHash: string;
  exploreUrl?: string;
}

const PAGE_SIZE = 10;

const parsePageDisplayData = (dataStr: string): PageDisplayData => {
  try {
    return JSON.parse(dataStr || "{}");
  } catch {
    return {};
  }
};

const formatLocalTime = (utcTimeString: string): string => {
  if (!utcTimeString) return "-";
  const date = new Date(utcTimeString + " UTC");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const calculateTotalFee = (fee: FeeData | undefined): string => {
  if (!fee) return "0";
  let total = 0;
  for (const key in fee) {
    const value = parseFloat(fee[key] || "0");
    if (!isNaN(value)) {
      total += value;
    }
  }
  return total.toFixed(8);
};

const formatFeeDetails = (fee: FeeData | undefined): string[] => {
  if (!fee) return [];
  const parts: string[] = [];
  for (const key in fee) {
    const value = fee[key];
    if (value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const fieldName = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        parts.push(`${fieldName}: $${numValue.toFixed(8)}`);
      }
    }
  }
  return parts;
};

const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const parseRecord = (record: RecordData, index: number): ParsedRecord => {
  const displayData = parsePageDisplayData(record.page_display_data || "{}");
  const fee = displayData.fee || {};
  const totalFee = calculateTotalFee(fee);
  const feeDetails = formatFeeDetails(fee);

  return {
    id: record.id || index,
    action: displayData.action || "-",
    symbol: displayData.symbol || "-",
    amount: displayData.amount || "0",
    fee,
    accountId: displayData.accountId || "",
    totalFee,
    feeDetails,
    time: formatLocalTime(record.created_at || ""),
    wallet: record.wallet || "",
    requestHash: record.request_hash || "",
    exploreUrl: displayData.exploreUrl,
  };
};

const Records = ({ hidden }: { hidden: boolean }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [docs, setDocs] = useState<RecordData[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    totalPages: number;
  }>({
    page: 1,
    totalPages: 1,
  });
  const chainAccountStore = useChainAccountStore();
  const mca_id = chainAccountStore.getMca();
  const [tooltipVisible, setTooltipVisible] = useState<
    Record<number | string, boolean>
  >({});
  const [arrowVisible, setArrowVisible] = useState<Record<string, boolean>>({});
  const timeoutRefs = useRef<Record<number | string, NodeJS.Timeout | null>>(
    {}
  );

  const parsedRecords = useMemo(
    () => docs.map((record, index) => parseRecord(record, index)),
    [docs]
  );

  const fetchData = useCallback(
    async (page: number) => {
      if (!mca_id) return;
      try {
        setLoading(true);
        const response: any = await getMultichainLendingHistory({
          mca_id,
          page_number: page,
          page_size: PAGE_SIZE,
        });

        const records = response?.record_list || [];
        setDocs(records);
        setPagination((prev) => ({
          ...prev,
          totalPages: response?.total_page || 1,
        }));
      } catch (e) {
        console.error("Failed to fetch records:", e);
      } finally {
        setLoading(false);
      }
    },
    [mca_id]
  );

  useEffect(() => {
    if (!mca_id) return;
    fetchData(pagination.page);
  }, [pagination.page, mca_id, fetchData]);

  const handlePageChange = (curPage: number) => {
    setPagination((prev) => ({ ...prev, page: curPage }));
  };

  const handleMouseEnter = (recordId: number | string) => {
    if (timeoutRefs.current[recordId]) {
      clearTimeout(timeoutRefs.current[recordId]!);
      timeoutRefs.current[recordId] = null;
    }
    setTooltipVisible((prev) => ({ ...prev, [recordId]: true }));
  };

  const handleMouseLeave = (recordId: number | string) => {
    timeoutRefs.current[recordId] = setTimeout(() => {
      setTooltipVisible((prev) => ({ ...prev, [recordId]: false }));
      setArrowVisible((prev) => {
        const newState = { ...prev };
        delete newState[`${recordId}-1`];
        delete newState[`${recordId}-2`];
        return newState;
      });
    }, 100);
  };

  const handleArrowMouseEnter = (
    recordId: number | string,
    itemIndex: number
  ) => {
    setArrowVisible((prev) => ({
      ...prev,
      [`${recordId}-${itemIndex}`]: true,
    }));
  };

  const handleArrowMouseLeave = (
    recordId: number | string,
    itemIndex: number
  ) => {
    setArrowVisible((prev) => ({
      ...prev,
      [`${recordId}-${itemIndex}`]: false,
    }));
  };

  const handleTxClick = (
    requestHash: string,
    explorer: "nearblocks" | "pikespeak"
  ) => {
    if (!requestHash) return;

    if (explorer === "nearblocks") {
      window.open(`https://nearblocks.io/txns/${requestHash}`, "_blank");
    } else if (explorer === "pikespeak") {
      window.open(
        `https://pikespeak.ai/transaction-viewer/${requestHash}`,
        "_blank"
      );
    }
  };

  const isEmpty = docs.length === 0 && !loading;

  return (
    <div className={`${hidden ? "hidden" : ""}`}>
      <div className="max-sm:hidden">
        <div className="grid grid-cols-8 text-sm text-gray-50 items-center justify-start h-[48px]">
          <span className="col-span-1">Action</span>
          <span className="col-span-2">Wallet</span>
          <span className="col-span-1">Token</span>
          <span className="col-span-1">Amount</span>
          <span className="col-span-1">Fee</span>
          <span className="col-span-2">Time</span>
        </div>
        <div className="h-[400px] overflow-y-auto">
          {docs.length === 0 && loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Icon
                icon="eos-icons:three-dots-loading"
                className="text-[60px] text-white"
              />
            </div>
          ) : null}
          {isEmpty ? (
            <div className="flex items-center justify-center h-[400px] text-gray-50 text-sm">
              No Data
            </div>
          ) : (
            parsedRecords.map((record) => (
              <div
                key={record.id}
                className="grid grid-cols-8 text-sm items-center justify-start h-[50px] text-black"
              >
                <div className="col-span-1">{record.action}</div>
                <div className="col-span-2 flex items-center space-x-1">
                  <WalletChainIcon wallet={record.wallet} />
                  <span className="text-xs truncate max-w-[80px]">
                    {formatAddress(record.accountId)}
                  </span>
                </div>
                <div className="col-span-1">{record.symbol}</div>
                <div className="col-span-1">
                  {beautifyNumber({ num: parseFloat(record.amount) })}
                </div>
                <div className="col-span-1 relative">
                  <span className="inline-block group cursor-pointer">
                    ${beautifyNumber({ num: parseFloat(record.totalFee) })}
                    {record.feeDetails.length > 0 && (
                      <div className="absolute left-0 top-6 z-50 w-fit min-w-[180px] bg-gray-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {record.feeDetails.map((detail, idx) => (
                          <div key={idx} className="whitespace-nowrap">
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  {record.time}
                  {(record.requestHash || record.exploreUrl) && (
                    <div
                      className="ml-2 cursor-pointer relative inline-block"
                      onMouseEnter={() =>
                        !record.exploreUrl && handleMouseEnter(record.id)
                      }
                      onMouseLeave={() =>
                        !record.exploreUrl && handleMouseLeave(record.id)
                      }
                    >
                      {record.exploreUrl ? (
                        <div
                          className="flex items-center w-5 h-5"
                          onClick={() =>
                            window.open(record.exploreUrl, "_blank")
                          }
                        >
                          <Icon
                            icon="iconamoon:arrow-top-right-1"
                            className="text-base"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center w-5 h-5">
                            <Icon
                              icon="iconamoon:arrow-top-right-1"
                              className="text-base"
                            />
                          </div>
                          {tooltipVisible[record.id] && (
                            <div className="absolute right-0 top-6 p-2 z-50 bg-white border border-gray-140 rounded-lg text-black w-[160px]">
                              <div
                                className="p-2 hover:bg-gray-100 hover:text-black rounded-md flex items-center mb-1.5 cursor-pointer"
                                onClick={() =>
                                  handleTxClick(
                                    record.requestHash,
                                    "nearblocks"
                                  )
                                }
                                onMouseEnter={() =>
                                  handleArrowMouseEnter(record.id, 1)
                                }
                                onMouseLeave={() =>
                                  handleArrowMouseLeave(record.id, 1)
                                }
                              >
                                <NearblocksIcon />
                                <div className="ml-2 text-sm">nearblocks</div>
                                {arrowVisible[`${record.id}-1`] && (
                                  <div className="ml-3">
                                    <TxLeftArrow />
                                  </div>
                                )}
                              </div>
                              <div
                                className="p-2 hover:bg-gray-100 hover:text-black rounded-md flex items-center cursor-pointer"
                                onClick={() =>
                                  handleTxClick(record.requestHash, "pikespeak")
                                }
                                onMouseEnter={() =>
                                  handleArrowMouseEnter(record.id, 2)
                                }
                                onMouseLeave={() =>
                                  handleArrowMouseLeave(record.id, 2)
                                }
                              >
                                <PikespeakIcon />
                                <div className="ml-2 text-sm">Pikespeak...</div>
                                {arrowVisible[`${record.id}-2`] && (
                                  <div className="ml-3">
                                    <TxLeftArrow />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="hidden max-sm:block space-y-4 py-2">
        {isEmpty ? (
          <div className="flex flex-col gap-4 items-center justify-center text-gray-60 min-h-[200px] px-4">
            <Img path="EmptyIcon.svg" />
            No data
          </div>
        ) : (
          parsedRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl p-4 border border-gray-30"
            >
              <div className="flex items-center justify-between mb-3 border-b border-gray-30 pb-3">
                <span className="text-sm font-medium text-black">
                  {record.action}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-50">{record.time}</span>
                  {(record.requestHash || record.exploreUrl) && (
                    <div
                      className="cursor-pointer relative inline-block"
                      onMouseEnter={() =>
                        !record.exploreUrl && handleMouseEnter(record.id)
                      }
                      onMouseLeave={() =>
                        !record.exploreUrl && handleMouseLeave(record.id)
                      }
                    >
                      {record.exploreUrl ? (
                        <div
                          className="flex items-center w-4 h-4"
                          onClick={() =>
                            window.open(record.exploreUrl, "_blank")
                          }
                        >
                          <Icon
                            icon="iconamoon:arrow-top-right-1"
                            className="text-sm text-gray-50"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center w-4 h-4">
                            <Icon
                              icon="iconamoon:arrow-top-right-1"
                              className="text-sm text-gray-50"
                            />
                          </div>
                          {tooltipVisible[record.id] && (
                            <div className="absolute right-0 top-6 p-2 z-10 bg-white border border-gray-140 rounded-lg text-black w-[160px] shadow-lg">
                              <div
                                className="p-2 hover:bg-gray-100 hover:text-black rounded-md flex items-center mb-1.5 cursor-pointer"
                                onClick={() =>
                                  handleTxClick(
                                    record.requestHash,
                                    "nearblocks"
                                  )
                                }
                                onMouseEnter={() =>
                                  handleArrowMouseEnter(record.id, 1)
                                }
                                onMouseLeave={() =>
                                  handleArrowMouseLeave(record.id, 1)
                                }
                              >
                                <NearblocksIcon />
                                <div className="ml-2 text-sm">nearblocks</div>
                                {arrowVisible[`${record.id}-1`] && (
                                  <div className="ml-3">
                                    <TxLeftArrow />
                                  </div>
                                )}
                              </div>
                              <div
                                className="p-2 hover:bg-gray-100 hover:text-black rounded-md flex items-center cursor-pointer"
                                onClick={() =>
                                  handleTxClick(record.requestHash, "pikespeak")
                                }
                                onMouseEnter={() =>
                                  handleArrowMouseEnter(record.id, 2)
                                }
                                onMouseLeave={() =>
                                  handleArrowMouseLeave(record.id, 2)
                                }
                              >
                                <PikespeakIcon />
                                <div className="ml-2 text-sm">Pikespeak...</div>
                                {arrowVisible[`${record.id}-2`] && (
                                  <div className="ml-3">
                                    <TxLeftArrow />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-50">Wallet</span>
                  <div className="flex items-center space-x-1">
                    <WalletChainIcon wallet={record.wallet} />
                    <span className="text-sm text-black">
                      {formatAddress(record.accountId)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-50">Token</span>
                  <span className="text-sm text-black">{record.symbol}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-50">Amount</span>
                  <span className="text-sm text-black">
                    {beautifyNumber({ num: parseFloat(record.amount) })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-50">Fee</span>
                  <div className="relative">
                    <span className="inline-block text-sm text-black cursor-pointer group">
                      ${beautifyNumber({ num: parseFloat(record.totalFee) })}
                      {record.feeDetails.length > 0 && (
                        <div className="absolute right-0 top-6 z-50 w-fit min-w-[180px] bg-gray-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          {record.feeDetails.map((detail, idx) => (
                            <div key={idx} className="whitespace-nowrap">
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {!isEmpty && (
        <div className="flex items-center justify-center md:border-t border-gray-140 pt-3 mt-2">
          <Pagination
            currentPage={pagination.page}
            onPageChange={handlePageChange}
            totalPages={pagination.totalPages}
          />
        </div>
      )}
    </div>
  );
};

export default Records;
