import useWalletConnect from "@/hooks/useWalletConnect";
import { Img } from "../common/img";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";

interface ChainIconConfig {
  active: string;
  inactive: string;
}

const CHAIN_ICONS: Record<IChain, ChainIconConfig> = {
  btc: {
    active: "btc-chain-icon.svg",
    inactive: "btc-chain-gray-icon.svg",
  },
  solana: {
    active: "solana-chain-icon.svg",
    inactive: "solana-chain-gray-icon.svg",
  },
  evm: {
    active: "ethereum-chain-icon.svg",
    inactive: "evm-chain-gray-icon.svg",
  },
};

export function ChainStatusIcon({ chain }: { chain: IChain }) {
  const { evm, solana, btc } = useWalletConnect();

  const isSignedIn = (() => {
    switch (chain) {
      case "btc":
        return btc.isSignedIn;
      case "solana":
        return solana.isSignedIn;
      case "evm":
        return evm.isSignedIn;
      default:
        return false;
    }
  })();

  const iconPath = isSignedIn
    ? CHAIN_ICONS[chain].active
    : CHAIN_ICONS[chain].inactive;

  return <Img path={iconPath} className="w-[22px] h-[22px] -ml-2" />;
}

export function ChainMcaStatusIcon({ chain }: { chain: IChain }) {
  const { getChansStatus } = useChainsLendingStatus();
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();

  const isConnected = (() => {
    switch (chain) {
      case "btc":
        return btcStatus.connected;
      case "solana":
        return solanaStatus.connected;
      case "evm":
        return evmStatus.connected;
      default:
        return false;
    }
  })();

  const iconPath = isConnected
    ? CHAIN_ICONS[chain].active
    : CHAIN_ICONS[chain].inactive;

  return <Img path={iconPath} className="w-[22px] h-[22px] -ml-2" />;
}
