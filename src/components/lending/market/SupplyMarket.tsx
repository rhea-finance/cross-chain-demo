import React from "react";
import { useAvailableAssets, useSupplyChain } from "@/hooks/lending/hooks";
import { BaseMarket } from "./BaseMarket";

interface SupplyMarketProps {
  onTokenClick: (tokenId: string) => void;
}

export const SupplyMarket: React.FC<SupplyMarketProps> = ({ onTokenClick }) => {
  const { supplyChain, setChain } = useSupplyChain();
  const supply = useAvailableAssets({ source: "supply", chain: supplyChain });
  return (
    <BaseMarket
      assets={supply || []}
      currentChain={supplyChain}
      onChainChange={setChain}
      onTokenClick={onTokenClick}
      marketType="supply"
      title="SUPPLY MARKET"
      titleBgColor="bg-green-10/10"
      titleTextColor="text-green-20"
      actionButtonText="Supply"
      actionButtonHoverColor="bg-green-10"
    />
  );
};
