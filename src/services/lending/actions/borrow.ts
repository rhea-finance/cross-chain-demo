import _ from "lodash";
import {
  IChain,
  format_wallet,
  NDeposit,
  serializationObj,
  IConfig,
  IExecutionResult,
  ISimpleWithdraw,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  prepareBusinessDataOnBorrow,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message } from "@/utils/chainsUtil";
import { formatErrorMessage } from "@/utils/chainsUtil";
import { TOKEN_STORAGE_DEPOSIT_READ } from "@/services/constantConfig";
import { getOutChainAssetAndNearChainAssetOnUi } from "./commonAction";
export async function borrow({
  mca,
  chain,
  identityKey,
  tokenId,
  amountBurrow,
  amountToken,
  config,
  symbol,
  outChainAccountId,
  simpleWithdrawData,
  selectedEvmChain,
  page_display_data,
}: {
  mca: string;
  chain: IChain;
  tokenId: string;
  amountBurrow: string;
  amountToken: string;
  config: IConfig;
  identityKey: string;
  symbol: string;
  outChainAccountId;
  simpleWithdrawData: ISimpleWithdraw;
  selectedEvmChain?: string;
  page_display_data: string;
}): Promise<IExecutionResult> {
  try {
    const { outChainAsset, nearChainAsset } =
      getOutChainAssetAndNearChainAssetOnUi({
        chain,
        symbol,
        selectedEvmChain,
      });
    const { businessMap, quoteResult } = await prepareBusinessDataOnBorrow({
      mca,
      recipient: outChainAccountId,
      tokenId,
      originAsset: nearChainAsset,
      destinationAsset: outChainAsset,
      amountBurrow,
      amountToken,
      config,
      simpleWithdrawData,
    });
    const depositAddress =
      quoteResult?.quoteSuccessResult?.quote?.depositAddress;
    const w = format_wallet({
      chain,
      identityKey,
    });
    const signedBusiness = await sign_message({
      chain,
      message: serializationObj(businessMap),
    });
    const relayer_result = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: serializationObj(w),
      request: [
        serializationObj({
          signer_wallet: w,
          business: businessMap,
          signature: signedBusiness,
          attach_deposit: NDeposit(TOKEN_STORAGE_DEPOSIT_READ),
        }),
      ],
      page_display_data,
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
