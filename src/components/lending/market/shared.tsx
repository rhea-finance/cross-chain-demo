import React from "react";
import { Img } from "@/components/common/img";
import { toInternationalCurrencySystem_number } from "@/utils/uiNumber";
import { UIAsset } from "@/interface/lending/asset";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { DefaultToolTip } from "@/components/common/toolTip";
// Constants
export const POINT_TOKENS = [
  "xtoken.rhealab.near",
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  "6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near",
  "usdt.tether-token.near",
  "853d955acef822db058eb8505911ed77f175b99e.factory.bridge.near",
  "zec.omft.near",
  "eth.bridge.near",
  "wrap.near",
  "nbtc.bridge.near",
  "lst.rhealab.near",
] as const;

// Helper functions
export const isPointToken = (row: UIAsset) =>
  POINT_TOKENS.includes(row.tokenId as any);

export const getIcons = (row: UIAsset) => {
  const { isLpToken, tokens } = row;
  return (
    <div className="flex items-center justify-center flex-wrap w-[34px] flex-shrink-0">
      {isLpToken ? (
        tokens.map((token: any, index) => (
          <img
            key={token.token_id}
            src={token.metadata?.icon}
            alt=""
            className={`w-[20px] h-[20px] rounded-full relative ${
              index !== 0 && index !== 2 ? "-ml-1.5" : ""
            } ${index > 1 ? "-mt-1.5" : "z-10"}`}
          />
        ))
      ) : (
        <img src={row.icon} alt="" className="w-[26px] h-[26px] rounded-full" />
      )}
    </div>
  );
};

// Shared components
export const AssetCell = ({ asset }: { asset: UIAsset }) => (
  <div className="relative col-span-1 flex items-start justify-self-start">
    {getIcons(asset)}
    <div className="flex flex-col items-start ml-3">
      <div className="flex items-center gap-1">
        <span className="text-sm max-sm:text-base">{asset.symbol}</span>
      </div>
      <span className="text-xs text-gray-410 max-sm:hidden">
        {beautifyNumber({
          num: asset?.price,
          isUsd: true,
          className: "text-xs text-gray-410",
        })}
      </span>
    </div>
  </div>
);

export const SupplyAmountCell = ({ asset }: { asset: UIAsset }) => (
  <>
    {asset.can_deposit ? (
      <div className="max-sm:flex max-sm:items-center max-sm:gap-2">
        <p className="text-sm text-black">
          {beautifyNumber({
            num: asset.totalSupply,
            className: "text-sm text-black",
          })}
        </p>
        <p className="text-xs text-gray-50">
          {beautifyNumber({
            num: asset.totalSupplyMoney,
            isUsd: true,
            className: "text-xs text-gray-50",
          })}
        </p>
      </div>
    ) : (
      <p className="text-sm text-black">-</p>
    )}
  </>
);

export const BorrowAmountCell = ({ asset }: { asset: UIAsset }) => (
  <>
    {asset.can_borrow ? (
      <div className="max-sm:flex max-sm:items-center max-sm:gap-2">
        <p className="text-sm text-black">
          {beautifyNumber({
            num: asset.totalBorrowed,
            className: "text-sm text-black",
          })}
        </p>
        <p className="text-xs text-gray-50">
          {beautifyNumber({
            num: asset.totalBorrowedMoney,
            isUsd: true,
            className: "text-xs text-gray-50",
          })}
        </p>
      </div>
    ) : (
      <p className="text-sm text-black">-</p>
    )}
  </>
);

export const LiquidityCell = ({ asset }: { asset: UIAsset }) => (
  <>
    {asset.can_borrow ? (
      <div className="max-sm:flex max-sm:items-center max-sm:gap-2">
        <div className="text-sm text-black">
          {beautifyNumber({
            num: asset.availableLiquidity,
            className: "text-sm text-black",
          })}
        </div>
        <div className="text-xs text-gray-50">
          {beautifyNumber({
            num: asset.availableLiquidityMoney,
            isUsd: true,
            className: "text-xs text-gray-50",
          })}
        </div>
      </div>
    ) : (
      <div className="text-sm text-black">-</div>
    )}
  </>
);

export const PointTag = ({ multiple }: { multiple: string }) => {
  const getPointsText = (multiple: string) => {
    if (multiple === "1x") {
      return "Earn 50 points per $100";
    } else if (multiple === "2x") {
      return "Earn 100 points per $100";
    }
    return `${multiple} RHEA Points Reward`;
  };

  return (
    <DefaultToolTip
      tip={
        <span className="text-xs text-[#6A7279]">
          {getPointsText(multiple)}
        </span>
      }
      clickable
    >
      <div
        className="flex items-center justify-center rounded-[6px] gap-1 text-xs text-gray-410 h-[18px] bg-backgroundTertiary px-[6px] border-[0.5px] border-gray-480 w-fit cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        {multiple}
        <Img className="w-3 h-3" path="points-icon-v2.svg" />
      </div>
    </DefaultToolTip>
  );
};
