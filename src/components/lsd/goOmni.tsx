import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import Big from "big.js";
import useWalletConnect from "@/hooks/useWalletConnect";
import { get_balance_evm, transfer_evm } from "@/services/chains/evm";
import { Img } from "@/components/common/img";
import {
  formatErrorMessage,
  getAccountIdUi,
  parseAmount,
  formatAmount,
} from "@/utils/chainsUtil";
import { EVM_CHAINS } from "@/services/chainConfig";
import {
  BSC_CHAIN_ID,
  BSC_USDT_ADDRESS,
  BSC_LSD_USDT_ADDRESS,
  BSC_USDT_DECIMALS,
  LSD_USDT_DECIMALS,
  NEAR_USDT_DECIMALS,
  calculateLsdFromUsdt,
  calculateUsdtFromLsd,
  createLsdOmniInitTransferMessage,
  createLsdNearIntentsRecipientMsg,
  createLsdOmniRecipientMsg,
  getOmniBridgeFee,
  bridgeTokenByOmniFromBsc,
  pollOmniTransferStatus,
  LSD_CONTRACT_ID,
} from "@/services/lsd";
import { intentsQuotationUi } from "@/services/lending/actions/commonAction";
import { pollingTransactionStatus } from "@rhea-finance/cross-chain-sdk";
import failToast from "@/components/common/toast/failToast";
import { beautifyNumber } from "@/utils/beautifyNumber";

function toPositiveBig(value?: string | number | bigint | null) {
  const normalized = value ?? 0;
  const big = new Big(normalized.toString());
  return big.lt(0) ? new Big(0) : big;
}

function getOmniTransferredTokenFee(quote: {
  transferred_token_fee?: string | null;
}) {
  return quote.transferred_token_fee || "0";
}

async function getSupplyFlowQuote(params: {
  bscAccountId: string;
  supplyAmount: string;
}) {
  const bscOmniRecipient = `bnb:${params.bscAccountId}`;
  const initialQuoteResult = await intentsQuotationUi({
    chain: "evm",
    symbol: "USDT",
    selectedEvmChain: "BSC",
    amount: parseAmount(params.supplyAmount, BSC_USDT_DECIMALS),
    refundTo: params.bscAccountId,
    recipient: LSD_CONTRACT_ID,
    outChainToNearChain: true,
  });

  if (
    initialQuoteResult?.quoteStatus !== "success" ||
    !initialQuoteResult?.quoteSuccessResult?.quote
  ) {
    throw new Error(
      initialQuoteResult?.message || "Failed to get Intents quote"
    );
  }

  const { minAmountOut } = initialQuoteResult.quoteSuccessResult.quote;
  const nearUsdtReadable = formatAmount(minAmountOut, NEAR_USDT_DECIMALS);
  const lsdAmountRaw = await calculateLsdFromUsdt(nearUsdtReadable);
  const omniQuote = await getOmniBridgeFee({
    sender: `near:${LSD_CONTRACT_ID}`,
    recipient: bscOmniRecipient,
    tokenAddress: `near:${LSD_CONTRACT_ID}`,
    amount: lsdAmountRaw,
  });
  const customRecipientMsg = createLsdOmniRecipientMsg(
    createLsdOmniInitTransferMessage({
      recipient: bscOmniRecipient,
      fee: getOmniTransferredTokenFee(omniQuote),
      nativeFee: omniQuote.native_token_fee.toString(),
    })
  );
  const quoteResult = await intentsQuotationUi({
    chain: "evm",
    symbol: "USDT",
    selectedEvmChain: "BSC",
    amount: parseAmount(params.supplyAmount, BSC_USDT_DECIMALS),
    refundTo: params.bscAccountId,
    recipient: LSD_CONTRACT_ID,
    outChainToNearChain: true,
    customRecipientMsg,
  });

  if (
    quoteResult?.quoteStatus !== "success" ||
    !quoteResult?.quoteSuccessResult?.quote
  ) {
    throw new Error(quoteResult?.message || "Failed to get Intents quote");
  }

  return {
    lsdAmountRaw,
    omniQuote,
    quoteResult,
  };
}

