import { Portfolio } from "@rhea-finance/cross-chain-sdk";
import { IMetadata, IChain, IIntentItem } from "@rhea-finance/cross-chain-sdk";
export interface IBindData {
  signerWallet: {
    chain: IChain;
    identityKey: string;
  };
  newWallet: {
    chain: IChain;
    identityKey: string;
    accountId: string;
  };
}

export interface IUnBindData {
  signerWallet: {
    chain: IChain;
    identityKey: string;
  };
  deleteWallet: {
    chain: IChain;
    identityKey: string;
    accountId: string;
  };
}
export interface IIntentsTokens {
  [key: string]: {
    near: IIntentItem;
    solana?: IIntentItem;
    evm?: Record<string, IIntentItem>;
    btc?: IIntentItem;
  };
}

export interface IWalletData {
  chain: IChain;
  accountId: string;
  identityKey: string;
}

export interface IChainData {
  id: IChain;
  icon: string;
  name: string;
}

export interface IIntentsResult {
  status?: "pending" | "success" | "error";
  chain?: IChain;
  selectedEvmChain?: string;
}

export type ITransactionStatus = "pending" | "success" | "error";

export interface IAccountAssetsMap {
  [tokenSymbol: string]: {
    total: string;
    symbol: string;
    icon: string;
    details: Array<{
      chain: string;
      chainIcon: string;
      balanceOnChain: string;
    }>;
  };
}
export interface ICreateFeeToken {
  tokenId: string;
  totalFeeAmout: string;
  totalFeeAmoutRead: string;
  actualAmount: string;
  actualAmountRead: string;
  metadata: IMetadata;
  price: string | number;
}

export interface IFeeData {
  relayerFeeValue?: string | number;
  setupFeeValue?: string | number;
  bridgeFeeValue?: string | number;
}

export interface IActionChainSeleced {
  chain: IChain;
  subChain?: string;
}
