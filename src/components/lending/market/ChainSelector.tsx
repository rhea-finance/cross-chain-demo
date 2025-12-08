import React, { useMemo, useState } from "react";
import {
  EVM_CHAINS,
  SOLANA_CHAIN,
  BTC_CHAIN,
  CHAINS_FASTER,
} from "@/services/chainConfig";
import { Img } from "../../common/img";
import { LightningIcon } from "../icon";

interface ChainSelectorProps {
  currentChain: string | null;
  onChainChange: (chain: string | null) => void;
}

const CHAIN_COLORS = {
  solana: "#000000",
  bitcoin: "#F7931A",
  arbitrum: "#FFFFFF",
  ethereum: "#627EEA",
  base: "#0052FF",
  optimism: "#FF0420",
  polygon: "#8247E5",
  bsc: "#14151A",
} as const;

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  currentChain,
  onChainChange,
}) => {
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const availableChains = useMemo(() => {
    const chains = [
      {
        id: SOLANA_CHAIN.label.toLowerCase(),
        label: SOLANA_CHAIN.label,
        icon: SOLANA_CHAIN.icon,
      },
      {
        id: BTC_CHAIN.label.toLowerCase(),
        label: BTC_CHAIN.label,
        icon: BTC_CHAIN.icon,
      },
      ...EVM_CHAINS.map((chain) => ({
        id: chain.label.toLowerCase(),
        label: chain.label,
        icon: chain.icon,
      })),
    ];
    return chains;
  }, []);

  const hasLightningTag = (chainId: string) => {
    return CHAINS_FASTER.includes(chainId);
  };

  return (
    <div className="flex items-center gap-2">
      {availableChains.map((chain) => {
        const isSelected = currentChain === chain.id;
        const showLightningTag =
          hoveredChain === chain.id && hasLightningTag(chain.id);
        return (
          <div
            key={chain.id}
            className="relative"
            onMouseEnter={() => setHoveredChain(chain.id)}
            onMouseLeave={() => setHoveredChain(null)}
          >
            {showLightningTag && (
              <div
                className={`absolute left-1/2 transform -translate-x-1/2 
              z-10 flex items-center gap-1 bg-white border border-gray-30 
              rounded-lg text-xs text-gray-110 px-2 py-[6px] whitespace-nowrap ${
                isSelected ? "bottom-10" : "bottom-8"
              }`}
              >
                <span>{chain.label} </span>
                <div className="flex items-center gap-1 bg-black rounded px-1 h-4 whitespace-nowrap">
                  <LightningIcon className="w-2 h-3" />
                  <span className="text-white text-[10px] font-medium">
                    30-60s
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={() => onChainChange(chain.id)}
              className={`rounded-lg transition-all flex items-center justify-center ${
                isSelected
                  ? "border-2 border-green-10"
                  : "border border-gray-30"
              }`}
              style={{
                backgroundColor:
                  CHAIN_COLORS[chain.id as keyof typeof CHAIN_COLORS] ||
                  "#ffffff",
                opacity: isSelected ? 1 : 0.7,
                width: isSelected ? "42px" : "32px",
                height: isSelected ? "34px" : "26px",
              }}
            >
              <Img path={chain.icon} className="w-6 h-6 object-contain" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
