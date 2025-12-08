import {
  config_near,
  format_wallet,
  get_nonce_deadline,
  IExecutionResult,
  IChain,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
  prepareBusinessDataOnAddWallet,
  prepareBusinessDataOnRemoveWallet,
  serializationObj,
  IBusiness,
} from "@rhea-finance/cross-chain-sdk";
import { sign_message } from "@/utils/chainsUtil";
import { outChainToNearChainIntentsAction } from "./commonAction";
import { formatErrorMessage } from "@/utils/chainsUtil";
/**
 *  contract receive user's token
 *  for create mca and register dapp
 */
export async function createMCA({
  symbol,
  amount,
  chain,
  identityKey,
  outChainAccountId,
  selectedEvmChain,
}: {
  symbol: string;
  amount: string;
  chain: IChain;
  identityKey: string;
  outChainAccountId: string;
  selectedEvmChain?: string;
}): Promise<IExecutionResult> {
  const res = await outChainToNearChainIntentsAction({
    chain,
    identityKey,
    symbol,
    amount,
    selectedEvmChain,
    outChainAccountId,
    recipient: config_near.AM_CONTRACT,
    action: "Create",
  });
  return res;
}

export async function addWallet({
  mca,
  signerWallet,
  newWallet,
  relayerGasAMount,
}: {
  mca: string;
  signerWallet: {
    chain: IChain;
    identityKey: string;
  };
  newWallet: {
    chain: IChain;
    identityKey: string;
  };
  relayerGasAMount: string;
}): Promise<{
  status: "success" | "error";
  tx_hash?: string;
  message?: string;
  result?: any;
}> {
  try {
    const add_w = format_wallet({
      chain: newWallet.chain,
      identityKey: newWallet.identityKey,
    });
    const signature_new_wallet = await sign_message({
      chain: newWallet.chain,
      message: mca + serializationObj(add_w),
    });
    const businessMap = await prepareBusinessDataOnAddWallet({
      mca,
      w: add_w,
      signature_w: signature_new_wallet,
      gas_token_id: "near",
      gas_token_amount: relayerGasAMount,
    });
    const signature = await sign_message({
      chain: signerWallet.chain,
      message: serializationObj(businessMap),
    });
    const res = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: serializationObj(
        format_wallet({
          chain: signerWallet.chain,
          identityKey: signerWallet.identityKey,
        })
      ),
      request: [
        serializationObj({
          signer_wallet: format_wallet({
            chain: signerWallet.chain,
            identityKey: signerWallet.identityKey,
          }),
          business: businessMap,
          signature,
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

export async function removeWallet({
  mca,
  signerWallet,
  deleteWallet,
  relayerGasAMount,
}: {
  mca: string;
  signerWallet: {
    chain: IChain;
    identityKey: string;
  };
  deleteWallet: {
    chain: IChain;
    identityKey: string;
  };
  relayerGasAMount: string;
}): Promise<{
  status: "success" | "error";
  tx_hash?: string;
  message?: string;
  result?: any;
}> {
  try {
    const businessMap = await prepareBusinessDataOnRemoveWallet({
      mca,
      w: format_wallet({
        chain: deleteWallet.chain,
        identityKey: deleteWallet.identityKey,
      }),
      gas_token_id: "near",
      gas_token_amount: relayerGasAMount,
    });
    const business = serializationObj(businessMap);
    const signature = await sign_message({
      chain: signerWallet.chain,
      message: business,
    });
    const res = await postMultichainLendingRequests({
      mca_id: mca,
      wallet: serializationObj(
        format_wallet({
          chain: signerWallet.chain,
          identityKey: signerWallet.identityKey,
        })
      ),
      request: [
        serializationObj({
          signer_wallet: format_wallet({
            chain: signerWallet.chain,
            identityKey: signerWallet.identityKey,
          }),
          business: businessMap,
          signature,
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
