import { useState, useMemo, useEffect } from "react";
import _ from "lodash";
import Decimal from "decimal.js";
import { toggleUseAsCollateral, hideModal } from "@/redux/slice/appSlice";
import { repay } from "@/services/lending/actions/repay";
import { repayFromDeposits } from "@/services/lending/actions/repayFromDeposits";
import { supply } from "@/services/lending/actions/supply";
import { borrow } from "@/services/lending/actions/borrow";
import { withdraw } from "@/services/lending/actions/withdraw";
import { adjustCollateral } from "@/services/lending/actions/adjustCollateral";
import { useAppSelector, useAppDispatch } from "@/hooks/lending/useRedux";
import {
  getSelectedValues,
  getAssetData,
} from "@/redux/selectors/appSelectors";
import { useDegenMode, useAccountId } from "@/hooks/lending/hooks";
import { SubmitButton } from "./components";
import { ConnectToChainBtn } from "@/components/common/Button";
import { shrinkTokenDecimal } from "@/utils/numbers";
import transactionToast from "@/components/common/toast/transactionToast";
import { TokenAction } from "@/redux/slice/appSlice";
import { useFetchData } from "@/hooks/lending/useFetchData";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import {
  useChainAccountInstantStore,
  useChainAccountStore,
} from "@/stores/chainAccount";
import { expandTokenDecimal } from "@/utils/numbers";
import { decimalMax, decimalMin } from "@/utils/lendingUtil";
import { useConfig } from "@/hooks/lending/hooks";
import {
  pollingTransactionStatus,
  config_near,
  format_wallet,
  postMultichainLendingReport,
  computeWithdrawMaxAmount,
} from "@rhea-finance/cross-chain-sdk";
import type { IGasData, IStatus } from "@rhea-finance/cross-chain-sdk";
import { useUpdateTokenChainBalance } from "@/hooks/useChainsLendingBalance";
import useChainsLendingStatus, {
  useSelectedChainStatus,
} from "@/hooks/useChainsLendingStatus";
import { IFeeData } from "@/interface/lending";
import useFetchMcaAndWallets from "@/hooks/useFetchMcaAndWallets";
import {
  getChainTokenMetadataBySymbol,
  getJumpExporeUrl,
} from "@/utils/chainsUtil";
import { Alert } from "./utils";
import { Alerts } from "./components";
import { Icon } from "@iconify/react/dist/iconify.js";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";
import { useSelectedChainAccountId } from "@/hooks/useChainsLendingStatus";
import { getDebtAmountOfToken } from "@/utils/lendingBusinessUtil";
import { useConnectedChainData } from "@/hooks/useChainsLendingStatus";
import useIntentsQuoteAction from "@/hooks/useIntentsQuoteAction";

