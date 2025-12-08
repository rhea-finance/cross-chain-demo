import React, { useState, useEffect } from "react";
import { ArrowRightIcon } from "./icon";
import Market from "./market";
import Yours from "./yours";
import { ChainIcons } from "../common/ChainIcons";

const HeaderBanner = () => (
  <div
    className="bg-green-10/10 rounded-2xl px-[26px] py-[30px] mb-9 relative border-2 
  border-green-70 flex items-start gap-[60px] max-sm:flex-col max-sm:px-5 max-sm:gap-4"
  >
    <div className="flex-1">
      <ChainIcons showCount className="mb-3 max-sm:mb-4" />
      <p className="text-[28px] font-bold mb-4 max-sm:text-2xl">
        Supply and Borrow Across Chains!
      </p>
      <p className="text-base text-black/70 max-sm:text-sm">
        Cross-Chain Lending is now live! Seamlessly manage your assets on
        Ethereum, Solana, Bitcoin Chain, and more from a single dashboard.
        Maximize your yield opportunities across the entire crypto ecosystem
        without the hassle of switching networks.
      </p>
    </div>
    <div
      onClick={() =>
        window.open(
          "https://guide.rhea.finance/docs/rhea-finance-cross-chain-lending-litepaper",
          "_blank"
        )
      }
      className="bg-white text-black px-3 py-2 rounded-lg flex-shrink-0 
    flex items-center gap-2 cursor-pointer max-sm:px-2 
    max-sm:py-[6px] max-sm:text-sm max-sm:ml-auto"
    >
      Learn More <ArrowRightIcon />
    </div>
  </div>
);

const TabSwitcher = ({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) => {
  return (
    <div className="p-1 flex w-fit mx-auto border border-gray-30 rounded-full text-lg font-medium mb-[18px]">
      <button
        onClick={() => onTabChange("Market")}
        className={`px-10 py-2 min-w-[160px] rounded-full text-black cursor-pointer ${
          activeTab === "Market" ? "bg-green-10" : ""
        }`}
      >
        Market
      </button>
      <button
        onClick={() => onTabChange("Yours")}
        className={`px-10 py-2 min-w-[160px] rounded-full text-black cursor-pointer ${
          activeTab === "Yours" ? "bg-green-10" : ""
        }`}
      >
        Yours
      </button>
    </div>
  );
};

const LendingPage = () => {
  const [activeTab, setActiveTab] = useState("Market");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("lendingActiveTab");
      if (savedTab === "Market" || savedTab === "Yours") {
        setActiveTab(savedTab);
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("lendingActiveTab", tab);
    }
  };

  return (
    <div className="text-black">
      <HeaderBanner />
      <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      {activeTab === "Market" ? <Market /> : <Yours />}
    </div>
  );
};

export default LendingPage;
