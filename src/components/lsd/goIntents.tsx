import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import useWalletConnect from "@/hooks/useWalletConnect";
import { get_balance_evm } from "@/services/chains/evm";
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
  LSD_CONTRACT_ID,
  calculateUsdtFromLsd,
} from "@/services/lsd";
import { intentsQuotationUi } from "@/services/lending/actions/commonAction";
import { transfer_evm } from "@/services/chains/evm";
import { pollingTransactionStatus } from "@rhea-finance/cross-chain-sdk";
import failToast from "@/components/common/toast/failToast";
import Big from "big.js";
import { beautifyNumber } from "@/utils/beautifyNumber";

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
  const bscAccountId = evm.accountId;

  // Auto switch to BSC chain when EVM wallet is connected
  useEffect(() => {
    if (evm.isSignedIn) {
      // Switch to BSC chain
      evm.setChain(BSC_CHAIN_ID);
    }
  }, [evm.isSignedIn]);

  // Fetch balances function
  const fetchBalances = useCallback(async () => {
    const accountId = evm.accountId;

    if (!accountId) {
      setBscUsdtBalance("0");
      setBscLsdUsdtBalance("0");
      return;
    }

    try {
      // Fetch USDT balance
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

      // Fetch lsdUSDT balance
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
        let bridgeFee = new Big(0);
        // Step1: get usdt amount from bsc chain to near chain for usdt token
        const quoteResult1 = await intentsQuotationUi({
          chain: "evm",
          symbol: "USDT",
          selectedEvmChain: "BSC",
          amount: parseAmount(supplyAmount, BSC_USDT_DECIMALS),
          refundTo: bscAccountId,
          recipient: LSD_CONTRACT_ID,
          outChainToNearChain: true,
        });

        if (
          quoteResult1?.quoteStatus !== "success" ||
          !quoteResult1?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult1?.message || "Failed to get Intents quote for supply";
          setSupplyQuoteError(errorMessage);
          return;
        }
        bridgeFee = new Big(
          quoteResult1.quoteSuccessResult.quote.amountInUsd
        ).minus(new Big(quoteResult1.quoteSuccessResult.quote.amountOutUsd));

        // Get amountOut from quote result
        const { amountOut, minAmountOut } =
          quoteResult1.quoteSuccessResult.quote;
        const amountOutReadable = formatAmount(
          minAmountOut,
          NEAR_USDT_DECIMALS
        );
        // step2: Calculate estimated lsdUSDT for supply based on quote result
        const lsdAmount = await calculateLsdFromUsdt(amountOutReadable);

        // step3: get lsd amount from near chain to bsc chain for lsd token
        const quoteResult2 = await intentsQuotationUi({
          chain: "evm",
          symbol: "NRUSDT",
          selectedEvmChain: "BSC",
          amount: lsdAmount,
          refundTo: LSD_CONTRACT_ID,
          recipient: bscAccountId,
          outChainToNearChain: false,
        });
        if (
          quoteResult2?.quoteStatus !== "success" ||
          !quoteResult2?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult2?.message || "Failed to get Intents quote for supply";
          setSupplyQuoteError(errorMessage);
          return;
        }
        bridgeFee = bridgeFee.plus(
          new Big(quoteResult2.quoteSuccessResult.quote.amountInUsd).minus(
            new Big(quoteResult2.quoteSuccessResult.quote.amountOutUsd)
          )
        );

        const { amountOutFormatted: amountOutFormatted2 } =
          quoteResult2.quoteSuccessResult.quote;
        setEstReceiveLsd(amountOutFormatted2);
        setSupplyBridgeFee(bridgeFee.toFixed());
      } catch (error) {
        console.error("Failed to get supply quote:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get quote";
        setSupplyQuoteError(errorMessage);
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
        let bridgeFee = new Big(0);
        // Step1: get lsd amount from bsc chain to near chain for lsd token
        const quoteResult1 = await intentsQuotationUi({
          chain: "evm",
          symbol: "NRUSDT",
          selectedEvmChain: "BSC",
          amount: parseAmount(costAmount, LSD_USDT_DECIMALS),
          refundTo: bscAccountId,
          recipient: LSD_CONTRACT_ID,
          outChainToNearChain: true,
        });

        if (
          quoteResult1?.quoteStatus !== "success" ||
          !quoteResult1?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult1?.message || "Failed to get Intents quote for withdraw";
          setWithdrawQuoteError(errorMessage);
          setEstReceiveUsdt("0");
          setWithdrawBridgeFee(null);
          return;
        }
        bridgeFee = new Big(
          quoteResult1.quoteSuccessResult.quote.amountInUsd
        ).minus(new Big(quoteResult1.quoteSuccessResult.quote.amountOutUsd));

        // Step2: get usdt amount from near chain to bsc chain for usdt token
        const { minAmountOut } = quoteResult1.quoteSuccessResult.quote;
        const minAmountOutReadable = formatAmount(
          minAmountOut,
          LSD_USDT_DECIMALS
        );
        const usdtAmount = await calculateUsdtFromLsd(minAmountOutReadable);

        // Step3: Get Intents quote (NEAR USDT -> BSC USDT) for estimated receive
        const quoteResult2 = await intentsQuotationUi({
          chain: "evm",
          symbol: "USDT",
          selectedEvmChain: "BSC",
          amount: usdtAmount,
          refundTo: LSD_CONTRACT_ID,
          recipient: bscAccountId,
          outChainToNearChain: false,
        });
        if (
          quoteResult2?.quoteStatus !== "success" ||
          !quoteResult2?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult2?.message || "Failed to get Intents quote for withdraw";
          setWithdrawQuoteError(errorMessage);
          setEstReceiveUsdt("0");
          setWithdrawBridgeFee(null);
          return;
        }
        bridgeFee = bridgeFee.plus(
          new Big(quoteResult2.quoteSuccessResult.quote.amountInUsd).minus(
            new Big(quoteResult2.quoteSuccessResult.quote.amountOutUsd)
          )
        );

        const { amountOutFormatted } = quoteResult2.quoteSuccessResult.quote;
        setEstReceiveUsdt(amountOutFormatted ?? "0");
        setWithdrawBridgeFee(bridgeFee.toFixed());
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
    try {
      // Step1: get usdt amount from bsc chain to near chain for usdt token
      const quoteResult1 = await intentsQuotationUi({
        chain: "evm",
        symbol: "USDT",
        selectedEvmChain: "BSC",
        amount: parseAmount(supplyAmount, BSC_USDT_DECIMALS),
        refundTo: bscAccountId,
        recipient: LSD_CONTRACT_ID,
        outChainToNearChain: true,
      });

      if (
        quoteResult1?.quoteStatus !== "success" ||
        !quoteResult1?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult1?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }
      const { amountOut, minAmountOut } = quoteResult1.quoteSuccessResult.quote;

      // Step2: calculate lsd amount from usdt amount
      const lsdAmount = await calculateLsdFromUsdt(
        formatAmount(minAmountOut, NEAR_USDT_DECIMALS)
      );

      // Step3: get deposit address from near chain to bsc chain for lsd token
      const quoteResult2 = await intentsQuotationUi({
        chain: "evm",
        symbol: "NRUSDT",
        selectedEvmChain: "BSC",
        amount: lsdAmount,
        refundTo: LSD_CONTRACT_ID,
        recipient: bscAccountId,
        outChainToNearChain: false,
      });
      if (
        quoteResult2?.quoteStatus !== "success" ||
        !quoteResult2?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult2?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }
      const { depositAddress: depositAddress2 } =
        quoteResult2.quoteSuccessResult.quote;

      // Step4: get deposit address from bsc chain to near chain for usdt token
      const quoteResult3 = await intentsQuotationUi({
        chain: "evm",
        symbol: "USDT",
        selectedEvmChain: "BSC",
        amount: parseAmount(supplyAmount, BSC_USDT_DECIMALS),
        refundTo: bscAccountId,
        recipient: LSD_CONTRACT_ID,
        outChainToNearChain: true,
        customRecipientMsg: depositAddress2,
      });
      if (
        quoteResult3?.quoteStatus !== "success" ||
        !quoteResult3?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult3?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }

      // Step5: transfer usdt from bsc chain to near chain for usdt token
      const { depositAddress: depositAddress, amountIn } =
        quoteResult3.quoteSuccessResult.quote;

      const txHash = await transfer_evm({
        tokenAddress: BSC_USDT_ADDRESS,
        depositAddress: depositAddress,
        chain: "bsc",
        amount: amountIn,
      });

      // Step6: Poll transaction status
      const { status } = await pollingTransactionStatus(depositAddress);

      if (status === "success") {
        console.log("Supply transaction completed successfully");
        // Refresh balances
        await fetchBalances();
      } else {
        throw new Error(`Transaction status: ${status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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

    try {
      console.log("Start Withdraw Process", { amount: costAmount });
      // Step1: get lsd amount from bsc chain to near chain for lsd token
      const lsdAmount = parseAmount(costAmount, LSD_USDT_DECIMALS);
      const quoteResult1 = await intentsQuotationUi({
        chain: "evm",
        symbol: "NRUSDT",
        selectedEvmChain: "BSC",
        amount: lsdAmount,
        refundTo: bscAccountId,
        recipient: LSD_CONTRACT_ID,
        outChainToNearChain: true,
      });

      if (
        quoteResult1?.quoteStatus !== "success" ||
        !quoteResult1?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult1?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }
      // Step2: get usdt amount from near chain to bsc chain for usdt token
      const { amountOut, minAmountOut } = quoteResult1.quoteSuccessResult.quote;
      const usdtAmount = await calculateUsdtFromLsd(
        formatAmount(minAmountOut, LSD_USDT_DECIMALS)
      );

      // Step3: Get Intents deposit address (NEAR USDT -> BSC USDT)
      const quoteResult2 = await intentsQuotationUi({
        chain: "evm",
        symbol: "USDT",
        selectedEvmChain: "BSC",
        amount: usdtAmount,
        refundTo: LSD_CONTRACT_ID,
        recipient: bscAccountId,
        outChainToNearChain: false,
      });

      if (
        quoteResult2?.quoteStatus !== "success" ||
        !quoteResult2?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult2?.message || "Failed to get Intents quote for withdraw";
        failToast({ failText: errorMessage });
        return;
      }

      const { depositAddress: depositAddress2 } =
        quoteResult2.quoteSuccessResult.quote;

      // Step3: get deposit address from bsc chain to near chain for usdt token
      const quoteResult3 = await intentsQuotationUi({
        chain: "evm",
        symbol: "NRUSDT",
        selectedEvmChain: "BSC",
        amount: lsdAmount,
        refundTo: bscAccountId,
        recipient: LSD_CONTRACT_ID,
        outChainToNearChain: true,
        customRecipientMsg: depositAddress2,
      });

      if (
        quoteResult3?.quoteStatus !== "success" ||
        !quoteResult3?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult3?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }
      // Step4: transfer usdt from bsc chain to near chain for usdt token
      const { depositAddress, amountIn } =
        quoteResult3.quoteSuccessResult.quote;

      const txHash = await transfer_evm({
        tokenAddress: BSC_LSD_USDT_ADDRESS,
        depositAddress: depositAddress,
        chain: "bsc",
        amount: amountIn,
      });

      // Step5: Poll Intents status
      const { status } = await pollingTransactionStatus(depositAddress);

      if (status === "success") {
        console.log("Withdraw transaction completed successfully");
        await fetchBalances();
      } else {
        throw new Error(`Intents transaction status: ${status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Withdraw failed:", error);
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default LSDPage;
