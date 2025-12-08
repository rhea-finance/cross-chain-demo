import React from "react";
import { Img } from "./img";
import { EVM_CHAINS, SOLANA_CHAIN, BTC_CHAIN } from "@/services/chainConfig";

const CHAIN_COLORS = {
  Solana: "#000000",
  Avalanche: "#E84142",
  Bitcoin: "#F7931A",
  Ethereum: "#627EEA",
  Optimism: "#FF0420",
  BSC: "#F3BA2F",
} as const;

interface ChainIconsProps {
  showCount?: boolean;
  className?: string;
}

export const ChainIcons: React.FC<ChainIconsProps> = ({
  showCount = false,
  className = "",
}) => {
  const chains = [SOLANA_CHAIN, ...EVM_CHAINS, BTC_CHAIN];

  return (
    <div className={`flex items-center ${className}`}>
      {chains.map((chain, index) => (
        <div
          key={chain.label}
          className="w-5 h-5 rounded-full flex items-center justify-center border border-white"
          style={{
            marginLeft: index > 0 ? "-6px" : "0",
            backgroundColor:
              CHAIN_COLORS[chain.label as keyof typeof CHAIN_COLORS] ||
              "#ffffff",
          }}
        >
          <Img
            path={chain.icon}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      ))}
      {showCount && (
        <span className="text-sm ml-3 font-medium">{chains.length} Chains</span>
      )}
    </div>
  );
};
