import Decimal from "decimal.js";
import {
  IChain,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  format_wallet,
  NDeposit,
  prepareBusinessDataOninnerWithdraw,
  IExecutionResult,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message, formatErrorMessage } from "@/utils/chainsUtil";
import { TOKEN_STORAGE_DEPOSIT_READ } from "@/services/constantConfig";
import { getOutChainAssetAndNearChainAssetOnUi } from "./commonAction";

export async function withdrawFromNearWallet({
  mca,
  tokenId,
  symbol,
  amountToken,
  chain,
  identityKey,
  selectedEvmChain,
  outChainAccountId,
  relayerNearGasAmount,
}: {
  mca: string;
  tokenId: string;
  symbol: string;
  amountToken: string;
  chain: IChain;
  identityKey: string;
  selectedEvmChain: string;
  outChainAccountId: string;
  relayerNearGasAmount: string;
}): Promise<IExecutionResult> {
  try {
    const { nearChainAsset, outChainAsset } =
      getOutChainAssetAndNearChainAssetOnUi({
        chain,
        symbol,
        selectedEvmChain,
      });
    const { businessMap, quoteResult } =
      await prepareBusinessDataOninnerWithdraw({
        mca,
        recipient: outChainAccountId,
        tokenId,
        originAsset: nearChainAsset,
        destinationAsset: outChainAsset,
        amountToken,
        gas_token_id: "near",
        gas_token_amount: new Decimal(NDeposit(TOKEN_STORAGE_DEPOSIT_READ))
          .plus(relayerNearGasAmount)
          .toFixed(),
      });
    const depositAddress =
      quoteResult?.quoteSuccessResult?.quote?.depositAddress;
    const signedBusiness = await sign_message({
      chain,
      message: JSON.stringify(businessMap),
    });
    const w = format_wallet({
      chain,
      identityKey,
    });
    const relayer_result = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: JSON.stringify(w),
      request: [
        JSON.stringify({
          signer_wallet: w,
          business: businessMap,
          signature: signedBusiness,
          attach_deposit: NDeposit(TOKEN_STORAGE_DEPOSIT_READ),
        }),
      ],
      page_display_data: "",
    });
    if (relayer_result?.code == 0) {
      const { status, tx_hash } = await pollingRelayerTransactionResult(
        relayer_result.data,
        2000
      );
      return {
        status,
        tx_hash,
        message: status == "error" ? "Relayer execution failed" : "",
        depositAddress,
      };
    }
    return {
      status: "error",
      message: formatErrorMessage(relayer_result?.msg),
      depositAddress,
    };
  } catch (error) {
    return {
      status: "error",
      message: formatErrorMessage(error?.message || error?.error),
    };
  }
}
