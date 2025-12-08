import {
  IChain,
  format_wallet,
  serializationObj,
  IConfig,
  IExecutionResult,
  ISimpleWithdraw,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  prepareBusinessDataOnAdjust,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message } from "@/utils/chainsUtil";
import { formatErrorMessage } from "@/utils/chainsUtil";
export async function adjustCollateral({
  tokenId,
  increaseAmountBurrow,
  decreaseAmountBurrow,
  isIncreaseCollateral,
  isDecreaseCollateral,
  config,
  mca,
  chain,
  identityKey,
  simpleWithdrawData,
  page_display_data,
}: {
  tokenId: string;
  increaseAmountBurrow: string;
  decreaseAmountBurrow: string;
  isIncreaseCollateral: boolean;
  isDecreaseCollateral: boolean;
  config: IConfig;
  mca: string;
  chain: IChain;
  identityKey;
  simpleWithdrawData: ISimpleWithdraw;
  page_display_data: string;
}): Promise<IExecutionResult> {
  try {
    const businessMap = await prepareBusinessDataOnAdjust({
      mca,
      tokenId,
      config,
      simpleWithdrawData,
      isIncreaseCollateral,
      increaseAmountBurrow,
      isDecreaseCollateral,
      decreaseAmountBurrow,
    });
    const signedBusiness = await sign_message({
      chain,
      message: serializationObj(businessMap),
    });
    const w = format_wallet({
      chain,
      identityKey,
    });
    const relayer_result = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: serializationObj(w),
      request: [
        serializationObj({
          signer_wallet: w,
          business: businessMap,
          signature: signedBusiness,
          attach_deposit: "0",
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
      };
    }
    return {
      status: "error",
      message: formatErrorMessage(relayer_result?.msg),
    };
  } catch (error) {
    return {
      status: "error",
      message: formatErrorMessage(error?.message || error?.error),
    };
  }
}
