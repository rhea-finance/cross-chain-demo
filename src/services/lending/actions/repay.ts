import { IChain, IExecutionResult } from "@rhea-finance/cross-chain-sdk";
import { outChainToNearChainIntentsAction } from "./commonAction";

export async function repay({
  mca,
  chain,
  identityKey,
  amount,
  symbol,
  outChainAccountId,
  selectedEvmChain,
}: {
  mca: string;
  chain: IChain;
  identityKey: string;
  amount: string;
  symbol: string;
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
    recipient: mca,
    action: "Repay",
  });
  return res;
}
