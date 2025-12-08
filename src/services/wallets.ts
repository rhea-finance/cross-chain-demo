import {
  SafePalWalletAdapter,
  SolflareWalletAdapter,
  PhantomWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import { setupWeb3Onboard } from "@/services/chains/evm";

export const solalaWallets = [
  new SafePalWalletAdapter(),
  new SolflareWalletAdapter(),
  new PhantomWalletAdapter(),
  new CoinbaseWalletAdapter(),
];

export const web3Onboard = setupWeb3Onboard();
