import React from "react";
import { useAvailableAssets, useBorrowChain } from "@/hooks/lending/hooks";
import { BaseMarket } from "./BaseMarket";

interface BorrowMarketProps {
  onTokenClick: (tokenId: string) => void;
}

export const BorrowMarket: React.FC<BorrowMarketProps> = ({ onTokenClick }) => {
  const { borrowChain, setChain } = useBorrowChain();
  const borrow = useAvailableAssets({ source: "borrow", chain: borrowChain });

  return (
    <BaseMarket
      assets={borrow || []}
      currentChain={borrowChain}
      onChainChange={setChain}
      onTokenClick={onTokenClick}
      marketType="borrow"
      title="BORROW MARKET"
      titleBgColor="bg-red-30"
      titleTextColor="text-red-20"
      actionButtonText="Borrow"
      actionButtonHoverColor="bg-orange-500"
    />
  );
};
