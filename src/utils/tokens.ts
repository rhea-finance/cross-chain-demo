import { ITokenMetadata } from "@/interface/lending";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import { staticDomain } from "@/services/constantConfig";
const { WRAP_NEAR_CONTRACT_ID } = config_near;

export const nearMetadata: ITokenMetadata = {
  id: "NEAR",
  name: "NEAR",
  symbol: "NEAR",
  decimals: 24,
  icon: `${staticDomain}/images/NEARIcon.png`,
};

export const wnearMetadata: ITokenMetadata = {
  id: WRAP_NEAR_CONTRACT_ID,
  name: "wNEAR",
  symbol: "wNEAR",
  decimals: 24,
  icon: `${staticDomain}/images/w-NEAR-no-border.png`,
};

export const fraxMetadata = {
  symbol: "FRAX",
  icon: `${staticDomain}/images/RAX_coin.svg`,
};

export const YUMetadata = {
  symbol: "YU",
  icon: `${staticDomain}/images/yu-token-icon.png`,
};
