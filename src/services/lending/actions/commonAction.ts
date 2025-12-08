import Decimal from "decimal.js";
import {
  IChain,
  format_wallet,
  IExecutionResult,
  IStatus,
  getCreateMcaCustomRecipientMsg,
  getSupplyCustomRecipientMsg,
  getRepayCustomRecipientMsg,
  intentsQuotation,
  serializationObj,
} from "@rhea-finance/cross-chain-sdk";
import { TokenAction } from "@/redux/slice/appSlice";
import {
  INTENTS_TOKENS,
  ASSETS_CHAINS_EVM,
  ASSETS_CHAINS_SOLANA,
} from "@/services/chainConfig";
import { transfer_evm } from "@/services/chains/evm";
import { transfer_btc } from "@/services/chains/btc";
import { transfer_solana } from "@/services/chains/solana";
import {
  formatSymbolName,
  formatErrorMessage,
  sign_message,
} from "@/utils/chainsUtil";

export async function outChainToNearChainIntentsAction({
  chain,
  identityKey,
  symbol,
  amount,
  selectedEvmChain,
  outChainAccountId,
  recipient,
  action,
  useAsCollateral,
}: {
  chain: IChain;
  identityKey: string;
  symbol: string;
  amount: string;
  selectedEvmChain: string;
  outChainAccountId: string;
  recipient: string;
  action: TokenAction | "Create" | "SupplyCreate";
  useAsCollateral?: boolean;
}): Promise<IExecutionResult> {
  try {
    const { depositAddress, message } = await outChainToNearChainIntentsQuote({
      chain,
      identityKey,
      symbol,
      amount,
      selectedEvmChain,
      outChainAccountId,
      recipient,
      action,
      useAsCollateral,
    });

    if (depositAddress) {
      if (chain == "evm") {
        const tokenData = ASSETS_CHAINS_EVM.find(
          (item) => item.symbol == symbol
        );
        const tokenAddress = tokenData.addresses[selectedEvmChain];
        const hash = await transfer_evm({
          tokenAddress,
          depositAddress,
          chain: selectedEvmChain.toLowerCase(),
          amount,
        });
        return {
          status: "success",
          depositAddress,
          tx_hash: hash,
        };
      } else if (chain == "solana") {
        const tokenData = ASSETS_CHAINS_SOLANA.find(
          (item) => item.symbol == symbol
        );
        const hash = await transfer_solana({
          depositAddress,
          tokenAddress: tokenData.address,
          amount,
        });
        return {
          status: "success",
          depositAddress,
          tx_hash: hash,
        };
      } else {
        const hash = await transfer_btc({
          address: depositAddress,
          amount: new Decimal(amount).toNumber(),
          feeRate: 3, // TODOXXX
        });
        return {
          status: "success" as IStatus,
          depositAddress,
          tx_hash: hash,
        };
      }
    } else {
      return {
        status: "error",
        message: message,
        tx_hash: "",
      };
    }
  } catch (error) {
    return {
      status: "error",
      message: formatErrorMessage(error?.message || error?.error),
      tx_hash: "",
    };
  }
}
export async function outChainToNearChainIntentsQuote({
  chain,
  identityKey,
  symbol,
  amount,
  selectedEvmChain,
  outChainAccountId,
  recipient,
  action,
  useAsCollateral,
}: {
  chain: IChain;
  identityKey: string;
  symbol: string;
  amount: string;
  selectedEvmChain: string;
  outChainAccountId: string;
  recipient: string;
  action: TokenAction | "Create" | "SupplyCreate";
  useAsCollateral?: boolean;
}): Promise<IExecutionResult> {
  try {
    const w = format_wallet({
      chain,
      identityKey,
    });
    let customRecipientMsg = "";
    if (action == "Supply") {
      customRecipientMsg = getSupplyCustomRecipientMsg({
        w,
        useAsCollateral,
      });
    } else if (action == "SupplyCreate") {
      const signedMessage = await sign_message({
        chain,
        message: serializationObj([w]),
      });
      customRecipientMsg = getCreateMcaCustomRecipientMsg({
        useAsCollateral,
        wallets: [w],
        signedMessages: [signedMessage],
      });
    } else if (action == "Repay") {
      customRecipientMsg = getRepayCustomRecipientMsg({
        w,
      });
    } else if (action == "Create") {
      const signedMessage = await sign_message({
        chain,
        message: serializationObj([w]),
      });
      customRecipientMsg = getCreateMcaCustomRecipientMsg({
        useAsCollateral: false,
        wallets: [w],
        signedMessages: [signedMessage],
      });
    }
    const quoteResult = await intentsQuotationUi({
      chain,
      symbol,
      selectedEvmChain,
      amount,
      refundTo: outChainAccountId,
      recipient,
      outChainToNearChain: true,
      customRecipientMsg,
    });

    if (quoteResult?.quoteStatus == "success") {
      return {
        status: "success",
        depositAddress: quoteResult.quoteSuccessResult.quote.depositAddress,
        quoteResult: quoteResult,
      };
    } else {
      return {
        status: "error",
        message: formatErrorMessage(quoteResult?.message),
      };
    }
  } catch (error) {
    return {
      status: "error",
      message: formatErrorMessage(error?.message || error?.error),
    };
  }
}
export async function intentsQuotationUi({
  chain,
  symbol,
  selectedEvmChain,
  amount,
  refundTo,
  recipient,
  outChainToNearChain,
  customRecipientMsg,
  isReverse,
  dry,
  slippageTolerance,
}: {
  chain: IChain;
  symbol: string;
  selectedEvmChain: string;
  amount: string;
  refundTo: string;
  recipient: string;
  outChainToNearChain: boolean;
  customRecipientMsg?: string;
  isReverse?: boolean;
  dry?: boolean;
  slippageTolerance?: number;
}) {
  const { outChainAsset, nearChainAsset } =
    getOutChainAssetAndNearChainAssetOnUi({
      chain,
      symbol,
      selectedEvmChain,
    });
  const res_quote = await intentsQuotation({
    originAsset: outChainToNearChain ? outChainAsset : nearChainAsset,
    destinationAsset: outChainToNearChain ? nearChainAsset : outChainAsset,
    amount,
    refundTo,
    recipient,
    isReverse,
    dry,
    slippageTolerance,
    customRecipientMsg,
  });
  return res_quote;
}

export function getOutChainAssetAndNearChainAssetOnUi({
  chain,
  symbol,
  selectedEvmChain,
}: {
  chain: IChain;
  symbol: string;
  selectedEvmChain: string;
}) {
  let outChainAsset;
  const _symbol = formatSymbolName(symbol);
  if (chain == "evm") {
    outChainAsset = INTENTS_TOKENS[_symbol].evm[selectedEvmChain].assetId;
  } else if (chain == "solana") {
    outChainAsset = INTENTS_TOKENS[_symbol].solana.assetId;
  } else if (chain == "btc") {
    outChainAsset = INTENTS_TOKENS[_symbol].btc.assetId;
  }
  const nearChainAsset = INTENTS_TOKENS[_symbol].near.assetId;
  return {
    outChainAsset,
    nearChainAsset,
  };
}
