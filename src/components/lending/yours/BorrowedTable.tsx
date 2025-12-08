import React from "react";
import { Button } from "@heroui/react";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { DefaultToolTip } from "@/components/common/toolTip";
import APYCell from "../market/APYCell";
import DashboardReward from "./dashboardReward";
import { useRepayTrigger } from "@/hooks/lending/useModal";
import { formatSymbolName } from "@/utils/chainsUtil";

interface BorrowedTableProps {
  borrowedRows: any;
  totalBorrowedUSD: any;
  onTokenClick?: (tokenId: string) => void;
}

export const BorrowedTable: React.FC<BorrowedTableProps> = ({
  borrowedRows,
  totalBorrowedUSD,
  onTokenClick,
}) => {
  return (
    <div className="bg-white rounded-2xl py-6 border border-gray-30 max-sm:border-none max-sm:py-4">
      <div className="flex items-center justify-between mb-5 mx-6 max-sm:mx-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-10 rounded-full" />
          <p className="text-base text-gray-20">YOUR BORROWED</p>
        </div>
        <div>
          {beautifyNumber({
            num: Number(totalBorrowedUSD) || 0,
            isUsd: true,
            className: "text-black text-base font-bold",
          })}
        </div>
      </div>
      {/* Desktop table */}
      <div className="h-[420px] overflow-y-auto max-sm:hidden">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="border-y border-gray-10 text-sm text-gray-40">
              <th className="px-6 py-[14px]">Assets</th>
              <th>Collateral Type</th>
              <th>APY</th>
              <th>Daily Reward</th>
              <th>Borrowed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {borrowedRows?.length ? (
              borrowedRows.map((row) => {
                return (
                  <BorrowRow
                    row={row}
                    key={row.tokenId}
                    onTokenClick={onTokenClick}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-[14px]">
                  <div className="flex items-center justify-center text-gray-50 min-h-[300px]">
                    You borrowed assets will appear here
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="hidden max-sm:block space-y-4 py-2">
        {borrowedRows?.length ? (
          borrowedRows.map((row) => {
            return (
              <BorrowMobileCard
                row={row}
                key={row.tokenId}
                onTokenClick={onTokenClick}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center text-gray-50 min-h-[300px] px-4">
            You borrowed assets will appear here
          </div>
        )}
      </div>
    </div>
  );
};

function BorrowRow({
  row,
  onTokenClick,
}: {
  row: any;
  onTokenClick?: (tokenId: string) => void;
}) {
  const { tokenId, collateralType, metadataLP, shadow_id } = row;
  const doRepay = useRepayTrigger(tokenId);
  let tokenNames = "";
  metadataLP?.tokens?.forEach((d, i) => {
    const isLast = i === metadataLP.tokens.length - 1;
    tokenNames += `${d.metadata.symbol}${!isLast ? "-" : ""}`;
  });
  const row_id = tokenId + "@" + shadow_id;
  const handleRowClick = () => {
    if (onTokenClick) {
      onTokenClick(row.tokenId);
    }
  };

  const symbolNode = formatSymbolName(row?.symbol || "");

  return (
    <tr key={row_id} className="hover:bg-gray-10/50" onClick={handleRowClick}>
      <td className="px-6 py-[14px] flex items-center gap-2">
        <img
          src={row?.icon}
          width={26}
          height={26}
          alt="token"
          className="rounded-full w-[26px] h-[26px]"
        />
        <div>
          <div className="text-sm text-black">
            {" "}
            {tokenId === "aurora" ? (
              <DefaultToolTip tip="This ETH has been deprecated. Please withdraw it.">
                {symbolNode}
              </DefaultToolTip>
            ) : (
              <div>{symbolNode}</div>
            )}
          </div>
          <p className="text-xs text-gray-50">${row.price}</p>
        </div>
      </td>
      <td>
        <div className="text-sm text-black">
          <div>{collateralType}</div>
          <div className="text-gray-50 text-xs">{tokenNames}</div>
        </div>
      </td>
      <td>
        <APYCell
          rewards={row?.borrowRewards}
          baseAPY={row?.borrowApy}
          page="borrow"
          tokenId={row?.tokenId}
          onlyMarket
        />
      </td>
      <td>
        {!row?.rewards?.length ? (
          "-"
        ) : (
          <DashboardReward rewardList={row.rewards} page="borrow" />
        )}
      </td>
      <td>
        <div title={row?.borrowed || "0"}>
          {beautifyNumber({
            num: row.borrowed,
          })}
        </div>
        <div className=" text-gray-50">
          {beautifyNumber({
            num: row.borrowed * row.price,
            isUsd: true,
            className: "text-xs text-gray-50",
          })}
        </div>
      </td>
      <td>
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            className="border border-gray-30 bg-white/15 h-[34px] text-sm text-black"
            onPress={doRepay}
          >
            Repay
          </Button>
        </div>
      </td>
    </tr>
  );
}

function BorrowMobileCard({
  row,
  onTokenClick,
}: {
  row: any;
  onTokenClick?: (tokenId: string) => void;
}) {
  const { tokenId, collateralType, metadataLP, shadow_id } = row;
  const doRepay = useRepayTrigger(tokenId);
  let tokenNames = "";
  metadataLP?.tokens?.forEach((d, i) => {
    const isLast = i === metadataLP.tokens.length - 1;
    tokenNames += `${d.metadata.symbol}${!isLast ? "-" : ""}`;
  });

  const handleCardClick = () => {
    if (onTokenClick) {
      onTokenClick(row.tokenId);
    }
  };

  const symbolNode = formatSymbolName(row?.symbol || "");

  return (
    <div
      className="bg-white rounded-2xl p-4 border border-gray-30 cursor-pointer hover:bg-gray-10/50 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-3 border-b border-gray-30 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={row?.icon}
            width={26}
            height={26}
            alt="token"
            className="rounded-full w-[26px] h-[26px]"
          />
          <div>
            <div className="text-sm text-black font-medium">
              {tokenId === "aurora" ? (
                <DefaultToolTip tip="This ETH has been deprecated. Please withdraw it.">
                  {symbolNode}
                </DefaultToolTip>
              ) : (
                <div>{symbolNode}</div>
              )}
            </div>
            <p className="text-xs text-gray-50">${row.price}</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            className="border border-gray-30 bg-white/15 h-[34px] text-sm text-black"
            onPress={doRepay}
          >
            Repay
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Collateral Type</div>
          <div className="text-right">
            <div className="text-sm text-black">{collateralType}</div>
            <div className="text-xs text-gray-50">{tokenNames}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">APY</div>
          <div>
            <APYCell
              rewards={row?.borrowRewards}
              baseAPY={row?.borrowApy}
              page="borrow"
              tokenId={row?.tokenId}
              onlyMarket
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Daily Reward</div>
          <div>
            {!row?.rewards?.length ? (
              "-"
            ) : (
              <DashboardReward rewardList={row.rewards} page="borrow" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-50">Borrowed</div>
          <div className="text-right">
            <div title={row?.borrowed || "0"}>
              {beautifyNumber({
                num: row.borrowed,
              })}
            </div>
            <div className="text-xs text-gray-50">
              {beautifyNumber({
                num: row.borrowed * row.price,
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
