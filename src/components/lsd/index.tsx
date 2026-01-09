import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  formatLsdAmount,
  LSD_CONTRACT_ID,
  createLsdSupplyRecipientMsg,
  approveTokenForWormhole,
  bridgeTokenToNear,
} from "@/services/lsd";
import { intentsQuotationUi } from "@/services/lending/actions/commonAction";
import { transfer_evm } from "@/services/chains/evm";
import { pollingTransactionStatus } from "@rhea-finance/cross-chain-sdk";
import failToast from "@/components/common/toast/failToast";
import Big from "big.js";

const LSDPage = () => {
  const { evm } = useWalletConnect();
  const [supplyAmount, setSupplyAmount] = useState("0.0");
  const [withdrawAmount, setWithdrawAmount] = useState("0.0");
  const [estReceive, setEstReceive] = useState("0");
  const [estCost, setEstCost] = useState("0");
  const [estReceiveUsdt, setEstReceiveUsdt] = useState("0");
  const [supplyQuoteError, setSupplyQuoteError] = useState<string | null>(null);
  const [isSupplyQuoteLoading, setIsSupplyQuoteLoading] = useState(false);
  const [supplyQuoteResult, setSupplyQuoteResult] = useState<string | null>(
    null
  );
  const [withdrawQuoteError, setWithdrawQuoteError] = useState<string | null>(
    null
  );
  const [isWithdrawQuoteLoading, setIsWithdrawQuoteLoading] = useState(false);
  const [bscUsdtBalance, setBscUsdtBalance] = useState("0");
  const [bscLsdUsdtBalance, setBscLsdUsdtBalance] = useState("0");
  const [isSupplying, setIsSupplying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const bscAccountId = evm.accountId;

  // Calculate withdraw amount with buffer (0.9999 for fees) in raw format
  const withdrawAmountWithBufferRaw = useMemo(() => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      return "0";
    }
    return parseAmount(
      new Big(withdrawAmount || 0).mul(0.9999).toFixed(),
      NEAR_USDT_DECIMALS
    );
  }, [withdrawAmount]);

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
      setSupplyQuoteResult(null);
      setSupplyQuoteError(null);
      setIsSupplyQuoteLoading(false);
      return;
    }

    const tryQuote = async () => {
      try {
        setIsSupplyQuoteLoading(true);
        setSupplyQuoteError(null);
        const customRecipientMsg = await createLsdSupplyRecipientMsg(
          bscAccountId
        );
        const quoteResult = await intentsQuotationUi({
          chain: "evm",
          symbol: "USDT",
          selectedEvmChain: "BSC",
          amount: parseAmount(supplyAmount, BSC_USDT_DECIMALS),
          refundTo: bscAccountId,
          recipient: LSD_CONTRACT_ID,
          outChainToNearChain: true,
          customRecipientMsg,
        });

        if (
          quoteResult?.quoteStatus !== "success" ||
          !quoteResult?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult?.message || "Failed to get Intents quote for supply";
          setSupplyQuoteError(errorMessage);
          setSupplyQuoteResult(null);
          return;
        }

        // Get amountOut from quote result
        const amountOutFormatted =
          quoteResult.quoteSuccessResult.quote.amountOutFormatted;
        if (amountOutFormatted) {
          setSupplyQuoteResult(new Big(amountOutFormatted).toFixed());
        } else {
          setSupplyQuoteResult(null);
        }
      } catch (error) {
        console.error("Failed to get supply quote:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get quote";
        setSupplyQuoteError(errorMessage);
        setSupplyQuoteResult(null);
      } finally {
        setIsSupplyQuoteLoading(false);
      }
    };

    // Add debounce to avoid too many requests
    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [supplyAmount, bscAccountId]);

  // Calculate estimated lsdUSDT for supply based on quote result
  useEffect(() => {
    if (!supplyQuoteResult || parseFloat(supplyQuoteResult) <= 0) {
      setEstReceive("0");
      return;
    }

    const calculateRequired = async () => {
      try {
        const lsdAmount = await calculateLsdFromUsdt(supplyQuoteResult);
        setEstReceive(formatLsdAmount(lsdAmount));
      } catch (error) {
        console.error("Failed to calculate estimated lsd:", error);
        setEstReceive("0");
      }
    };

    calculateRequired();
  }, [supplyQuoteResult]);

  // Calculate required lsdUSDT for withdraw
  useEffect(() => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setEstCost("0");
      return;
    }

    const calculateRequired = async () => {
      try {
        const lsdAmount = await calculateLsdFromUsdt(withdrawAmount);
        setEstCost(formatLsdAmount(lsdAmount));
      } catch (error) {
        console.error("Failed to calculate required lsd:", error);
        setEstCost("0");
      }
    };

    calculateRequired();
  }, [withdrawAmount]);

  // Try to get Intents quote for withdraw amount
  useEffect(() => {
    if (!bscAccountId || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setEstReceiveUsdt("0");
      setWithdrawQuoteError(null);
      setIsWithdrawQuoteLoading(false);
      return;
    }

    const tryQuote = async () => {
      try {
        setIsWithdrawQuoteLoading(true);
        setWithdrawQuoteError(null);
        const quoteResult = await intentsQuotationUi({
          chain: "evm",
          symbol: "USDT",
          selectedEvmChain: "BSC",
          amount: withdrawAmountWithBufferRaw,
          refundTo: LSD_CONTRACT_ID,
          recipient: bscAccountId,
          outChainToNearChain: false,
        });

        if (
          quoteResult?.quoteStatus !== "success" ||
          !quoteResult?.quoteSuccessResult?.quote
        ) {
          const errorMessage =
            quoteResult?.message || "Failed to get Intents quote for withdraw";
          setWithdrawQuoteError(errorMessage);
          setEstReceiveUsdt("0");
          return;
        }

        // Get amountOut from quote result
        const amountOutFormatted =
          quoteResult.quoteSuccessResult.quote.amountOutFormatted;
        if (amountOutFormatted) {
          setEstReceiveUsdt(new Big(amountOutFormatted).toFixed());
        } else {
          setEstReceiveUsdt("0");
        }
      } catch (error) {
        console.error("Failed to get withdraw quote:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get quote";
        setWithdrawQuoteError(errorMessage);
        setEstReceiveUsdt("0");
      } finally {
        setIsWithdrawQuoteLoading(false);
      }
    };

    // Add debounce to avoid too many requests
    const timeoutId = setTimeout(tryQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [withdrawAmountWithBufferRaw, bscAccountId]);

  // Handle Supply USDT
  const handleSupply = async () => {
    if (!bscAccountId || !supplyAmount || parseFloat(supplyAmount) <= 0) {
      return;
    }

    setIsSupplying(true);

    try {
      console.log("Start Supply Process", { amount: supplyAmount });

      // Step 1: Create custom recipient message
      const customRecipientMsg = await createLsdSupplyRecipientMsg(
        bscAccountId
      );
      console.log("Custom recipient message created");

      // Step 2: Get Intents quotation
      const quoteResult = await intentsQuotationUi({
        chain: "evm",
        symbol: "USDT",
        selectedEvmChain: "BSC",
        amount: parseAmount(supplyAmount, BSC_USDT_DECIMALS),
        refundTo: bscAccountId,
        recipient: LSD_CONTRACT_ID,
        outChainToNearChain: true,
        customRecipientMsg,
      });

      if (
        quoteResult?.quoteStatus !== "success" ||
        !quoteResult?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult?.message || "Failed to get Intents quote";
        failToast({ failText: errorMessage });
        return;
      }

      const { depositAddress, amountIn } = quoteResult.quoteSuccessResult.quote;
      console.log("Intents Quote Received", {
        depositAddress,
        amountIn,
      });

      // Step 3: Execute transfer
      const txHash = await transfer_evm({
        tokenAddress: BSC_USDT_ADDRESS,
        depositAddress,
        chain: "bsc",
        amount: amountIn,
      });

      console.log("Intents Transfer Completed", { txHash });

      // Step 4: Poll transaction status
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

  // Handle Withdraw USDT
  const handleWithdraw = async () => {
    if (!bscAccountId || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      return;
    }

    setIsWithdrawing(true);

    try {
      console.log("Start Withdraw Process", { amount: withdrawAmount });

      // Step 1: Calculate lsdUSDT amount
      const lsdAmount = await calculateLsdFromUsdt(withdrawAmount);
      console.log("Calculated lsdUSDT Amount", {
        usdtAmount: withdrawAmount,
        lsdAmount: formatLsdAmount(lsdAmount),
      });

      // Step 2: Get Intents deposit address (NEAR USDT -> BSC USDT)
      const quoteResult = await intentsQuotationUi({
        chain: "evm",
        symbol: "USDT",
        selectedEvmChain: "BSC",
        amount: withdrawAmountWithBufferRaw,
        refundTo: LSD_CONTRACT_ID,
        recipient: bscAccountId,
        outChainToNearChain: false,
      });

      if (
        quoteResult?.quoteStatus !== "success" ||
        !quoteResult?.quoteSuccessResult?.quote
      ) {
        const errorMessage =
          quoteResult?.message || "Failed to get Intents quote for withdraw";
        failToast({ failText: errorMessage });
        return;
      }

      const { depositAddress } = quoteResult.quoteSuccessResult.quote;
      console.log("Intents Deposit Address", {
        depositAddress,
      });

      // Step 3: Ensure wallet provider is ready
      if (!window.ethWeb3Provider) {
        throw new Error("Wallet not connected, please connect BSC wallet");
      }
      // Step 4: Approve lsdUSDT for Wormhole bridge
      const signer = await window.ethWeb3Provider.getSigner();
      await approveTokenForWormhole(
        signer,
        BSC_LSD_USDT_ADDRESS,
        formatLsdAmount(lsdAmount),
        LSD_USDT_DECIMALS
      );

      // Step 5: Construct Wormhole payload
      const payload = depositAddress;
      console.log("Wormhole payload", { payload });

      // Step 6: Bridge lsdUSDT to NEAR
      await bridgeTokenToNear(
        signer,
        BSC_LSD_USDT_ADDRESS,
        formatLsdAmount(lsdAmount),
        LSD_USDT_DECIMALS,
        payload
      );

      // Step 7: Poll Intents status
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
              <label className="block text-sm text-gray-50 mb-2">Amount</label>
              <input
                type="text"
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
                className="w-full bg-gray-80 border border-gray-30 rounded-lg px-4 py-3 text-black placeholder-gray-200 focus:outline-none focus:border-green-10"
                placeholder="0.0"
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
                  estReceive
                )}
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
          <h2 className="text-lg font-semibold mb-4 text-left">
            Withdraw USDT
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-50 mb-2">Amount</label>
              <input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full bg-gray-80 border border-gray-30 rounded-lg px-4 py-3 text-black placeholder-gray-200 focus:outline-none focus:border-purple-500"
                placeholder="0.0"
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
              <span className="text-gray-50">Est. Cost lsdUSDT</span>
              <span className="text-black font-medium">{estCost}</span>
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
