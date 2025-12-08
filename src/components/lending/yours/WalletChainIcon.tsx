import React from "react";
import { Img } from "@/components/common/img";
import { SOLANA_CHAIN, BTC_CHAIN, ALL_CHAINS } from "@/services/chainConfig";

interface WalletChainIconProps {
  wallet: string;
  className?: string;
}

export const WalletChainIcon: React.FC<WalletChainIconProps> = ({
  wallet,
  className = "",
}) => {
  let chainType: "evm" | "solana" | "btc" | null = null;
  let walletAddress = "";

  try {
    const walletData = JSON.parse(wallet);
    if (walletData.EVM) {
      chainType = "evm";
      walletAddress = walletData.EVM;
    } else if (walletData.Solana) {
      chainType = "solana";
      walletAddress = walletData.Solana;
    } else if (walletData.Bitcoin || walletData.BTC) {
      chainType = "btc";
      walletAddress = walletData.Bitcoin || walletData.BTC;
    }
  } catch (e) {
    return null;
  }

  if (!chainType) return null;

  const chainConfig = ALL_CHAINS[chainType];

  return (
    <div className={`flex items-center ${className}`}>
      <div className="w-5 h-5 flex items-center justify-center">
        <Img path={chainConfig.icon} className="w-full h-full object-cover" />
      </div>
    </div>
  );
};
