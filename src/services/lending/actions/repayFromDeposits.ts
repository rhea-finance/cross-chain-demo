import Decimal from "decimal.js";
import {
  IChain,
  config_near,
  format_wallet,
  get_nonce_deadline,
  TGas,
  serializationObj,
  IConfig,
  ChangeMethodsLogic,
  ChangeMethodsOracle,
  IExecutionResult,
  IBusiness,
  ISimpleWithdraw,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  prepareBusinessDataOnRepayFromSupplied,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message } from "@/utils/chainsUtil";
import { formatErrorMessage } from "@/utils/chainsUtil";

export async function repayFromDeposits({
  mca,
  tokenId,
  amountBurrow,
  config,
  chain,
  identityKey,
  decreaseAmountBurrow,
  simpleWithdrawData,
  page_display_data,
}: {
  mca: string;
  tokenId: string;
  amountBurrow: string;
  config: IConfig;
  chain: IChain;
  identityKey: string;
  decreaseAmountBurrow: string;
  simpleWithdrawData: ISimpleWithdraw;
  page_display_data: string;
}): Promise<IExecutionResult> {
  try {
    const businessMap = await prepareBusinessDataOnRepayFromSupplied({
      mca,
      tokenId,
      config,
      simpleWithdrawData,
      amountBurrow,
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