export default function Action({
  healthFactor,
  isDisabled,
  disabledText,
  available,
  gasData,
  setIntensQuoteAmount,
  tokenRegisterQueryLoading,
  setIntentsFeeUsd,
  alerts,
  feeData,
  maxRepayAmountFromWalletLoading,
}: {
  healthFactor: number;
  isDisabled: boolean;
  disabledText?: string;
  available: string | number;
  gasData: IGasData;
  setIntensQuoteAmount: (v: string | number) => void;
  tokenRegisterQueryLoading: boolean;
  setIntentsFeeUsd: (v: string | number) => void;
  alerts: Alert;
  feeData: IFeeData;
  maxRepayAmountFromWalletLoading: boolean;
}) {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [intentsQuoteErrorMesssage, setIntentsQuoteErrorMesssage] =
    useState("");
  const { amount, useAsCollateral, isMax } = useAppSelector(getSelectedValues);
  const dispatch = useAppDispatch();
  const lendingConfig = useConfig();
  const asset = useAppSelector(getAssetData);
  const assets = useAppSelector(getAssets);
  const { isRepayFromDeposits } = useDegenMode();
  const { fetchData } = useFetchData();
  const accountId = useAccountId();
  const chainAccountStore = useChainAccountStore();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const { updateSimgleTokenChainBalance } = useUpdateTokenChainBalance();
  const { fetchMcaAndWallets } = useFetchMcaAndWallets();
  const connectedChainData = useConnectedChainData();
  const {
    chain: defaultConnectedChain,
    subChain: defaultConnectedSubChain,
    identityKey: defaultConnectedIdentityKey,
    accountId: defaultConnectedAccountId,
  } = connectedChainData || {};
  const {
    action = "Deposit",
    tokenId,
    portfolio: portfolio_origin,
    canUseAsCollateral,
    extraDecimals = 0,
    decimals = 0,
    symbol,
  } = asset;
  const portfolio = gasData?.portfolioMinusGas || portfolio_origin;
  const { getSymbolBalanceOfSelectedChain } = useSelectedChainStatus();
  const mca = chainAccountStore.getMca();
  const actionChainSeleced = chainAccountInstantStore.getActionChainSeleced();
  const { chain, subChain } = actionChainSeleced || {};
  const { relayer_near_gas_fee_amount } = useRelayerConfigGasFee();
  const tokenOnChainMetadata = getChainTokenMetadataBySymbol({
    symbol,
    chain,
    subChain,
  });
  const chainDecimal = tokenOnChainMetadata?.decimal || 0;
  const disDecimal = Decimal.max(
    new Decimal(chainDecimal).minus(decimals || 0).toNumber(),
    0
  ).toNumber();
  // simple withdraw data
  const simpleWithdrawData = gasData ? gasData.simpleWithdrawData : null;
  // expand amount token decimals on near
  const expandedAmount = new Decimal(
    expandTokenDecimal(amount || 0, decimals || 0).toFixed(
      0,
      Decimal.ROUND_DOWN
    )
  );
  // expand amount token decimals on chain
  const expandedAmountChain = new Decimal(
    expandTokenDecimal(amount || 0, chainDecimal || 0).toFixed(
      0,
      Decimal.ROUND_DOWN
    )
  );
  // expand amount burrow decimals on near
  const extraDecimalMultiplier = expandTokenDecimal(1, extraDecimals);
  const expandedAmountBurrow = expandedAmount.mul(extraDecimalMultiplier);
  // expand wallet balance token decimals on chain
  const selectedChainSymbolWalletBalance =
    getSymbolBalanceOfSelectedChain(symbol);
  const expandedChainWalletBalance = new Decimal(
    expandTokenDecimal(selectedChainSymbolWalletBalance, chainDecimal)
  ).toFixed(0, Decimal.ROUND_DOWN);
  const { getChansStatus } = useChainsLendingStatus();
  const { identityKey, selectedChainAccountId } = useSelectedChainAccountId({
    chain,
  });
  const actionDisabled = useMemo(() => {
    if (action === "Supply" && +amount > 0) return false;
    if (action !== "Adjust" && +amount <= 0) return true;
    if (
      action !== "Repay" &&
      parseFloat(healthFactor?.toFixed(2)) >= 0 &&
      parseFloat(healthFactor?.toFixed(2)) <= 100
    )
      return true;
    return false;
  }, [amount, healthFactor]);
  const {
    showConnectButton,
    showBindButton,
    showCreateButton,
    showChangeButton,
  } = getChansStatusForUi();
  useEffect(() => {
    if (!canUseAsCollateral) {
      dispatch(toggleUseAsCollateral({ useAsCollateral: false }));
    }
  }, [useAsCollateral]);

  // quote estimate start
  const requireBridgeAction =
    action !== "Adjust" && !(action == "Repay" && isRepayFromDeposits);
  useEffect(() => {
    if (
      requireBridgeAction &&
      new Decimal(amount || 0).gt(0) &&
      ((action !== "Supply" && !(isDisabled || actionDisabled)) ||
        action == "Supply")
    ) {
      setQuoteLoading(true);
    } else {
      setQuoteLoading(false);
    }
  }, [
    requireBridgeAction,
    amount,
    isRepayFromDeposits,
    chain,
    subChain,
    isDisabled,
    actionDisabled,
  ]);
  const { quoteTokenAmount, quoteRecipient } = getQuoteRequiredMessage();
  const {
    intensQuoteAmount: _intensQuoteAmount,
    intentsQuoteErrorMesssage: _intentsQuoteErrorMesssage,
    intentsFeeUsd: _intentsFeeUsd,
    done: _quoteDone,
    tag: _quoteTag,
  } = useIntentsQuoteAction({
    action,
    actionDisabled,
    isDisabled,
    amount,
    expandedChainWalletBalance,
    chain,
    subChain,
    identityKey,
    selectedChainAccountId,
    mca,
    isRepayFromDeposits,
    symbol,
    tokenAmount: quoteTokenAmount,
    recipient: quoteRecipient,
  });
  useEffect(() => {
    if (_quoteDone && new Decimal(amount || 0).gt(0)) {
      const [_action, _amount, _chain, _subChain] = (_quoteTag || "")?.split(
        "@"
      );
      let chainVerify;
      if (_chain == "evm") {
        chainVerify = _subChain == subChain;
      } else {
        chainVerify = _chain == chain;
      }
      if (_action == action && _amount == amount && chainVerify) {
        setIntentsQuoteErrorMesssage(_intentsQuoteErrorMesssage);
        setIntensQuoteAmount(_intensQuoteAmount);
        setIntentsFeeUsd(_intentsFeeUsd);
        setQuoteLoading(false);
      }
    }
  }, [
    _quoteDone,
    _quoteTag,
    _intentsQuoteErrorMesssage,
    _intensQuoteAmount,
    _intentsFeeUsd,
    action,
    amount,
    chain,
    subChain,
  ]);
  // quote estimate end
  function getQuoteRequiredMessage() {
    let quoteTokenAmount;
    let quoteRecipient;
    if (action == "Supply") {
      const { _amountTokenQuote, _recipient } = getSupplyData();
      quoteTokenAmount = _amountTokenQuote;
      quoteRecipient = _recipient;
    } else if (action == "Repay" && !isRepayFromDeposits) {
      const { _amountToken, _recipient } = getRepayData();
      quoteTokenAmount = _amountToken;
      quoteRecipient = _recipient;
    } else if (action == "Withdraw") {
      const { _amountToken } = getWithdrawData();
      quoteTokenAmount = _amountToken;
    } else if (action == "Borrow") {
      const { _amountToken } = getBorrowData();
      quoteTokenAmount = _amountToken;
    }
    return {
      quoteTokenAmount,
      quoteRecipient,
    };
  }
  function getChansStatusForUi() {
    const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
    if (chain == "evm") {
      return evmStatus;
    } else if (chain == "solana") {
      return solanaStatus;
    } else if (chain == "btc") {
      return btcStatus;
    }
    return {
      showConnectButton: false,
      showBindButton: false,
      showCreateButton: false,
      showChangeButton: false,
    };
  }
  async function handleIntentResult({
    status,
    message,
    depositAddress,
    tx_hash,
  }: {
    status: IStatus;
    message?: string;
    tx_hash?: string;
    depositAddress?: string;
  }) {
    const baseData = {
      action,
      accountId: selectedChainAccountId,
      token: {
        icon: asset?.icon,
        symbol: asset?.symbol,
      },
      chain: subChain ? subChain : chain,
      amount,
      noAutoClose: true,
    };
    const isSupplyAndRepay =
      action == "Supply" || (action == "Repay" && !isRepayFromDeposits);
    if (status == "success") {
      transactionToast({
        ...baseData,
        status: "pending",
        txHash: isSupplyAndRepay ? tx_hash : "",
      });
      dispatch(hideModal());
      const { status: bridge_status, swapDetails } =
        await pollingTransactionStatus(depositAddress);
      const _tx_hash_display = isSupplyAndRepay
        ? tx_hash
        : swapDetails?.destinationChainTxHashes?.pop()?.hash;
      transactionToast({
        ...baseData,
        status: bridge_status == "success" ? "success" : "error",
        txHash: _tx_hash_display,
        errorMessage: bridge_status == "failed" ? "" : "",
        noAutoClose: false,
      });
      // post data for history
      const exploreUrlHistory = getJumpExporeUrl({
        chain,
        subChain,
        txHash: _tx_hash_display,
      });
      postMultichainLendingReport({
        mca_id: mca,
        wallet: JSON.stringify(format_wallet({ chain, identityKey })),
        request_hash: _tx_hash_display,
        page_display_data: JSON.stringify({
          action,
          symbol,
          amount,
          fee: feeData,
          exploreUrl: exploreUrlHistory,
          accountId: selectedChainAccountId,
        }),
      });
    } else if (status == "error") {
      transactionToast({
        ...baseData,
        status: "error",
        errorMessage: message,
        txHash: isSupplyAndRepay ? tx_hash : "",
      });
      dispatch(hideModal());
    }
    updateSimgleTokenChainBalance({ chain, subChain, symbol });
    if (showCreateButton) {
      await fetchMcaAndWallets({ chain, identityKey });
    }
  }
  function handleInnerResult({
    status,
    message,
    relayerTxhash,
  }: {
    status: IStatus;
    message?: string;
    relayerTxhash?: string;
  }) {
    const baseData = {
      action:
        action == "Repay"
          ? "Repay_from_supply"
          : (action as TokenAction | "Repay_from_supply"),
      accountId: selectedChainAccountId || defaultConnectedAccountId,
      token: {
        icon: asset?.icon,
        symbol: asset?.symbol,
      },
      chain: selectedChainAccountId
        ? subChain
          ? subChain
          : chain
        : defaultConnectedSubChain
        ? defaultConnectedSubChain
        : defaultConnectedChain,
      amount,
      noAutoClose: false,
    };
    if (status == "success") {
      transactionToast({
        ...baseData,
        status: "success",
        txHash: relayerTxhash,
      });
      dispatch(hideModal());
    } else if (status == "error") {
      transactionToast({
        ...baseData,
        status: "error",
        txHash: relayerTxhash,
        errorMessage: message,
        noAutoClose: true,
      });
      dispatch(hideModal());
    }
  }
  function getSupplyData() {
    const amount = decimalMin(
      expandedAmountChain,
      expandedChainWalletBalance
    ).toFixed(0, Decimal.ROUND_DOWN);
    const recipient = showCreateButton ? config_near.AM_CONTRACT : mca;
    return {
      _amountTokenQuote: expandedAmountChain.toFixed(),
      _amountToken: amount,
      _recipient: recipient,
    };
  }
  function getRepayData() {
    const { borrowedTokenBalance: _tokenBorrowedBalance } =
      getDebtAmountOfToken({
        portfolio,
        assets,
        tokenId,
      });
    const tokenBorrowedBalance = new Decimal(_tokenBorrowedBalance || 0);
    if (isRepayFromDeposits) {
      const _expandedAmount = isMax ? tokenBorrowedBalance : expandedAmount;
      const _expandedAmountBurrow = _expandedAmount.mul(extraDecimalMultiplier);
      const suppliedBalance = new Decimal(
        portfolio?.supplied[tokenId]?.balance || 0
      );
      const collateralBalance = new Decimal(
        portfolio?.collateral[tokenId]?.balance || 0
      );
      // decrease amount
      const _decreaseCollateralAmount = decimalMin(
        decimalMax(_expandedAmountBurrow.sub(suppliedBalance), 0),
        collateralBalance
      );
      // contract decimals
      const treatAsMax =
        isMax || new Decimal(_expandedAmount).gte(tokenBorrowedBalance);
      const _amount = treatAsMax
        ? undefined
        : _expandedAmountBurrow.toFixed(0, Decimal.ROUND_DOWN);
      return {
        _decreaseCollateralAmount,
        _amount,
      };
    } else {
      const _amount = decimalMin(
        expandedAmountChain,
        expandedChainWalletBalance
      ).toFixed(0, Decimal.ROUND_DOWN);
      return {
        _amountToken: _amount,
        _recipient: mca,
      };
    }
  }
  function getBorrowData() {
    const amountBurrow = expandedAmountBurrow.toFixed(0, Decimal.ROUND_DOWN);
    const amountToken = expandedAmount.toFixed(0, Decimal.ROUND_DOWN);

    const _amountToken = new Decimal(amountToken).minus(1).toFixed();
    return {
      _amountBurrow: amountBurrow,
      _amountToken,
    };
  }
  function getWithdrawData() {
    const suppliedBalance = new Decimal(
      portfolio?.supplied[tokenId]?.balance || 0
    );
    const hasBorrow = portfolio?.borrows?.length > 0;
    const { maxAmount, canWithdrawAll } = computeWithdrawMaxAmount({
      tokenId,
      assets: assets.data,
      portfolio,
    });
    const _expandedAmount = isMax
      ? decimalMin(
          maxAmount,
          expandTokenDecimal(available, decimals + extraDecimals)
        )
      : decimalMin(
          maxAmount,
          expandTokenDecimal(amount, decimals + extraDecimals)
        );
    const decreaseCollateralAmount = decimalMax(
      _expandedAmount.sub(suppliedBalance),
      0
    );
    const _decreaseCollateralAmount =
      (!hasBorrow || canWithdrawAll) && isMax
        ? undefined
        : decreaseCollateralAmount.toFixed(0);

    const _amount = isMax
      ? undefined
      : _expandedAmount.toFixed(0, Decimal.ROUND_DOWN);

    const amountToken = shrinkTokenDecimal(
      _expandedAmount.toFixed(),
      extraDecimals
    ).toFixed(0, Decimal.ROUND_DOWN);

    const _amountToken = new Decimal(amountToken).minus(1).toFixed();
    return {
      _amount,
      _amountToken,
      _decreaseCollateralAmount,
      decreaseCollateralAmount,
    };
  }
  const handleActionButtonClick = async () => {
    setActionLoading(true);
    const page_display_data = JSON.stringify({
      action,
      symbol,
      amount,
      fee: feeData,
      accountId: selectedChainAccountId || defaultConnectedAccountId,
    });
    switch (action) {
      case "Supply": {
        const { _amountToken } = getSupplyData();
        const { status, message, depositAddress, tx_hash } = await supply({
          symbol,
          useAsCollateral,
          amount: _amountToken,
          mca,
          chain,
          identityKey,
          outChainAccountId: selectedChainAccountId,
          selectedEvmChain: subChain,
          create: showCreateButton,
        });
        await handleIntentResult({ status, message, depositAddress, tx_hash });
        break;
      }
      case "Borrow": {
        const { _amountToken, _amountBurrow } = getBorrowData();
        const { status, message, depositAddress } = await borrow({
          tokenId,
          amountBurrow: _amountBurrow,
          amountToken: _amountToken,
          config: lendingConfig,
          mca,
          chain,
          identityKey,
          symbol,
          outChainAccountId: selectedChainAccountId,
          selectedEvmChain: subChain,
          simpleWithdrawData,
          page_display_data: "",
        });
        await handleIntentResult({
          status,
          message,
          depositAddress,
        });
        break;
      }
      case "Withdraw": {
        const {
          _amount,
          _amountToken,
          _decreaseCollateralAmount,
          decreaseCollateralAmount,
        } = getWithdrawData();
        const { status, message, depositAddress } = await withdraw({
          tokenId,
          amountBurrow: _amount,
          amountToken: _amountToken,
          decreaseCollateralAmount: _decreaseCollateralAmount,
          isDecrease: decreaseCollateralAmount.gt(0),
          mca,
          chain,
          identityKey,
          config: lendingConfig,
          symbol,
          outChainAccountId: selectedChainAccountId,
          selectedEvmChain: subChain,
          simpleWithdrawData,
          page_display_data: "",
        });
        await handleIntentResult({
          status,
          message,
          depositAddress,
        });
        break;
      }
      case "Repay": {
        const repayData = getRepayData();
        if (isRepayFromDeposits) {
          const { _amount, _decreaseCollateralAmount } = repayData;
          const { status, message, tx_hash } = await repayFromDeposits({
            tokenId,
            amountBurrow: _amount,
            decreaseAmountBurrow: _decreaseCollateralAmount.toFixed(0),
            config: lendingConfig,
            mca,
            chain,
            identityKey,
            simpleWithdrawData,
            page_display_data,
          });
          handleInnerResult({ status, message, relayerTxhash: tx_hash });
        } else {
          const { _amountToken } = repayData;
          const { status, message, depositAddress, tx_hash } = await repay({
            symbol,
            amount: _amountToken,
            mca,
            chain,
            identityKey,
            outChainAccountId: selectedChainAccountId,
            selectedEvmChain: subChain,
          });
          await handleIntentResult({
            status,
            message,
            depositAddress,
            tx_hash,
          });
        }
        break;
      }
      case "Adjust": {
        const suppliedBalance = new Decimal(
          portfolio?.supplied[tokenId]?.balance || 0
        );
        const collateralBalance = new Decimal(
          portfolio?.collateral[tokenId]?.balance || 0
        );
        const totalBalance = suppliedBalance.add(collateralBalance);
        // expected collateral amount
        const _expandedAmount = isMax
          ? totalBalance
          : decimalMin(
              totalBalance,
              expandTokenDecimal(amount, decimals + extraDecimals)
            );
        const isIncreaseCollateral = _expandedAmount.gt(collateralBalance);
        const isDecreaseCollateral = _expandedAmount.lt(collateralBalance);
        const { status, message, tx_hash } = await adjustCollateral({
          tokenId,
          increaseAmountBurrow: !isMax
            ? _expandedAmount.sub(collateralBalance).toFixed(0)
            : undefined,
          decreaseAmountBurrow: _expandedAmount.gt(0)
            ? collateralBalance.sub(_expandedAmount).toFixed(0)
            : undefined,
          config: lendingConfig,
          isIncreaseCollateral,
          isDecreaseCollateral,
          mca,
          chain: chain || defaultConnectedChain,
          identityKey: identityKey || defaultConnectedIdentityKey,
          simpleWithdrawData,
          page_display_data,
        });
        handleInnerResult({ status, message, relayerTxhash: tx_hash });
        break;
      }
      default:
        break;
    }
    // fetch lending data
    fetchData({
      accountId,
      tokenIds: [asset.tokenId],
    });
    // close modal
    dispatch(hideModal());
  };

  const maskUi =
    quoteLoading ||
    actionLoading ||
    tokenRegisterQueryLoading ||
    maxRepayAmountFromWalletLoading ? (
      <>
        <div className="absolute z-[2] left-0 right-0 top-0 bottom-0">
          <div className="absolute left-0 right-0 top-0 bottom-0 rounded-2xl bg-b-10/20" />
          <div className="flex flex-col items-center mt-[210px]">
            <Icon
              icon="svg-spinners:gooey-balls-1"
              className="text-b-10/10 text-[50px] z-[10]"
            />
            <span className="border border-gray-30 bg-gray-80 text-gray-50 rounded-full py-1 px-2 text-xs">
              {actionLoading
                ? "Process transaction..."
                : "Quote Calculating..."}
            </span>
          </div>
        </div>
      </>
    ) : null;
  if (showConnectButton) {
    return (
      <>
        <ConnectToChainBtn />
        {maskUi}
      </>
    );
  } else if (showChangeButton) {
    return (
      <>
        <ConnectToChainBtn text="Change Wallet" />
        {maskUi}
      </>
    );
  } else if (showBindButton && !(action == "Supply" && showCreateButton)) {
    return (
      <>
        <ConnectToChainBtn text={`${showBindButton ? "Connect Wallet" : ""}`} />
        {maskUi}
      </>
    );
  }
  // max repay tip show priority
  if (alerts?.maxRepay) {
    if (intentsQuoteErrorMesssage || Object.keys(alerts || {}).length > 1) {
      delete alerts.maxRepay;
    }
  }
  return (
    <>
      {/* tip */}
      {intentsQuoteErrorMesssage ? (
        <div className="mb-2">
          <Alerts
            data={{
              quoteError: {
                title: `${intentsQuoteErrorMesssage}`,
                severity: "warning",
              },
            }}
          />
        </div>
      ) : null}
      <div className="my-4">
        {Object.entries(alerts || {}).length ? <Alerts data={alerts} /> : null}
      </div>
      {/* submit button */}
      <SubmitButton
        action={action}
        disabled={actionDisabled || isDisabled || intentsQuoteErrorMesssage}
        disabledText={disabledText}
        onClick={handleActionButtonClick}
      />
      {/* Background Mask */}
      {maskUi}
    </>
  );
}