async function getWithdrawFlowQuote(params: {
  bscAccountId: string;
  withdrawAmount: string;
}) {
  const bscOmniSender = `bnb:${params.bscAccountId}`;
  const nearLsdRecipient = `near:${LSD_CONTRACT_ID}`;
  const withdrawAmountRaw = parseAmount(
    params.withdrawAmount,
    LSD_USDT_DECIMALS
  );
  const omniQuoteToNear = await getOmniBridgeFee({
    sender: bscOmniSender,
    recipient: nearLsdRecipient,
    tokenAddress: `bnb:${BSC_LSD_USDT_ADDRESS}`,
    amount: withdrawAmountRaw,
  });
  const lsdArriveNearRaw = toPositiveBig(withdrawAmountRaw).minus(
    toPositiveBig(getOmniTransferredTokenFee(omniQuoteToNear))
  );
  const lsdArriveNearReadable = formatAmount(
    lsdArriveNearRaw.toFixed(0),
    LSD_USDT_DECIMALS
  );
  const usdtReadable = await calculateUsdtFromLsd(lsdArriveNearReadable);
  const usdtRaw = new Big(parseAmount(usdtReadable, NEAR_USDT_DECIMALS))
    .mul(0.9999)
    .toFixed(0, Big.roundDown);
  const intentsQuoteBackToBsc = await intentsQuotationUi({
    chain: "evm",
    symbol: "USDT",
    selectedEvmChain: "BSC",
    amount: usdtRaw,
    refundTo: LSD_CONTRACT_ID,
    recipient: params.bscAccountId,
    outChainToNearChain: false,
  });

  if (
    intentsQuoteBackToBsc?.quoteStatus !== "success" ||
    !intentsQuoteBackToBsc?.quoteSuccessResult?.quote
  ) {
    throw new Error(
      intentsQuoteBackToBsc?.message ||
        "Failed to get Intents quote for withdraw"
    );
  }

  return {
    withdrawAmountRaw,
    nearLsdRecipient,
    omniQuoteToNear,
    intentsQuoteBackToBsc,
  };
}

