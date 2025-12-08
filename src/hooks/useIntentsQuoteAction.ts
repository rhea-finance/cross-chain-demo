import _ from "lodash";
import { useEffect, useState } from "react";
import { useDebounce } from "react-use";
import Decimal from "decimal.js";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssetData } from "@/redux/selectors/appSelectors";
import { ethers } from "ethers";
import type { PublicKey, Connection } from "@solana/web3.js";
import {
  outChainToNearChainIntentsQuote,
  intentsQuotationUi,
} from "@/services/lending/actions/commonAction";
import { TokenAction } from "@/redux/slice/appSlice";
import { IChain } from "@rhea-finance/cross-chain-sdk";
declare global {
  interface Window {
    ethProvider: ReturnType<typeof useConnectWallet>[0]["wallet"]["provider"];
    ethWeb3Provider: ethers.providers.Web3Provider;
    solanaWallet: {
      publicKey: PublicKey;
      connection: Connection;
    } & ReturnType<typeof useWallet>;
  }
}
export default function useIntentsQuoteAction({
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
  tokenAmount,
  recipient,
}: {
  action: TokenAction;
  actionDisabled: boolean;
  isDisabled: boolean;
  amount: string;
  expandedChainWalletBalance: string;
  chain: IChain;
  subChain: string;
  identityKey: string;
  selectedChainAccountId: string;
  mca: string;
  isRepayFromDeposits: boolean;
  symbol: string;
  tokenAmount: string;
  recipient: string;
}) {
  const [done, setDone] = useState(true);
  const [tag, setTag] = useState<string>();
  const [intentsFeeUsd, setIntentsFeeUsd] = useState<string | number>("0");
  const [intensQuoteAmount, setIntensQuoteAmount] = useState<string | number>(
    "0"
  );
  const [intentsQuoteErrorMesssage, setIntentsQuoteErrorMesssage] =
    useState("");
  const asset = useAppSelector(getAssetData);
  const price = asset?.price || 0;
  // do intents quote
  useDebounce(
    () => {
      doIntentsQuote();
    },
    500,
    [
      symbol,
      action,
      isRepayFromDeposits,
      actionDisabled,
      isDisabled,

      amount,
      tokenAmount,
      expandedChainWalletBalance,

      selectedChainAccountId,
      mca,
      recipient,

      chain,
      subChain,
      identityKey,
    ]
  );
  async function doIntentsQuote() {
    const actions = ["Supply", "Borrow", "Withdraw", "Repay"];
    const isActive =
      !(isDisabled || actionDisabled) && new Decimal(amount || 0).gt(0);
    const canPassCondition1 =
      action == "Supply" && new Decimal(amount || 0).gt(0);
    const canPassCondition2 =
      actions.includes(action) &&
      isActive &&
      !(action == "Repay" && isRepayFromDeposits);
    if (!canPassCondition1 && !canPassCondition2) {
      setIntentsQuoteErrorMesssage("");
      setIntensQuoteAmount("0");
      setIntentsFeeUsd("0");
      setDone(true);
      setTag(`${action}@${amount}@${chain}@${subChain}`);
      return;
    }

    let quoteStatus;
    let quoteMessage;
    let quoteAmount;
    let quoteFee;
    if (action == "Supply" || (action == "Repay" && !isRepayFromDeposits)) {
      setDone(false);
      const amount = tokenAmount;
      const { status, quoteResult, message } =
        await outChainToNearChainIntentsQuote({
          chain,
          identityKey,
          symbol,
          amount,
          selectedEvmChain: subChain,
          outChainAccountId: selectedChainAccountId,
          recipient,
          action,
        });
      quoteStatus = status;
      quoteMessage = message;
      const { amountOutFormatted, amountInFormatted } =
        quoteResult?.quoteSuccessResult?.quote || {};
      quoteAmount = amountOutFormatted || 0;
      quoteFee = new Decimal(amountInFormatted || 0)
        .minus(amountOutFormatted || 0)
        .mul(price || 0)
        .toFixed();
    } else if (action == "Borrow" || action == "Withdraw") {
      setDone(false);
      const amount = tokenAmount;
      const quoteResult = await intentsQuotationUi({
        symbol,
        chain,
        selectedEvmChain: subChain,
        amount,
        refundTo: mca,
        recipient: selectedChainAccountId,
        outChainToNearChain: false,
      });
      quoteStatus = quoteResult?.quoteStatus;
      quoteMessage = quoteResult?.message;
      const { amountOutFormatted, amountInFormatted } =
        quoteResult?.quoteSuccessResult?.quote || {};
      quoteAmount = amountOutFormatted || 0;
      quoteFee = new Decimal(amountInFormatted || 0)
        .minus(amountOutFormatted || 0)
        .mul(price || 0)
        .toFixed();
    }

    if (quoteStatus == "success") {
      setIntensQuoteAmount(quoteAmount);
      setIntentsFeeUsd(quoteFee);
      setIntentsQuoteErrorMesssage("");
    } else {
      setIntensQuoteAmount("0");
      setIntentsFeeUsd("0");
      setIntentsQuoteErrorMesssage(quoteMessage);
    }
    setTag(`${action}@${amount}@${chain}@${subChain}`);
    setDone(true);
  }
  return {
    intensQuoteAmount,
    intentsFeeUsd,
    intentsQuoteErrorMesssage,
    done,
    tag,
  };
}
