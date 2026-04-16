import Big from "big.js";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import useWalletConnect from "@/hooks/useWalletConnect";
import { Img } from "@/components/common/img";
import { DefaultToolTip } from "@/components/common/toolTip";
import { formatErrorMessage, getAccountIdUi } from "@/utils/chainsUtil";
import { EVM_CHAINS } from "@/services/chainConfig";
import {
  BSC_CHAIN_ID,
  BSC_NRUSDT_INTENTS_ASSET_ID,
  BSC_USDT_INTENTS_ASSET_ID,
  getLsdBalances,
  getLsdIntentsOrderHistory,
  pollLsdIntentsTransactionStatus,
  prepareLsdSupplyByIntents,
  prepareLsdWithdrawByIntents,
  quoteLsdSupplyByIntents,
  quoteLsdWithdrawByIntents,
} from "@rhea-finance/cross-chain-sdk";
import { transfer_evm } from "@/services/chains/evm";
import failToast from "@/components/common/toast/failToast";
import { beautifyNumber } from "@/utils/beautifyNumber";

type FlowProgress = {
  status: "loading" | "success" | "error";
  message: string;
};

type IntentsBridgeStatus = "not_started" | "polling" | "success" | string;

type LsdHistoryRow = {
  action: "Supply" | "Withdraw";
  wallet: string;
  token: "USDT" | "nrUsdt";
  amount: string;
  feeUsd: string;
  status: string;
  time: string;
  depositAddress: string;
};

const getPrepareStageProgressText = (
  action: "Supply" | "Withdraw",
  stage: string
) => {
  switch (stage) {
    case "quoting_origin":
      return `${action}: requesting origin quote...`;
    case "calculating_lsd":
      return `${action}: calculating LSD route amount...`;
    case "quoting_return":
      return `${action}: requesting return quote...`;
    case "completed":
      return `${action}: route prepared. Waiting for wallet confirmation...`;
    case "failed":
      return `${action}: route preparation failed`;
    default:
      return `${action}: preparing route...`;
  }
};

const getBridgePollingProgressText = ({
  action,
  originStatus,
  returnStatus,
}: {
  action: "Supply" | "Withdraw";
  originStatus: IntentsBridgeStatus;
  returnStatus: IntentsBridgeStatus;
}) => {
  return `${action}: waiting for Intents settlement...\nOrigin bridge: ${originStatus}\nReturn bridge: ${returnStatus}`;
};

