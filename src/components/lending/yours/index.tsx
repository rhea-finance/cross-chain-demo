import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { LightningIcon } from "../icon";
import { NetLiquidity } from "./NetLiquidity";
import { NetApy, NetApySimple } from "./netApy";
import { DailyRewards } from "./DailyRewards";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { useRewards } from "@/hooks/lending/useRewards";
import { usePortfolioAssets } from "@/hooks/lending/hooks";
import { SuppliedTable } from "./SuppliedTable";
import { BorrowedTable } from "./BorrowedTable";
import { HealthFactorCard } from "../market/HealthFactorCard";
import TransactionHistoryModal from "../modals/TransactionHistoryModal";
import { TagToolTip } from "@/components/toolTip";
import ClaimJoinModal from "@/components/layout/ClaimJoinModal";
import InnerAccountWithdrawModal from "../modals/InnerAccountWithdrawModal";
import { useAppSelector } from "@/hooks/lending/useRedux";
import Decimal from "decimal.js";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import { shrinkToken } from "@/utils/numbers";
import { ASSETS_CHAINS_NEAR } from "@/services/chainConfig";
import { formatSymbolName } from "@/utils/chainsUtil";

const Yours = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showInnerAccountWithdraw, setShowInnerAccountWithdraw] =
    useState(false);
  const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");
  const rewardsObj = useRewards();
  const [
    suppliedRows,
    borrowedRows,
    totalSuppliedUSD,
    totalBorrowedUSD,
    ,
    borrowedAll,
  ] = usePortfolioAssets();

  const handleTokenClick = useCallback(
    (tokenId: string) => router.push(`/tokenDetail/${tokenId}`),
    [router]
  );

  const balances = useAppSelector((state) => state.account.balances);
  const assets = useAppSelector((state) => state.assets.data);

  const innerAccountBalance = useMemo(() => {
    if (!balances || !assets) return 0;

    const { WRAP_NEAR_CONTRACT_ID } = config_near;
    let totalUsd = 0;

    Object.keys(balances).forEach((tokenId) => {
      if (
        tokenId === "near" ||
        tokenId === "totalNear" ||
        tokenId === WRAP_NEAR_CONTRACT_ID
      ) {
        return;
      }

      const balance = balances[tokenId];
      if (!balance || new Decimal(balance).lte(0)) {
        return;
      }

      const asset = assets[tokenId];
      if (!asset) {
        return;
      }

      const { metadata } = asset;
      const amountRead = Number(shrinkToken(balance, metadata.decimals || 0));

      if (amountRead <= 0) {
        return;
      }

      // Filter withdrawLimitAmount
      const symbol = formatSymbolName(metadata.symbol || tokenId);
      const chainAsset = ASSETS_CHAINS_NEAR.find(
        (item) =>
          item.symbol === symbol ||
          item.address === tokenId ||
          item.address.toLowerCase() === tokenId.toLowerCase()
      );

      if (chainAsset && chainAsset.withdrawLimitAmount) {
        const withdrawLimit = Number(chainAsset.withdrawLimitAmount);
        if (amountRead < withdrawLimit) {
          return;
        }
      }

      const tokenUsd = amountRead * +(asset.price?.usd || 0);
      totalUsd += tokenUsd;
    });

    return totalUsd;
  }, [balances, assets]);

  const hasInnerAccountBalance = innerAccountBalance > 0;

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-3 mb-3 max-sm:flex-col">
        <div className="flex-1 bg-white rounded-2xl p-6 border border-gray-30">
          <div className="flex items-center justify-between mb-[26px] max-sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-10 rounded-full" />
              <p className="text-base text-gray-20">YOUR INFO</p>
            </div>
            <div
              className="bg-gray-60 rounded-lg px-2 py-1 text-sm cursor-pointer hover:bg-gray-10 transition-colors"
              onClick={() => setShowTransactionHistory(true)}
            >
              Transaction history
            </div>
          </div>
          <div className="flex items-center w-[80%] max-sm:hidden">
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-20 mb-1">Net Liquidity</p>
              <div className="text-2xl font-bold text-b-10">
                <NetLiquidity />
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-10 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                Net APY
                <TagToolTip title="Net APY = Daily Total Profit / Your Net Liquidity * 365 days" />
              </div>
              <div className="text-2xl font-bold text-b-10">
                <NetApySimple />
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-10 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                Daily Rewards
                <TagToolTip title="Estimated daily profit" />
              </div>
              <div className="text-2xl font-bold text-b-10">
                <DailyRewards />
              </div>
            </div>
          </div>
          <div className="hidden max-sm:grid max-sm:grid-cols-2 max-sm:gap-4">
            <div>
              <p className="text-sm text-gray-20 mb-1">Net Liquidity</p>
              <div className="text-xl font-bold text-b-10">
                <NetLiquidity />
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                Net APY
                <TagToolTip title="Net APY = Daily Total Profit / Your Net Liquidity * 365 days" />
              </div>
              <div className="text-xl font-bold text-b-10">
                <NetApySimple />
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                Daily Rewards
                <TagToolTip title="Estimated daily profit" />
              </div>
              <div className="text-xl font-bold text-b-10">
                <DailyRewards />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-20 mb-1">Unclaimed Reward</p>
              <div className="text-xl font-bold text-b-10 flex items-center gap-1">
                {beautifyNumber({
                  num: rewardsObj?.data?.totalUnClaimUSD,
                  isUsd: true,
                  className: "text-[24px] max-sm:text-xl",
                })}
                {rewardsObj?.data?.totalUnClaimUSD > 0 && (
                  <span
                    className="flex items-center justify-center text-xs text-dark-350 rounded-2xl px-2 h-5 bg-green-10 cursor-pointer"
                    onClick={() => {
                      setIsOpen(true);
                    }}
                  >
                    Claim
                  </span>
                )}
              </div>
            </div>
            {hasInnerAccountBalance && (
              <div>
                <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                  Inner Account
                  <TagToolTip title="Account token balances excluding NEAR" />
                </div>
                <div className="text-xl font-bold text-b-10 flex items-center gap-1">
                  {beautifyNumber({
                    num: innerAccountBalance,
                    isUsd: true,
                    className: "text-[24px] max-sm:text-xl",
                  })}
                  <span
                    className="flex items-center justify-center text-xs text-dark-350 rounded-2xl px-2 h-5 bg-green-10 cursor-pointer"
                    onClick={() => {
                      setShowInnerAccountWithdraw(true);
                    }}
                  >
                    Withdraw
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 w-[80%] flex items-center justify-between max-sm:hidden">
            <div className="flex-1 text-left">
              <p className="text-sm text-gray-20 mb-1">Unclaimed Rewards</p>
              <div className="text-2xl font-bold text-b-10 flex items-center gap-1">
                {beautifyNumber({
                  num: rewardsObj?.data?.totalUnClaimUSD,
                  isUsd: true,
                  className: "text-[24px]",
                })}
                {rewardsObj?.data?.totalUnClaimUSD > 0 && (
                  <div
                    className="flex items-center h-6 rounded-2xl bg-red-10/20"
                    onClick={() => {
                      setIsOpen(true);
                    }}
                  >
                    <span className="flex items-center justify-center text-sm text-dark-350 rounded-2xl px-3 h-6 bg-green-10 cursor-pointer">
                      Claim
                    </span>
                  </div>
                )}
              </div>
            </div>
            {hasInnerAccountBalance && (
              <div className="flex-1 text-left">
                <div className="text-sm text-gray-20 mb-1 flex items-center gap-1">
                  Inner Account
                  <TagToolTip title="Account token balances excluding NEAR" />
                </div>
                <div className="text-2xl font-bold text-b-10 flex items-center gap-1">
                  {beautifyNumber({
                    num: innerAccountBalance,
                    isUsd: true,
                    className: "text-[24px]",
                  })}
                  <span
                    className="flex items-center justify-center text-sm text-dark-350 rounded-2xl px-3 h-6 bg-green-10 cursor-pointer"
                    onClick={() => {
                      setShowInnerAccountWithdraw(true);
                    }}
                  >
                    Withdraw
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <HealthFactorCard />
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:hidden">
        <SuppliedTable
          suppliedRows={suppliedRows}
          totalSuppliedUSD={totalSuppliedUSD}
          onTokenClick={handleTokenClick}
        />
        <BorrowedTable
          borrowedRows={borrowedRows}
          totalBorrowedUSD={totalBorrowedUSD}
          onTokenClick={handleTokenClick}
        />
      </div>
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
              <SuppliedTable
                suppliedRows={suppliedRows}
                totalSuppliedUSD={totalSuppliedUSD}
                onTokenClick={handleTokenClick}
              />
            )}
            {activeTab === "borrow" && (
              <BorrowedTable
                borrowedRows={borrowedRows}
                totalBorrowedUSD={totalBorrowedUSD}
                onTokenClick={handleTokenClick}
              />
            )}
          </div>
        </div>
      </div>
      <TransactionHistoryModal
        isOpen={showTransactionHistory}
        onRequestClose={() => setShowTransactionHistory(false)}
      />
      <ClaimJoinModal isOpen={isOpen} onRequestClose={() => setIsOpen(false)} />
      <InnerAccountWithdrawModal
        isOpen={showInnerAccountWithdraw}
        onRequestClose={() => setShowInnerAccountWithdraw(false)}
      />
    </div>
  );
};

export default Yours;
