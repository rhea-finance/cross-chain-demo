export interface ITokenMetadata {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon: string;
}

export interface IChainTokenMetadata {
  symbol: string;
  address: string;
  decimals: number;
}

export interface ISelectWithdrawToken {
  tokenId: string;
  symbol: string;
  icon: string;
  balance: string;
  amountRead: number;
  amountToken: string;
}