const LSDPageOmni = () => {
  const { evm } = useWalletConnect();
  const [supplyAmount, setSupplyAmount] = useState("0");
  const [withdrawAmount, setWithdrawAmount] = useState("0");
  const [estReceiveLsd, setEstReceiveLsd] = useState("0");
  const [estReceiveUsdt, setEstReceiveUsdt] = useState("0");
  const [supplyQuoteError, setSupplyQuoteError] = useState<string | null>(null);
  const [withdrawQuoteError, setWithdrawQuoteError] = useState<string | null>(
    null
  );
  const [isSupplyQuoteLoading, setIsSupplyQuoteLoading] = useState(false);
  const [isWithdrawQuoteLoading, setIsWithdrawQuoteLoading] = useState(false);
  const [supplyBridgeFee, setSupplyBridgeFee] = useState<string | null>(null);
  const [withdrawBridgeFee, setWithdrawBridgeFee] = useState<string | null>(
    null
  );
  const [bscUsdtBalance, setBscUsdtBalance] = useState("0");
  const [bscLsdUsdtBalance, setBscLsdUsdtBalance] = useState("0");
  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [supplyProgressText, setSupplyProgressText] = useState<string | null>(
    null
  );
  const [withdrawProgressText, setWithdrawProgressText] = useState<
    string | null
  >(null);
  const bscAccountId = evm.accountId;

  useEffect(() => {
    if (evm.isSignedIn) {
      evm.setChain(BSC_CHAIN_ID);
    }
  }, [evm.isSignedIn]);

  const fetchBalances = useCallback(async () => {
    const accountId = evm.accountId;

    if (!accountId) {
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
      return;
    }

    try {
      const usdtBalance = await get_balance_evm({
        userAddress: accountId,
        chain: "bsc",
        token: {
          symbol: "USDT",
          address: BSC_USDT_ADDRESS,
          decimals: BSC_USDT_DECIMALS,
        },
      });
      setBscUsdtBalance(usdtBalance || "0");

      const lsdBalance = await get_balance_evm({
        userAddress: accountId,
        chain: "bsc",
        token: {
          symbol: "lsdUSDT",
          address: BSC_LSD_USDT_ADDRESS,
          decimals: LSD_USDT_DECIMALS,
        },
      });
      setBscLsdUsdtBalance(lsdBalance || "0");
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
    }
  }, [evm.accountId]);

  useEffect(() => {
    if (!bscAccountId) {
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
      return;
    }

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [bscAccountId, fetchBalances]);

  useEffect(() => {
    if (!bscAccountId || !supplyAmount || parseFloat(supplyAmount) <= 0) {
      setEstReceiveLsd("0");
      setSupplyBridgeFee(null);
      setSupplyQuoteError(null);
      setIsSupplyQuoteLoading(false);
      if (!isSupplying) {
        setSupplyProgressText(null);
      }
      return;
    }

    const tryQuote = async () => {
      try {
        setIsSupplyQuoteLoading(true);
        setSupplyQuoteError(null);
        const { lsdAmountRaw, omniQuote, quoteResult } =
          await getSupplyFlowQuote({
            bscAccountId,
            supplyAmount,
          });

        const { amountInUsd, amountOutUsd } =
          quoteResult.quoteSuccessResult.quote;

        const tokenFee = getOmniTransferredTokenFee(omniQuote);
        const estReceiveRaw = toPositiveBig(lsdAmountRaw).minus(
          toPositiveBig(tokenFee)
        );

        const feeUsd = toPositiveBig(amountInUsd).minus(
          toPositiveBig(amountOutUsd)
        );
        const totalFeeUsd = feeUsd.plus(toPositiveBig(/*omniQuote.usd_fee*/ 0));

        setEstReceiveLsd(
          formatAmount(estReceiveRaw.toFixed(0), LSD_USDT_DECIMALS)
        );
        setSupplyBridgeFee(totalFeeUsd.toFixed());
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

    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [supplyAmount, bscAccountId, isSupplying]);

  useEffect(() => {
    if (!bscAccountId || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setEstReceiveUsdt("0");
      setWithdrawBridgeFee(null);
      setWithdrawQuoteError(null);
      setIsWithdrawQuoteLoading(false);
      if (!isWithdrawing) {
        setWithdrawProgressText(null);
      }
      return;
    }

    const tryQuote = async () => {
      try {
        setIsWithdrawQuoteLoading(true);
        setWithdrawQuoteError(null);
        const { omniQuoteToNear, intentsQuoteBackToBsc } =
          await getWithdrawFlowQuote({
            bscAccountId,
            withdrawAmount,
          });

        const { amountOutFormatted, amountInUsd, amountOutUsd } =
          intentsQuoteBackToBsc.quoteSuccessResult.quote;
        const tokenFeeReadable = toPositiveBig(amountInUsd).minus(
          toPositiveBig(amountOutUsd)
        );
        const totalFeeUsd = toPositiveBig(/*omniQuoteToNear.usd_fee*/ 0).plus(
          tokenFeeReadable
        );

        setEstReceiveUsdt(amountOutFormatted ?? "0");
        setWithdrawBridgeFee(totalFeeUsd.toFixed());
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

    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [withdrawAmount, bscAccountId, isWithdrawing]);

  const handleSupply = async () => {
    if (!bscAccountId || !supplyAmount || parseFloat(supplyAmount) <= 0) {
      return;
    }

    setIsSupplying(true);
    setSupplyProgressText("Preparing supply route...");

    try {
      setSupplyProgressText("Preparing bridge route...");
      const { quoteResult } = await getSupplyFlowQuote({
        bscAccountId,
        supplyAmount,
      });

      const { depositAddress, amountIn } = quoteResult.quoteSuccessResult.quote;
      setSupplyProgressText("Waiting for BSC wallet confirmation...");

      await transfer_evm({
        tokenAddress: BSC_USDT_ADDRESS,
        depositAddress,
        chain: "bsc",
        amount: amountIn,
      });
      setSupplyProgressText(
        "USDT sent. Waiting for Intents execution and Omni bridge..."
      );

      const { status } = await pollingTransactionStatus(depositAddress);

      if (status === "success") {
        setSupplyProgressText("Supply completed.");
        await fetchBalances();
      } else {
        throw new Error(`Transaction status: ${status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setSupplyProgressText("Supply failed. Please try again.");
      failToast({ failText: formatErrorMessage(errorMessage) });
    } finally {
      setIsSupplying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!bscAccountId || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      return;
    }

    setIsWithdrawing(true);
    setWithdrawProgressText("Preparing withdraw route...");

    try {
      if (!window.ethWeb3Provider) {
        throw new Error("Wallet not connected, please connect BSC wallet");
      }
      setWithdrawProgressText("Preparing bridge route...");
      const {
        withdrawAmountRaw,
        nearLsdRecipient,
        omniQuoteToNear,
        intentsQuoteBackToBsc,
      } = await getWithdrawFlowQuote({
        bscAccountId,
        withdrawAmount,
      });

      const { depositAddress } = intentsQuoteBackToBsc.quoteSuccessResult.quote;
      const signer = await window.ethWeb3Provider.getSigner();
      setWithdrawProgressText("Waiting for BSC wallet confirmation...");
      const txHash = await bridgeTokenByOmniFromBsc({
        signer,
        tokenAddress: BSC_LSD_USDT_ADDRESS,
        amount: withdrawAmountRaw,
        recipient: nearLsdRecipient,
        fee: getOmniTransferredTokenFee(omniQuoteToNear),
        nativeFee: omniQuoteToNear.native_token_fee.toString(),
        message: createLsdNearIntentsRecipientMsg(depositAddress),
      });
      setWithdrawProgressText(
        "Omni transfer submitted. Waiting for NEAR finalization..."
      );
      await pollOmniTransferStatus({
        transactionHash: txHash,
        successStatuses: [
          "FastFinalisedOnNear",
          "FinalisedOnNear",
          "FastFinalised",
          "Finalised",
          "Claimed",
        ],
      });
      setWithdrawProgressText(
        "Omni arrived on NEAR. Waiting for Intents bridge back to BSC..."
      );
      const { status } = await pollingTransactionStatus(depositAddress);

      if (status !== "success") {
        throw new Error(`Intents transaction status: ${status}`);
      }

      setWithdrawProgressText("Withdraw completed.");
      await fetchBalances();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Omni withdraw failed:", error);
      setWithdrawProgressText("Withdraw failed. Please try again.");
      failToast({ failText: formatErrorMessage(errorMessage) });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const bscChainInfo = EVM_CHAINS.find(
    (chain) => chain.id.toLowerCase() === BSC_CHAIN_ID.toLowerCase()
  );

  return (
    <div className="text-black">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
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
              onClick={handleSupply}
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
            {supplyProgressText && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-50">
                {/* {isSupplying && (
                  <Icon
                    icon="svg-spinners:ring-resize"
                    className="w-4 h-4 animate-spin"
                  />
                )} */}
                <span>{supplyProgressText}</span>
              </div>
            )}
          </div>
        </div>

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
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
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
              onClick={handleWithdraw}
              disabled={
                !bscAccountId ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) <= 0 ||
                parseFloat(withdrawAmount) > parseFloat(bscLsdUsdtBalance) ||
                !!withdrawQuoteError ||
                isWithdrawing ||
                isWithdrawQuoteLoading
              }
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
            {withdrawProgressText && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-50">
                {/* {isWithdrawing && (
                  <Icon
                    icon="svg-spinners:ring-resize"
                    className="w-4 h-4 animate-spin"
                  />
                )} */}
                <span>{withdrawProgressText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LSDPageOmni;
