import {
  config_near,
  IExecutionResult,
  IChain,
} from "@rhea-finance/cross-chain-sdk";
import { outChainToNearChainIntentsAction } from "./commonAction";

export async function supply({
  mca,
  chain,
  identityKey,
  amount,
  symbol,
  useAsCollateral,
  outChainAccountId,
  selectedEvmChain,
  create,
}: {
  mca: string;
  chain: IChain;
  identityKey: string;
  amount: string;
  symbol: string;
  useAsCollateral: boolean;
  outChainAccountId: string;
  create: boolean;
  selectedEvmChain?: string;
}): Promise<IExecutionResult> {
  const res = await outChainToNearChainIntentsAction({
    chain,
    identityKey,
    symbol,
    amount,
    selectedEvmChain,
    outChainAccountId,
    recipient: create ? config_near.AM_CONTRACT : mca,
    action: create ? "SupplyCreate" : "Supply",
    useAsCollateral,
  });

  return res;
}
