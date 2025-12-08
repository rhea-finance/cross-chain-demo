import {
  IChain,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  format_wallet,
  prepareBusinessDataOnClaim,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message, formatErrorMessage } from "@/utils/chainsUtil";
export async function claimAll({
  mca,
  chain,
  identityKey,
  relayerNearGasAmount,
}: {
  mca: string;
  chain: IChain;
  identityKey;
  relayerNearGasAmount: string;
}) {
  try {
    const businessMap = await prepareBusinessDataOnClaim({
      mca,
      gas_token_id: "near",
      gas_token_amount: relayerNearGasAmount,
    });
    const signedBusiness = await sign_message({
      chain,
      message: JSON.stringify(businessMap),
    });
    const w = format_wallet({
      chain,
      identityKey,
    });
    const res = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: JSON.stringify(w),
      request: [
        JSON.stringify({
          signer_wallet: w,
          business: businessMap,
          signature: signedBusiness,
          attach_deposit: "0",
        }),
      ],
      page_display_data: "",
    });
    if (res?.code == 0) {
      const { status, tx_hash } = await pollingRelayerTransactionResult(
        res.data,
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
      message: formatErrorMessage(res?.msg),
    };
  } catch (error) {
    return {
      status: "error",
      message: formatErrorMessage(error?.message || error?.error),
    };
  }
}
