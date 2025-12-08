import React, { useMemo, useCallback, useState } from "react";
import { useRouter } from "next/router";
import {
  formatWithCommas_usd,
  toInternationalCurrencySystem_usd,
} from "@/utils/uiNumber";
import { useProtocolNetLiquidity } from "@/hooks/lending/useNetLiquidity";
import { useRewards } from "@/hooks/lending/useRewards";
import { SupplyMarket } from "./SupplyMarket";
import { BorrowMarket } from "./BorrowMarket";
import { HealthFactorCard } from "./HealthFactorCard";
import { ChainIcons } from "../../common/ChainIcons";
import { beautifyNumber } from "@/utils/beautifyNumber";

const Market = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");

  const { protocolBorrowed, protocolDeposited, protocolNetLiquidity } =
    useProtocolNetLiquidity(false);
  const { tokenNetBalanceRewards } = useRewards();

  const totalRewards = useMemo(
    () =>
      tokenNetBalanceRewards.reduce(
        (acc, r) => acc + r.dailyAmount * r.price,
        0
      ),
    [tokenNetBalanceRewards]
  );

  const handleTokenClick = useCallback(
    (tokenId: string) => router.push(`/tokenDetail/${tokenId}`),
    [router]
  );

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-3 mb-3 max-sm:flex-col">
        <div className="flex-1 bg-white rounded-2xl p-6 border border-gray-30 max-sm:rounded-xl max-sm:px-4 max-sm:py-6">
          <div className="flex items-center gap-2 mb-[26px] max-sm:mb-4">
            <div className="w-2 h-2 bg-green-10 rounded-full" />
            <p className="text-base text-gray-20 max-sm:text-sm">MARKET INFO</p>
            <ChainIcons />
          </div>
          {/* Desktop layout */}
          <div className="flex items-center w-[80%] max-sm:hidden">
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-20 mb-1">Total Supplied</p>
              <p className="text-2xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolDeposited)}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-10 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-20 mb-1">Total Borrowed</p>
              <p className="text-2xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolBorrowed)}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-10 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-20 mb-1">Available Liquidity</p>
              <p className="text-2xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolNetLiquidity)}
              </p>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="hidden max-sm:grid max-sm:grid-cols-2 max-sm:gap-4">
            <div>
              <p className="text-sm text-gray-20 mb-1">Total Supplied</p>
              <p className="text-xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolDeposited)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-20 mb-1">Available Liquidity</p>
              <p className="text-xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolNetLiquidity)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-20 mb-1">Total Borrowed</p>
              <p className="text-xl font-bold text-b-10">
                {toInternationalCurrencySystem_usd(protocolBorrowed)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-20 mb-1">
                Platform Daily Rewards
              </p>
              <p className="text-xl font-bold text-b-10">
                {beautifyNumber({
                  num: totalRewards,
                  isUsd: true,
                  className: "text-xl font-bold text-[#00B789]",
                })}
              </p>
            </div>
          </div>

          {/* Desktop Platform Daily Rewards */}
          <div className="mt-6 max-sm:hidden">
            <p className="text-sm text-gray-20 mb-1">Platform Daily Rewards</p>
            <p className="text-2xl font-bold text-b-10">
              {beautifyNumber({
                num: totalRewards,
                isUsd: true,
                className: "text-2xl font-bold text-[#00B789]",
              })}
            </p>
          </div>
        </div>
        <HealthFactorCard />
      </div>
      {/* Desktop layout */}
      <div className="grid grid-cols-2 gap-3 max-sm:hidden">
        <SupplyMarket onTokenClick={handleTokenClick} />
        <BorrowMarket onTokenClick={handleTokenClick} />
      </div>

      {/* Mobile layout with dynamic tabs */}
      <div className="hidden max-sm:block">
        <div className="bg-white border border-gray-30 p-4 rounded-xl">
          {/* Mobile Tab Navigation */}
          <div className="flex border border-gray-300 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveTab("supply")}
              className={`flex-1 py-4 px-6 text-center relative ${
                activeTab === "supply"
                  ? "text-black font-bold"
                  : "text-black/30"
              }`}
            >
              SUPPLY
              {activeTab === "supply" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[66px] h-1 bg-green-10"></div>
              )}
            </button>
            <div className="w-px bg-gray-300 self-center h-6"></div>
            <button
              onClick={() => setActiveTab("borrow")}
              className={`flex-1 py-4 px-6 text-center transition-colors relative ${
                activeTab === "borrow"
                  ? "text-black font-bold"
                  : "text-gray-400 font-normal hover:text-gray-600"
              }`}
            >
              BORROW
              {activeTab === "borrow" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[66px] h-1 bg-green-10"></div>
              )}
            </button>
          </div>

          {/* Mobile Tab Content */}
          <div className="p-0">
            {activeTab === "supply" && (
              <SupplyMarket onTokenClick={handleTokenClick} />
            )}
            {activeTab === "borrow" && (
              <BorrowMarket onTokenClick={handleTokenClick} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;
