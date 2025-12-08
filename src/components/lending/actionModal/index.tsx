import React, { useState, useEffect, useMemo } from "react";
import { useDebounce } from "react-use";
import { updateAmount } from "@/redux/slice/appSlice";
import _ from "lodash";
import Decimal from "decimal.js";
import { DefaultModal } from "@/components/common/modal";
import { useAppDispatch, useAppSelector } from "@/hooks/lending/useRedux";
import {
  getModalStatus,
  getAssetData,
  getSelectedValues,
} from "@/redux/selectors/appSelectors";
import { DEFAULT_POSITION } from "@/services/constantConfig";
import {
  getAccountId,
  getAccountPortfolio,
} from "@/redux/selectors/accountSelectors";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { useDegenMode } from "@/hooks/lending/hooks";
import { getRepayPositions } from "@/redux/selectors/getRepayPositions";
import { useChainAccountInstantStore } from "@/stores/chainAccount";
import { fetchTokenBalances } from "@/redux/slice/accountSlice";
import { formatSymbolName } from "@/utils/chainsUtil";
import { getModalData } from "./utils";
import { hideModal } from "@/redux/slice/appSlice";
import Action from "./Action";
import ChainsSelector from "./chainsSelector";
import { ASSETS_CHAINS_SUPPORT_UI } from "@/services/chainConfig";
import { useUpdateTokenChainBalance } from "@/hooks/useChainsLendingBalance";
import {
  ModalTitle,
  RepayTab,
  HealthFactor,
  Rates,
  CollateralSwitch,
  CollateralTip,
  BorrowLimit,
  Receive,
  Fee,
  SetUpFeeSelector,
} from "./components";
import Controls from "./Controls";
import {
  view_on_near,
  config_near,
  computeRelayerGas,
  recomputeHealthFactorBorrow,
  recomputeHealthFactorRepay,
  recomputeHealthFactorRepayFromDeposits,
  recomputeHealthFactorSupply,
  recomputeHealthFactorWithdraw,
  recomputeHealthFactorAdjust,
  getWithdrawMaxAmount,
  getBorrowMaxAmount,
} from "@rhea-finance/cross-chain-sdk";
import { useChainAccountStore } from "@/stores/chainAccount";
import useChainsLendingStatus, {
  useSelectedChainStatus,
} from "@/hooks/useChainsLendingStatus";
import { shrinkToken } from "@/utils/numbers";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";
import { ICreateFeeToken } from "@/interface/lending/chains";
import { useSelectedChainAccountId } from "@/hooks/useChainsLendingStatus";
import {
  getDebtAmountOfToken,
  getAmountInByAmountOutQuotation,
} from "@/utils/lendingBusinessUtil";
import { TOKEN_STORAGE_DEPOSIT_READ } from "@/services/constantConfig";
import { getSlippageToleranceByAmountInUsd } from "@/utils/chainsUtil";
import { getChainTokenMetadataBySymbol } from "@/utils/chainsUtil";
const { WRAP_NEAR_CONTRACT_ID } = config_near;
export default function Modal() {
  const [intentsFeeUsd, setIntentsFeeUsd] = useState<string | number>("0");
  const [maxRepayAmountFromWallet, setMaxRepayAmountFromWallet] = useState<{
    amountToken: string | number;
    amountTokenRead: string | number;
  }>({
    amountToken: "0",
    amountTokenRead: "0",
  });
  const [maxRepayAmountFromWalletLoading, setMaxRepayAmountFromWalletLoading] =
    useState(true);
  const [tokenRegisterQueryLoading, setTokenRegisterQueryLoading] =
    useState<boolean>(true);
  const [intensQuoteAmount, setIntensQuoteAmount] = useState<string | number>(
    "0"
  );
  const [isTokenRegistered, setIsTokenRegistered] = useState<boolean>(false);
  const [selectedFeeTokenData, setSelectedFeeTokenData] =
    useState<ICreateFeeToken>();
  const [selectedCollateralType] = useState(DEFAULT_POSITION);
  const dispatch = useAppDispatch();
  const { getSymbolBalanceOfSelectedChain } = useSelectedChainStatus();
  const chainAccountStore = useChainAccountStore();
  const isOpen = useAppSelector(getModalStatus);
  const accountId = useAppSelector(getAccountId);
  const asset = useAppSelector(getAssetData);
  const assets = useAppSelector(getAssets);
  const { amount, isMax, useAsCollateral } = useAppSelector(getSelectedValues);
  const { isRepayFromDeposits } = useDegenMode();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const actionChainSeleced = chainAccountInstantStore.getActionChainSeleced();
  const { getChansStatus } = useChainsLendingStatus();
  const { relayerGasFees } = useRelayerConfigGasFee();
  const { chain, subChain } = actionChainSeleced || {};
  const { action = "Deposit", tokenId, symbol } = asset;
  const { showCreateButton } = getChainsStatusForUi();
  const { updateSimgleTokenChainBalance } = useUpdateTokenChainBalance();
  const mca = chainAccountStore.getMca();
  const isSupportAsset = useMemo(() => {
    const _symbol = formatSymbolName(symbol);
    if (!_symbol) return false;
    const target = ASSETS_CHAINS_SUPPORT_UI.find(
      (item) => item.symbol?.toLowerCase() == _symbol.toLowerCase()
    );
    return !!target;
  }, [ASSETS_CHAINS_SUPPORT_UI, symbol]);
  const repayPositions = useAppSelector(getRepayPositions(tokenId));
  const portfolio_origin = useAppSelector(getAccountPortfolio);

  /** near gas start */
  const requireBridgeAction =
    action !== "Adjust" && !(action == "Repay" && isRepayFromDeposits);
  const requireRelayerAction = !(
    action == "Supply" ||
    (action == "Repay" && !isRepayFromDeposits)
  );
  const fromNearToOutAction = action == "Withdraw" || action == "Borrow";
  useEffect(() => {
    if (mca && fromNearToOutAction && tokenId) {
      is_token_registered();
    } else {
      setTokenRegisterQueryLoading(false);
    }
  }, [fromNearToOutAction, tokenId, mca]);
  const { nearStorageAmount } = useMemo(() => {
    if (mca && requireRelayerAction && tokenId && !tokenRegisterQueryLoading) {
      return getCostNearOnAction();
    }
    return {
      nearStorageAmount: "0",
    };
  }, [
    requireRelayerAction,
    assets,
    tokenId,
    isTokenRegistered,
    fromNearToOutAction,
    tokenRegisterQueryLoading,
    mca,
  ]);
  const gasData = computeRelayerGas({
    nearStorageAmount,
    mca,
    relayerGasFees,
    assets: assets.data,
    portfolio: portfolio_origin,
  });
  /** near gas end */

  // get fee and receive amount
  const near_price = assets.data[WRAP_NEAR_CONTRACT_ID]?.price?.usd || 0;
  const { receiveAmount, setupFeeValue, bridgeFeeValue, relayerFeeValue } =
    useMemo(() => {
      if (showCreateButton) {
        const receive_amount = Decimal.max(
          new Decimal(intensQuoteAmount || 0).minus(
            selectedFeeTokenData?.actualAmountRead || 0
          ),
          0
        ).toFixed();
        const setup_amount = selectedFeeTokenData?.actualAmountRead || 0;
        const price = selectedFeeTokenData?.price || 0;
        return {
          receiveAmount: receive_amount,
          setupFeeValue: new Decimal(setup_amount).mul(price).toFixed(),
          bridgeFeeValue: intentsFeeUsd,
        };
      } else {
        const relayerFeeValue = gasData?.relayerFeeUsd;
        const receive_amount = Decimal.max(intensQuoteAmount || 0, 0).toFixed();
        return {
          receiveAmount: receive_amount,
          bridgeFeeValue: intentsFeeUsd,
          relayerFeeValue,
        };
      }
    }, [
      intensQuoteAmount,
      showCreateButton,
      selectedFeeTokenData,
      amount,
      intentsFeeUsd,
      gasData?.relayerFeeUsd,
      near_price,
    ]);
  const { healthFactor, maxBorrowValue: adjustedMaxBorrowValue } =
    action === "Withdraw"
      ? recomputeHealthFactorWithdraw({
          tokenId,
          amount: +amount,
          portfolio: gasData?.portfolioMinusGas,
          assets: assets.data,
        })
      : action === "Adjust"
      ? recomputeHealthFactorAdjust({
          tokenId,
          amount: +amount,
          portfolio: gasData?.portfolioMinusGas,
          assets: assets.data,
        })
      : action === "Supply"
      ? recomputeHealthFactorSupply({
          tokenId,
          amount: +receiveAmount,
          portfolio: portfolio_origin,
          assets: assets.data,
          useAsCollateral,
        })
      : action === "Repay" && isRepayFromDeposits
      ? recomputeHealthFactorRepayFromDeposits({
          tokenId,
          amount: +amount,
          portfolio: gasData?.portfolioMinusGas,
          assets: assets.data,
        })
      : action === "Repay" && !isRepayFromDeposits
      ? recomputeHealthFactorRepay({
          tokenId,
          amount: +receiveAmount,
          portfolio: portfolio_origin,
          assets: assets.data,
        })
      : recomputeHealthFactorBorrow({
          tokenId,
          amount: +amount,
          portfolio: gasData?.portfolioMinusGas,
          assets: assets.data,
        });
  const maxBorrowAmountPositions = getBorrowMaxAmount({
    tokenId,
    portfolio: gasData?.portfolioMinusGas,
    assets: assets.data,
  });
  const maxWithdrawAmount = !["Withdraw", "Adjust", "Repay"].includes(action)
    ? "0"
    : getWithdrawMaxAmount({
        tokenId,
        assets: assets.data,
        portfolio: gasData?.portfolioMinusGas,
      });
  const portfolio = gasData?.portfolioMinusGas || portfolio_origin;
  const activePosition = DEFAULT_POSITION;
  const { maxBorrowAmount = 0, maxBorrowValue = 0 } =
    maxBorrowAmountPositions[activePosition] || {};
  const repayAmount = repayPositions[selectedCollateralType];
  const selectedChainSymbolWalletBalance =
    getSymbolBalanceOfSelectedChain(symbol);
  const {
    available,
    rates,
    alerts,
    canUseAsCollateral,
    suppliedBalance,
    disabled,
  } = getModalData({
    ...asset,
    selectedChainSymbolWalletBalance,
    maxBorrowAmount,
    maxWithdrawAmount,
    isRepayFromDeposits,
    healthFactor,
    amount,
    borrowed: repayAmount,
    poolAsset: assets?.data?.[tokenId],
    portfolio,
    isMax,
  });

  /**
   * Verification tip
   * create mca when suppy
   */
  const { createMcaDisabled } = useMemo(() => {
    if (action == "Supply" && showCreateButton && _.isEmpty(alerts)) {
      {
        const _total_amount = selectedFeeTokenData?.totalFeeAmout || "0";
        const total_amount = shrinkToken(
          _total_amount,
          selectedFeeTokenData?.metadata?.decimals || 0
        );
        if (
          new Decimal(amount || 0).gt(0) &&
          new Decimal(total_amount).gt(amount || 0)
        ) {
          alerts.createMca = {
            title: `Creating a cross-chain account requires at least ${total_amount} ${asset?.symbol}`,
            severity: "warning",
          };
          return {
            createMcaDisabled: true,
          };
        }
      }
    }
    return {
      createMcaDisabled: false,
    };
  }, [
    alerts,
    action,
    showCreateButton,
    amount,
    selectedFeeTokenData?.tokenId,
    asset,
  ]);

  useEffect(() => {
    if (
      isOpen &&
      tokenId &&
      accountId &&
      (action == "Supply" || action == "Repay")
    ) {
      dispatch(
        fetchTokenBalances({
          tokenIds: [tokenId],
          accountId,
        })
      );
    }
  }, [isOpen, tokenId, accountId, action]);
  useEffect(() => {
    chainAccountInstantStore.setActionChainSeleced(null);
    setIntensQuoteAmount("0");
    setIntentsFeeUsd("0");
    if (!isOpen) {
      setMaxRepayAmountFromWallet({
        amountToken: "0",
        amountTokenRead: "0",
      });
    }
  }, [isOpen]);

  // update selected chain token balance when open modal
  useDebounce(
    () => {
      if (isOpen && chain && symbol && !requireRelayerAction) {
        updateSimgleTokenChainBalance({ chain, subChain, symbol });
      }
    },
    1000,
    [isOpen, chain, symbol, subChain, requireRelayerAction]
  );

  /** query repay amount start */
  useEffect(() => {
    if (isOpen && chain && action == "Repay") {
      dispatch(
        updateAmount({
          isMax: false,
          amount: "0",
        })
      );
    }
  }, [chain, subChain, isOpen, action]);
  const { selectedChainAccountId } = useSelectedChainAccountId({ chain });
  const { needRepayAmount, borrowedUsd } = useMemo(() => {
    if (tokenId && assets && portfolio && action == "Repay") {
      const { borrowedTokenBalance, borrowedUsd } = getDebtAmountOfToken({
        portfolio,
        assets,
        tokenId,
      });
      return {
        needRepayAmount: borrowedTokenBalance,
        borrowedUsd,
      };
    }
    return {
      needRepayAmount: "0",
      borrowedUsd: "0",
    };
  }, [tokenId, assets, portfolio, action]);
  useDebounce(
    () => {
      if (
        mca &&
        action == "Repay" &&
        isOpen &&
        new Decimal(needRepayAmount || 0).gt(0) &&
        symbol &&
        chain &&
        selectedChainAccountId
      ) {
        getMaxRepayAmountFromWallet();
      } else {
        setMaxRepayAmountFromWalletLoading(false);
      }
    },
    500,
    [
      action,
      mca,
      needRepayAmount,
      symbol,
      chain,
      subChain,
      selectedChainAccountId,
      isOpen,
    ]
  );
  async function getMaxRepayAmountFromWallet() {
    setMaxRepayAmountFromWalletLoading(true);
    const { amountInToken } = await getAmountInByAmountOutQuotation({
      symbol,
      chain,
      subChain,
      amount: needRepayAmount,
      refundTo: selectedChainAccountId,
      recipient: mca,
      slippageTolerance: getSlippageToleranceByAmountInUsd(borrowedUsd),
    });
    setMaxRepayAmountFromWalletLoading(false);
    const tokenOnChainMetadata = getChainTokenMetadataBySymbol({
      symbol,
      chain,
      subChain,
    });
    const chainDecimal = tokenOnChainMetadata?.decimal || asset.decimals || 0;
    setMaxRepayAmountFromWallet({
      amountToken: amountInToken,
      amountTokenRead: shrinkToken(amountInToken || 0, chainDecimal),
    });
  }
  /** query repay amount end */
  const { actionButtonDisabled, totalAvailable } = useMemo(() => {
    let is_insufficient;
    if (action == "Supply" || (action == "Repay" && !isRepayFromDeposits)) {
      is_insufficient = new Decimal(amount || 0).gt(
        selectedChainSymbolWalletBalance
      );
    } else {
      // available may auto update;
      is_insufficient =
        new Decimal(amount || 0).gt(available || 0) &&
        !isMax &&
        action !== "Adjust";
    }
    if (is_insufficient) {
      alerts.wallet = {
        title: "Insufficient Balance",
        severity: "warning",
      };
    }
    let totalAvailable;
    if (action == "Supply") {
      totalAvailable = selectedChainSymbolWalletBalance;
    } else if (action == "Repay" && !isRepayFromDeposits) {
      totalAvailable = maxRepayAmountFromWallet?.amountTokenRead || 0;
    } else {
      totalAvailable = available;
    }
    return {
      totalAvailable,
      actionButtonDisabled:
        (action !== "Repay" && is_insufficient) ||
        (!actionChainSeleced?.chain && isSupportAsset),
    };
  }, [
    amount,
    available,
    actionChainSeleced,
    action,
    isRepayFromDeposits,
    symbol,
    selectedChainSymbolWalletBalance,
    maxRepayAmountFromWallet?.amountTokenRead,
    alerts,
    isSupportAsset,
    isMax,
  ]);
  const handleClose = () => {
    dispatch(hideModal());
  };
  function getCostNearOnAction() {
    let costNear = new Decimal(0);
    if (fromNearToOutAction) {
      // for ft_transfer intents
      costNear = costNear.plus(TOKEN_STORAGE_DEPOSIT_READ);
      if (!isTokenRegistered) {
        // for tokens on mca
        costNear = costNear.plus(TOKEN_STORAGE_DEPOSIT_READ);
      }
    }
    const costNearUSD = new Decimal(
      assets.data[WRAP_NEAR_CONTRACT_ID]?.price?.usd || 0
    ).mul(costNear || 0);
    return {
      nearStorageUsd: costNearUSD.toFixed(),
      nearStorageAmount: costNear.toFixed(),
    };
  }
  function getChainsStatusForUi() {
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
    };
  }
  async function is_token_registered() {
    setTokenRegisterQueryLoading(true);
    const isRegistered = await view_on_near({
      contractId: tokenId,
      methodName: "storage_balance_of",
      args: {
        account_id: mca,
      },
    });
    setIsTokenRegistered(!!isRegistered);
    setTokenRegisterQueryLoading(false);
  }
  return (
    <DefaultModal isOpen={isOpen} onRequestClose={handleClose}>
      <div className="bg-white rounded-2xl max-h-[72vh] p-[30px] w-[500px] max-sm:w-[100vw] max-sm:rounded-b-none max-sm:max-h-[60vh] overflow-y-auto">
        <ModalTitle asset={asset} onClose={handleClose} />
        {/* chains selector */}
        <ChainsSelector
          action={action}
          token={{
            tokenId,
            symbol,
          }}
        />

        {/* repay tab */}
        <RepayTab asset={asset} />
        {/* input */}
        <div className="my-4">
          <Controls
            amount={amount}
            action={action}
            asset={asset}
            totalAvailable={totalAvailable}
            borrowedAmount={repayAmount}
            suppliedBalance={suppliedBalance}
            walletBalance={selectedChainSymbolWalletBalance}
          />
        </div>
        {/* details */}
        <div className="flex flex-col gap-3 bg-gray-80 rounded-xl p-4 mb-6">
          <HealthFactor value={healthFactor} />
          <Rates rates={rates} />
          <BorrowLimit from={maxBorrowValue} to={adjustedMaxBorrowValue} />
          {!canUseAsCollateral ? (
            <CollateralTip />
          ) : (
            <CollateralSwitch
              action={action}
              canUseAsCollateral={canUseAsCollateral}
              tokenId={asset.tokenId}
            />
          )}

          {action == "Supply" && showCreateButton ? (
            <div className="hidden">
              <SetUpFeeSelector
                chain={chain}
                uniqueTokenId={tokenId}
                setSelectedFeeTokenData={setSelectedFeeTokenData}
                selectedFeeTokenData={selectedFeeTokenData}
                // from="supply"
              />
            </div>
          ) : null}
          <Fee
            bridgeValue={bridgeFeeValue}
            setUpValue={setupFeeValue}
            relayerValue={relayerFeeValue}
            isSetup={showCreateButton}
            requireBridgeAction={requireBridgeAction}
            requireRelayerAction={requireRelayerAction}
          />
          {requireBridgeAction ? <Receive value={receiveAmount} /> : null}
        </div>
        {/* Action Button */}
        <Action
          available={available}
          healthFactor={healthFactor}
          isDisabled={actionButtonDisabled || disabled || createMcaDisabled}
          gasData={gasData}
          setIntensQuoteAmount={setIntensQuoteAmount}
          tokenRegisterQueryLoading={tokenRegisterQueryLoading}
          setIntentsFeeUsd={setIntentsFeeUsd}
          alerts={alerts}
          maxRepayAmountFromWalletLoading={maxRepayAmountFromWalletLoading}
          feeData={{
            ...(requireRelayerAction ? { relayerFeeValue } : {}),
            ...(requireBridgeAction ? { bridgeFeeValue } : {}),
            ...(showCreateButton ? { setupFeeValue } : {}),
          }}
        />
      </div>
    </DefaultModal>
  );
}