const renderFlowProgress = (progress: FlowProgress | null) => {
  if (!progress) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        progress.status === "error"
          ? "bg-red-10/10 text-red-500"
          : progress.status === "success"
          ? "bg-green-10/10 text-green-700"
          : "bg-gray-80 text-gray-50"
      }`}
    >
      {progress.status === "loading" && (
        <Icon icon="svg-spinners:ring-resize" className="mt-0.5 h-4 w-4" />
      )}
      {progress.status === "success" && (
        <Icon icon="mdi:check-circle-outline" className="mt-0.5 h-4 w-4" />
      )}
      {progress.status === "error" && (
        <Icon icon="mdi:alert-circle-outline" className="mt-0.5 h-4 w-4" />
      )}
      <span className="break-words whitespace-pre-line">
        {progress.message}
      </span>
    </div>
  );
};

const formatHistoryTime = (timestamp?: string) => {
  if (!timestamp) return "-";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getActionTooltipText = (action: "Supply" | "Withdraw") => {
  if (action === "Supply") {
    return "Bridge USDT into the Lending to receive nrUsdt on BSC.";
  }

  return "Bridge nrUsdt into the Lending to receive USDT back on BSC.";
};

const LSDPage = () => {
  const { evm } = useWalletConnect();
  const [supplyAmount, setSupplyAmount] = useState("0");
  const [costAmount, setCostAmount] = useState("0");
  const [estReceiveLsd, setEstReceiveLsd] = useState("0");
  const [estReceiveUsdt, setEstReceiveUsdt] = useState("0");
  const [supplyQuoteError, setSupplyQuoteError] = useState<string | null>(null);
  const [isSupplyQuoteLoading, setIsSupplyQuoteLoading] = useState(false);
  const [isWithdrawQuoteLoading, setIsWithdrawQuoteLoading] = useState(false);
  const [supplyBridgeFee, setSupplyBridgeFee] = useState<string | null>(null);
  const [withdrawBridgeFee, setWithdrawBridgeFee] = useState<string | null>(
    null
  );
  const [withdrawQuoteError, setWithdrawQuoteError] = useState<string | null>(
    null
  );
  const [bscUsdtBalance, setBscUsdtBalance] = useState("0");
  const [bscLsdUsdtBalance, setBscLsdUsdtBalance] = useState("0");

  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [supplyProgress, setSupplyProgress] = useState<FlowProgress | null>(
    null
  );
  const [withdrawProgress, setWithdrawProgress] = useState<FlowProgress | null>(
    null
  );
  const [historyRows, setHistoryRows] = useState<LsdHistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const bscAccountId = evm.accountId;

  // Auto switch to BSC chain when EVM wallet is connected
  useEffect(() => {
    if (
      evm.isSignedIn &&
      evm.connectedChainData?.id?.toLowerCase() !== BSC_CHAIN_ID.toLowerCase()
    ) {
      evm.setChain(BSC_CHAIN_ID);
    }
  }, [evm.isSignedIn, evm.connectedChainData?.id]);

  // Fetch balances function
  const fetchBalances = useCallback(async () => {
    const accountId = evm.accountId;

    if (!accountId) {
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
      return;
    }

    try {
      const balances = await getLsdBalances({
        accountAddress: accountId,
        rpcUrl: "https://bsc.api.pocket.network",
      });
      setBscUsdtBalance(balances.usdt || "0");
      setBscLsdUsdtBalance(balances.lsdUsdt || "0");
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
    }
  }, [evm.accountId]);

  const fetchHistory = useCallback(async () => {
    const accountId = evm.accountId;

    if (!accountId) {
      setHistoryRows([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
      return;
    }

    try {
      setIsHistoryLoading(true);
      setHistoryError(null);
      const response = await getLsdIntentsOrderHistory({
        accountId,
        pageSize: 10,
      });

      const rows = response.record_list
        .map((record) => {
          const action =
            record.quoteRequest.originAsset === BSC_USDT_INTENTS_ASSET_ID
              ? "Supply"
              : record.quoteRequest.originAsset === BSC_NRUSDT_INTENTS_ASSET_ID
              ? "Withdraw"
              : null;

          if (!action || !record.quote?.depositAddress) {
            return null;
          }

          return {
            action,
            wallet: record.quoteRequest.refundTo || accountId,
            token: action === "Supply" ? "USDT" : "nrUsdt",
            amount: record.quote.amountInFormatted || "0",
            feeUsd: new Big(record.quote.amountInUsd || 0)
              .minus(record.quote.amountOutUsd || 0)
              .toFixed(),
            status: record.status || "-",
            time: formatHistoryTime(record.timestamp),
            depositAddress: record.quote.depositAddress,
          };
        })
        .filter((row): row is LsdHistoryRow => !!row);

      setHistoryRows(rows);
    } catch (error) {
      console.error("Failed to fetch LSD history:", error);
      setHistoryRows([]);
      setHistoryError(
        error instanceof Error ? error.message : "Failed to fetch history"
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [evm.accountId]);

  // Auto fetch balances
  useEffect(() => {
    if (!bscAccountId) {
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
      return;
    }

    fetchBalances();
    // Refresh balances every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [bscAccountId, fetchBalances]);

  useEffect(() => {
    if (!bscAccountId) {
      setHistoryRows([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
      return;
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [bscAccountId, fetchHistory]);

  // Try to get Intents quote for supply amount
  useEffect(() => {
    if (!bscAccountId || !supplyAmount || parseFloat(supplyAmount) <= 0) {
      setSupplyQuoteError(null);
      setSupplyBridgeFee(null);
      setIsSupplyQuoteLoading(false);
      return;
    }

    const tryQuote = async () => {
      try {
        setIsSupplyQuoteLoading(true);
        setSupplyQuoteError(null);
        // the BSC USDT -> NEAR LSD -> BSC lsdUSDT quote chain.
        const quote = await quoteLsdSupplyByIntents({
          accountAddress: bscAccountId,
          amount: supplyAmount,
        });
        setEstReceiveLsd(quote.estimatedReceive || "0");
        setSupplyBridgeFee(quote.bridgeFeeUsd);
      } catch (error) {
        console.error("Failed to get supply quote:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get quote";
        setSupplyQuoteError(errorMessage);
        setEstReceiveLsd("0");
        setSupplyBridgeFee(null);
      } finally {
        setIsSupplyQuoteLoading(false);
      }
    };

    // Add debounce to avoid too many requests
    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [supplyAmount, bscAccountId]);

  // Try to get Intents quote for Redeem amount
  useEffect(() => {
    if (!bscAccountId || !costAmount || parseFloat(costAmount) <= 0) {
      setWithdrawQuoteError(null);
      setWithdrawBridgeFee(null);
      setIsWithdrawQuoteLoading(false);
      return;
    }

    const tryQuote = async () => {
      try {
        setIsWithdrawQuoteLoading(true);
        setWithdrawQuoteError(null);
        // the BSC lsdUSDT -> NEAR USDT -> BSC USDT quote chain.
        const quote = await quoteLsdWithdrawByIntents({
          accountAddress: bscAccountId,
          amount: costAmount,
        });
        setEstReceiveUsdt(quote.estimatedReceive || "0");
        setWithdrawBridgeFee(quote.bridgeFeeUsd);
      } catch (error) {
        console.error("Failed to get withdraw quote:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get quote";
        setWithdrawQuoteError(errorMessage);
        setEstReceiveUsdt("0");
        setWithdrawBridgeFee(null);
      } finally {
        setIsWithdrawQuoteLoading(false);
      }
    };

    // Add debounce to avoid too many requests
    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [costAmount, bscAccountId]);

  // Handle Supply USDT Bridge by Intents
  const handleSupplyBridgeByIntents = async () => {
    if (!bscAccountId || !supplyAmount || parseFloat(supplyAmount) <= 0) {
      return;
    }
    setIsSupplying(true);
    setSupplyProgress({
      status: "loading",
      message: "Supply: preparing route...",
    });
    try {
      // prepareLsdSupplyByIntents returns the final transfer data after the multi-leg Intents route is prepared.
      const prepared = await prepareLsdSupplyByIntents({
        accountAddress: bscAccountId,
        amount: supplyAmount,
        onStatusChange: (stage) => {
          console.log("LSD supply prepare stage:", stage);
          setSupplyProgress({
            status: stage === "failed" ? "error" : "loading",
            message: getPrepareStageProgressText("Supply", stage),
          });
        },
      });

      if (prepared.status !== "success" || !prepared.transferData) {
        setSupplyProgress({
          status: "error",
          message: prepared.message || "Supply: failed to prepare transaction",
        });
        failToast({
          failText: prepared.message || "Failed to prepare supply transaction",
        });
        return;
      }

      const { intentsDepositAddresses, transferData } = prepared;

      if (!intentsDepositAddresses) {
        setSupplyProgress({
          status: "error",
          message: "Supply: missing Intents deposit addresses",
        });
        failToast({ failText: "Missing Intents deposit addresses" });
        return;
      }

      // executes the actual BSC wallet transfer.
      setSupplyProgress({
        status: "loading",
        message: "Supply: waiting for wallet transfer confirmation...",
      });
      await transfer_evm({
        tokenAddress: transferData.tokenAddress,
        depositAddress: transferData.depositAddress,
        chain: transferData.chain,
        amount: transferData.amount,
      });

      // poll both Intents legs until the LSD supply route settles.
      setSupplyProgress({
        status: "loading",
        message: getBridgePollingProgressText({
          action: "Supply",
          originStatus: "polling",
          returnStatus: "not_started",
        }),
      });
      const originStatus = await pollLsdIntentsTransactionStatus({
        depositAddress: intentsDepositAddresses.originDepositAddress,
      });

      if (originStatus.status !== "success") {
        throw new Error(
          `Origin bridge status: ${originStatus.status}, return bridge status: not_started`
        );
      }

      setSupplyProgress({
        status: "loading",
        message: getBridgePollingProgressText({
          action: "Supply",
          originStatus: originStatus.status,
          returnStatus: "polling",
        }),
      });
      const returnStatus = await pollLsdIntentsTransactionStatus({
        depositAddress: intentsDepositAddresses.returnDepositAddress,
      });

      if (returnStatus.status === "success") {
        console.log("Supply transaction completed successfully");
        // Refresh balances
        await fetchBalances();
        await fetchHistory();
        setSupplyProgress({
          status: "success",
          message: `${getBridgePollingProgressText({
            action: "Supply",
            originStatus: originStatus.status,
            returnStatus: returnStatus.status,
          })}\nSupply completed. Balances refreshed.`,
        });
      } else {
        throw new Error(
          `Origin bridge status: ${originStatus.status}, return bridge status: ${returnStatus.status}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setSupplyProgress({
        status: "error",
        message: `Supply failed: ${formatErrorMessage(errorMessage)}`,
      });
      failToast({ failText: formatErrorMessage(errorMessage) });
    } finally {
      setIsSupplying(false);
    }
  };
  // Handle Withdraw USDT Bridge by Intents
  const handleWithdrawBridgeByIntents = async () => {
    if (!bscAccountId || !costAmount || parseFloat(costAmount) <= 0) {
      return;
    }

    setIsWithdrawing(true);
    setWithdrawProgress({
      status: "loading",
      message: "Withdraw: preparing route...",
    });

    try {
      console.log("Start Withdraw Process", { amount: costAmount });
      // returns the final transfer data after the multi-leg Intents route is prepared.
      const prepared = await prepareLsdWithdrawByIntents({
        accountAddress: bscAccountId,
        amount: costAmount,
        onStatusChange: (stage) => {
          console.log("LSD withdraw prepare stage:", stage);
          setWithdrawProgress({
            status: stage === "failed" ? "error" : "loading",
            message: getPrepareStageProgressText("Withdraw", stage),
          });
        },
      });

      if (prepared.status !== "success" || !prepared.transferData) {
        setWithdrawProgress({
          status: "error",
          message:
            prepared.message || "Withdraw: failed to prepare transaction",
        });
        failToast({
          failText:
            prepared.message || "Failed to prepare withdraw transaction",
        });
        return;
      }

      const { intentsDepositAddresses, transferData } = prepared;

      if (!intentsDepositAddresses) {
        setWithdrawProgress({
          status: "error",
          message: "Withdraw: missing Intents deposit addresses",
        });
        failToast({ failText: "Missing Intents deposit addresses" });
        return;
      }

      // executes the actual BSC wallet transfer.
      setWithdrawProgress({
        status: "loading",
        message: "Withdraw: waiting for wallet transfer confirmation...",
      });
      await transfer_evm({
        tokenAddress: transferData.tokenAddress,
        depositAddress: transferData.depositAddress,
        chain: transferData.chain,
        amount: transferData.amount,
      });

      // poll both Intents legs until the LSD withdraw route settles.
      setWithdrawProgress({
        status: "loading",
        message: getBridgePollingProgressText({
          action: "Withdraw",
          originStatus: "polling",
          returnStatus: "not_started",
        }),
      });
      const originStatus = await pollLsdIntentsTransactionStatus({
        depositAddress: intentsDepositAddresses.originDepositAddress,
      });

      if (originStatus.status !== "success") {
        throw new Error(
          `Origin bridge status: ${originStatus.status}, return bridge status: not_started`
        );
      }

      setWithdrawProgress({
        status: "loading",
        message: getBridgePollingProgressText({
          action: "Withdraw",
          originStatus: originStatus.status,
          returnStatus: "polling",
        }),
      });
      const returnStatus = await pollLsdIntentsTransactionStatus({
        depositAddress: intentsDepositAddresses.returnDepositAddress,
      });

      if (returnStatus.status === "success") {
        console.log("Withdraw transaction completed successfully");
        await fetchBalances();
        await fetchHistory();
        setWithdrawProgress({
          status: "success",
          message: `${getBridgePollingProgressText({
            action: "Withdraw",
            originStatus: originStatus.status,
            returnStatus: returnStatus.status,
          })}\nWithdraw completed. Balances refreshed.`,
        });
      } else {
        throw new Error(
          `Origin bridge status: ${originStatus.status}, return bridge status: ${returnStatus.status}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Withdraw failed:", error);
      setWithdrawProgress({
        status: "error",
        message: `Withdraw failed: ${formatErrorMessage(errorMessage)}`,
      });
      failToast({ failText: formatErrorMessage(errorMessage) });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Get BSC chain info
  const bscChainInfo = EVM_CHAINS.find(
    (chain) => chain.id.toLowerCase() === BSC_CHAIN_ID.toLowerCase()
  );

  return (
    <div className="text-black">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Wallet Info Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-30">
          <div className="flex items-center gap-2 mb-4">
            {bscChainInfo && (
              <>
                <Img path={bscChainInfo.icon} className="w-6 h-6" />
                <span className="text-lg font-semibold text-black">BSC</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {bscAccountId && (
              <div className="flex-1 bg-gray-80 rounded-lg px-4 py-2">
                <div className="text-sm text-gray-50 mb-1">Account</div>
                <div className="text-base font-medium text-black font-mono">
                  {getAccountIdUi(bscAccountId)}
                </div>
              </div>
            )}
            {!bscAccountId && (
              <div className="flex-1 text-sm text-gray-50">Not connected</div>
            )}
          </div>
        </div>

        {/* Balances Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-30">
          <h2 className="text-lg font-semibold mb-4 text-left">Balances</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-80 rounded-lg p-4">
              <div className="text-sm text-gray-50 mb-1">BSC USDT</div>
              <div className="text-base font-medium break-all text-black">
                {bscUsdtBalance}
              </div>
            </div>
            <div className="bg-gray-80 rounded-lg p-4">
              <div className="text-sm text-gray-50 mb-1">BSC lsdUSDT</div>
              <div className="text-base font-medium text-black">
                {bscLsdUsdtBalance}
              </div>
            </div>
          </div>
        </div>

        {/* Supply USDT Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-30">
          <h2 className="text-lg font-semibold mb-4 text-left">Supply USDT</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-50 mb-2">
                  USDT Amount
                </label>
                <label className="block text-sm text-gray-50 mb-2">
                  {bscUsdtBalance}
                </label>
              </div>
              <input
                type="text"
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
                className="w-full bg-gray-80 border border-gray-30 rounded-lg px-4 py-3 text-black placeholder-gray-200 focus:outline-none focus:border-green-10"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-50">Est. Receive lsdUSDT</span>
              <span className="text-black font-medium flex items-center gap-2">
                {isSupplyQuoteLoading ? (
                  <Icon
                    icon="svg-spinners:ring-resize"
                    className="w-4 h-4 animate-spin"
                  />
                ) : (
                  estReceiveLsd
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-50">Bridge Fee</span>
              <span className="text-black font-medium">
                {beautifyNumber({
                  num: supplyBridgeFee,
                  isUsd: true,
                }) ?? "-"}
              </span>
            </div>
            {supplyQuoteError && (
              <div className="text-sm text-red-500">{supplyQuoteError}</div>
            )}
            <button
              className="w-full bg-green-10 text-black font-semibold py-3 rounded-lg hover:bg-green-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSupplyBridgeByIntents}
              disabled={
                !bscAccountId ||
                !supplyAmount ||
                parseFloat(supplyAmount) <= 0 ||
                parseFloat(supplyAmount) > parseFloat(bscUsdtBalance) ||
                !!supplyQuoteError ||
                isSupplying ||
                isSupplyQuoteLoading
              }
            >
              {isSupplying ? "Supplying..." : "Supply"}
            </button>
            {renderFlowProgress(supplyProgress)}
          </div>
        </div>

        {/* Withdraw USDT Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-30">
          <h2 className="text-lg font-semibold mb-4 text-left">Redeem USDT</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-50 mb-2">
                  lsdUSDT Amount
                </label>
                <label className="block text-sm text-gray-50 mb-2">
                  {bscLsdUsdtBalance}
                </label>
              </div>
              <input
                type="text"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                className="w-full bg-gray-80 border border-gray-30 rounded-lg px-4 py-3 text-black placeholder-gray-200 focus:outline-none focus:border-purple-500"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-50">Est. Receive USDT</span>
              <span className="text-black font-medium flex items-center gap-2">
                {isWithdrawQuoteLoading ? (
                  <Icon
                    icon="svg-spinners:ring-resize"
                    className="w-4 h-4 animate-spin"
                  />
                ) : (
                  estReceiveUsdt
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-50">Bridge Fee</span>
              <span className="text-black font-medium">
                {beautifyNumber({
                  num: withdrawBridgeFee,
                  isUsd: true,
                }) ?? "-"}
              </span>
            </div>
            {withdrawQuoteError && (
              <div className="text-sm text-red-500">{withdrawQuoteError}</div>
            )}
            <button
              className="w-full bg-red-10 text-white font-semibold py-3 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleWithdrawBridgeByIntents}
              disabled={
                !bscAccountId ||
                !costAmount ||
                parseFloat(costAmount) <= 0 ||
                parseFloat(costAmount) > parseFloat(bscLsdUsdtBalance) ||
                !!withdrawQuoteError ||
                isWithdrawing ||
                isWithdrawQuoteLoading
              }
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
            {renderFlowProgress(withdrawProgress)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 mt-6 border border-gray-30">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-left">History</h2>
            {isHistoryLoading && (
              <Icon
                icon="svg-spinners:ring-resize"
                className="w-4 h-4 animate-spin text-gray-50"
              />
            )}
          </div>

          {!bscAccountId && (
            <div className="text-sm text-gray-50">
              Connect your BSC wallet to view LSD history.
            </div>
          )}

          {bscAccountId && historyError && (
            <div className="text-sm text-red-500">{historyError}</div>
          )}

          {bscAccountId &&
            !historyError &&
            historyRows.length === 0 &&
            !isHistoryLoading && (
              <div className="text-sm text-gray-50">No LSD history found.</div>
            )}

          {bscAccountId && historyRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] table-auto border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-gray-50">
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Action
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Wallet
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Token
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Fee
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-2 py-3 text-left font-normal border-b border-gray-30 whitespace-nowrap">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historyRows.map((row) => (
                    <tr
                      key={`${row.depositAddress}-${row.time}`}
                      className="text-black"
                    >
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        <div className="font-medium inline-flex items-center gap-1.5">
                          <span>{row.action}</span>
                          <DefaultToolTip
                            tip={getActionTooltipText(row.action)}
                            className="inline-flex items-center"
                          >
                            <span className="inline-flex items-center text-gray-50 hover:text-black transition-colors">
                              <Icon
                                icon="akar-icons:question"
                                className="w-4 h-4"
                              />
                            </span>
                          </DefaultToolTip>
                        </div>
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 font-mono whitespace-nowrap">
                        {getAccountIdUi(row.wallet)}
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        {row.token}
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        {row.amount}
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        {beautifyNumber({
                          num: row.feeUsd,
                          isUsd: true,
                        }) ?? "-"}
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        {row.status}
                      </td>
                      <td className="px-2 py-4 border-b border-gray-30 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{row.time}</span>
                          <a
                            href={`https://1click.chaindefuser.com/v0/status?depositAddress=${row.depositAddress}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-black hover:text-green-10 transition-colors"
                            aria-label={`Open order status for ${row.depositAddress}`}
                          >
                            <Icon
                              icon="mdi:arrow-top-right"
                              className="w-5 h-5"
                            />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LSDPage;
