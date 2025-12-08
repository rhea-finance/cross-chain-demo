import React, { useState, useMemo } from "react";
import { MoreYoursIcon } from "../icon";
import { beautifyNumber } from "@/utils/beautifyNumber";
import APYCell from "../market/APYCell";
import DashboardReward from "./dashboardReward";
import { useWithdrawTrigger, useAdjustTrigger } from "@/hooks/lending/useModal";
import { ASSETS_CHAINS_SUPPORT_UI } from "@/services/chainConfig";
import { formatSymbolName } from "@/utils/chainsUtil";

interface SuppliedTableProps {
  suppliedRows: any;
  totalSuppliedUSD: any;
  onTokenClick?: (tokenId: string) => void;
}

export const SuppliedTable: React.FC<SuppliedTableProps> = ({
  suppliedRows,
  totalSuppliedUSD,
  onTokenClick,
}) => {
  return (
    <div className="bg-white rounded-2xl py-6 border border-gray-30 max-sm:border-none max-sm:py-4">
      <div className="flex items-center justify-between mb-5 mx-6 max-sm:mx-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-10 rounded-full" />
          <p className="text-base text-gray-20">YOUR SUPPLIED</p>
        </div>
        <div>
          {Number(totalSuppliedUSD) > 0
            ? beautifyNumber({
                num: Number(totalSuppliedUSD),
                isUsd: true,
                className: "text-black text-base font-bold",
              })
            : "$0"}
        </div>
      </div>
      {/* Desktop table */}
      <div className="h-[420px] overflow-y-auto max-sm:hidden">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="border-y border-gray-10 text-sm text-gray-40">
              <th className="px-6 py-[14px]">Assets</th>
              <th>APY</th>
              <th>Daily Rewards</th>
              <th>Collateral</th>
              <th>Supplied</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliedRows?.length ? (
              suppliedRows.map((row) => {
                return (
                  <SupplyRow
                    row={row}
                    key={row.tokenId}
                    onTokenClick={onTokenClick}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-[14px]">
                  <div className="flex items-center justify-center text-gray-50 min-h-[300px]">
                    Your supplied assets will appear here
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="hidden max-sm:block space-y-4 py-2">
        {suppliedRows?.length ? (
          suppliedRows.map((row) => {
            return (
              <SupplyMobileCard
                row={row}
                key={row.tokenId}
                onTokenClick={onTokenClick}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center text-gray-50 min-h-[300px] px-4">
            Your supplied assets will appear here
          </div>
        )}
      </div>
    </div>
  );
};

function SupplyRow({
  row,
  onTokenClick,
}: {
  row: any;
  onTokenClick?: (tokenId: string) => void;
}) {
  const doWithdraw = useWithdrawTrigger(row.tokenId);
  const doAdjust = useAdjustTrigger(row.tokenId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const { symbol: standardizeSymbol, metadata, icon, tokenId } = row || {};
  const { symbol } = metadata || {};
  const symbolNode = formatSymbolName(standardizeSymbol || symbol);
  const isSupportAsset = useMemo(() => {
    const _symbol = formatSymbolName(symbol);
    if (!_symbol) return false;
    const target = ASSETS_CHAINS_SUPPORT_UI.find(
      (item) => item.symbol?.toLowerCase() == _symbol.toLowerCase()
    );
    return !!target;
  }, [ASSETS_CHAINS_SUPPORT_UI, symbol]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsMenuOpen(true);
    }, 100);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsMenuOpen(false);
    }, 100);
    setHoverTimeout(timeout);
  };

  const handleWithdrawClick = () => {
    setIsMenuOpen(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    doWithdraw();
  };

  const handleAdjustClick = () => {
    setIsMenuOpen(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    doAdjust();
  };

  const handleRowClick = () => {
    if (onTokenClick) {
      onTokenClick(row.tokenId);
    }
  };

  const iconImg = (
    <img
      src={icon}
      width={26}
      height={26}
      alt="token"
      className="rounded-full w-[26px] h-[26px]"
      style={{ marginRight: 6, marginLeft: 3 }}
    />
  );

  return (
    <tr
      key={tokenId}
      className="hover:bg-gray-10/50 cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="px-6 py-[14px] flex items-center gap-2">
        {iconImg}
        <div>
          <div className="text-sm text-black">
            <div
              title={symbolNode}
              className="text-black w-[68px] overflow-hidden whitespace-nowrap text-ellipsis"
            >
              {symbolNode}
            </div>
          </div>
          <p className="text-xs text-gray-50">${row.price}</p>
        </div>
      </td>
      <td>
        <APYCell
          rewards={row?.depositRewards}
          baseAPY={row?.apy}
          page="deposit"
          tokenId={row?.tokenId}
          onlyMarket
        />
      </td>
      <td>
        {!row?.rewards?.length &&
        +(row?.supplyReward?.supplyDailyAmount || 0) === 0 ? (
          "-"
        ) : (
          <DashboardReward
            rewardList={row?.rewards}
            supplyReward={row?.supplyReward}
          />
        )}
      </td>
      <td className="pr-6">
        <div title={row?.collateral ? row?.collateral : "-"}>
          {beautifyNumber({
            num: row.collateral,
          })}
        </div>
        <div className=" text-gray-50">
          {row?.collateral
            ? beautifyNumber({
                num: row.collateral * row.price,
                isUsd: true,
                className: "text-xs text-gray-50",
              })
            : ""}
        </div>
      </td>
      <td>
        <div title={row.supplied}>
          {beautifyNumber({
            num: row.supplied,
          })}
        </div>
        <div className=" text-gray-50">
          {beautifyNumber({
            num: row.supplied * row.price,
            isUsd: true,
            className: "text-xs text-gray-50",
          })}
        </div>
      </td>
      <td className="pr-6">
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreYoursIcon className="cursor-pointer" />
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-[100px] bg-white border border-gray-30 rounded-xl p-2 shadow-lg z-10">
              {isSupportAsset ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-120/50 rounded-md transition-colors duration-150"
                  onClick={handleWithdrawClick}
                >
                  Withdraw
                </button>
              ) : null}

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-120/50 rounded-md transition-colors duration-150"
                onClick={handleAdjustClick}
              >
                Adjust
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function SupplyMobileCard({
  row,
  onTokenClick,
}: {
  row: any;
  onTokenClick?: (tokenId: string) => void;
}) {
  const doWithdraw = useWithdrawTrigger(row.tokenId);
  const doAdjust = useAdjustTrigger(row.tokenId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { symbol: standardizeSymbol, metadata, icon, tokenId } = row || {};
  const { symbol } = metadata || {};
  const symbolNode = formatSymbolName(standardizeSymbol || symbol);
  const isSupportAsset = useMemo(() => {
    const _symbol = formatSymbolName(symbol);
    if (!_symbol) return false;
    const target = ASSETS_CHAINS_SUPPORT_UI.find(
      (item) => item.symbol?.toLowerCase() == _symbol.toLowerCase()
    );
    return !!target;
  }, [ASSETS_CHAINS_SUPPORT_UI, symbol]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsMenuOpen(true);
    }, 100);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsMenuOpen(false);
    }, 100);
    setHoverTimeout(timeout);
  };

  const handleWithdrawClick = () => {
    setIsMenuOpen(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    doWithdraw();
  };

  const handleAdjustClick = () => {
    setIsMenuOpen(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    doAdjust();
  };

  const handleCardClick = () => {
    if (onTokenClick) {
      onTokenClick(row.tokenId);
    }
  };

  const iconImg = (
    <img
      src={icon}
      width={26}
      height={26}
      alt="token"
      className="rounded-full w-[26px] h-[26px]"
      style={{ marginRight: 6, marginLeft: 3 }}
    />
  );

  return (
    <div
      className="bg-white rounded-2xl p-4 border border-gray-30 cursor-pointer hover:bg-gray-10/50 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-3 border-b border-gray-30 pb-3">
        <div className="flex items-center gap-3">
          {iconImg}
          <div>
            <div className="text-sm text-black font-medium">
              <div title={symbolNode} className="text-black">
                {symbolNode}
              </div>
            </div>
            <p className="text-xs text-gray-50">${row.price}</p>
          </div>
        </div>
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreYoursIcon className="cursor-pointer" />
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-[100px] bg-white border border-gray-30 rounded-xl p-2 shadow-lg z-10">
              {isSupportAsset ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-120/50 rounded-md transition-colors duration-150"
                  onClick={handleWithdrawClick}
                >
                  Withdraw
                </button>
              ) : null}

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-120/50 rounded-md transition-colors duration-150"
                onClick={handleAdjustClick}
              >
                Adjust
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">APY</div>
          <div>
            <APYCell
              rewards={row?.depositRewards}
              baseAPY={row?.apy}
              page="deposit"
              tokenId={row?.tokenId}
              onlyMarket
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Daily Rewards</div>
          <div>
            {!row?.rewards?.length &&
            +(row?.supplyReward?.supplyDailyAmount || 0) === 0 ? (
              "-"
            ) : (
              <DashboardReward
                rewardList={row?.rewards}
                supplyReward={row?.supplyReward}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Collateral</div>
          <div className="text-right">
            <div title={row?.collateral ? row?.collateral : "-"}>
              {beautifyNumber({
                num: row.collateral,
              })}
            </div>
            <div className="text-xs text-gray-50">
              {row?.collateral
                ? beautifyNumber({
                    num: row.collateral * row.price,
                    isUsd: true,
                    className: "text-xs text-gray-50",
                  })
                : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Supplied</div>
          <div className="text-right">
            <div title={row.supplied}>
              {beautifyNumber({
                num: row.supplied,
              })}
            </div>
            <div className="text-xs text-gray-50">
              {beautifyNumber({
                num: row.supplied * row.price,
                isUsd: true,
                className: "text-xs text-gray-50",
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
