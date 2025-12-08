import React, { useState, useMemo, useCallback } from "react";
import { SearchIcon } from "../icon";
import Pagination from "../../common/Pagination";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showModal } from "@/redux/slice/appSlice";
import { ChainSelector } from "./ChainSelector";
import APYCell from "./APYCell";
import {
  AssetCell,
  SupplyAmountCell,
  BorrowAmountCell,
  LiquidityCell,
  PointTag,
  isPointToken,
} from "./shared";
import { UIAsset } from "@/interface/lending/asset";
import { beautifyNumber } from "@/utils/beautifyNumber";

interface BaseMarketProps {
  assets: UIAsset[];
  currentChain: string;
  onChainChange: (chain: string) => void;
  onTokenClick: (tokenId: string) => void;
  marketType: "supply" | "borrow";
  title: string;
  titleBgColor: string;
  titleTextColor: string;
  actionButtonText: string;
  actionButtonHoverColor: string;
}

export const BaseMarket: React.FC<BaseMarketProps> = ({
  assets,
  currentChain,
  onChainChange,
  onTokenClick,
  marketType,
  title,
  titleBgColor,
  titleTextColor,
  actionButtonText,
  actionButtonHoverColor,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 5;
  const dispatch = useAppDispatch();

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchTerm.trim()) return assets;

    return assets.filter((asset) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        asset.symbol?.toLowerCase().includes(searchLower) ||
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.tokenId?.toLowerCase().includes(searchLower)
      );
    });
  }, [assets, searchTerm]);

  const totalPages = useMemo(
    () => Math.ceil((filteredAssets?.length || 0) / itemsPerPage),
    [filteredAssets?.length, itemsPerPage]
  );

  const paginatedAssets = useMemo(() => {
    if (!filteredAssets) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const handlePageChange = useCallback(
    (page: number) => setCurrentPage(page),
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    },
    []
  );

  const handleActionClick = useCallback(
    (e: React.MouseEvent, asset: UIAsset) => {
      e.stopPropagation();
      const action = marketType === "supply" ? "Supply" : "Borrow";
      dispatch(showModal({ action, tokenId: asset.tokenId, amount: "0" }));
    },
    [marketType, dispatch]
  );

  const renderDesktopTable = () => (
    <div className="h-[420px] overflow-y-auto max-sm:hidden">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-white">
          <tr className="border-y border-gray-10 text-sm text-gray-40">
            <th className="px-6 py-[14px]">Assets</th>
            {marketType === "supply" ? (
              <th>Total Supplied</th>
            ) : (
              <>
                <th>Total Borrowed</th>
                <th>Available Liquidity</th>
              </>
            )}
            <th>APY</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paginatedAssets?.map((asset) => (
            <tr
              key={asset.tokenId}
              className="hover:bg-gray-10/50 cursor-pointer"
              onClick={() => onTokenClick(asset.tokenId)}
            >
              <td className="px-6 py-[14px]">
                <AssetCell asset={asset} />
              </td>
              {marketType === "supply" ? (
                <td>
                  <SupplyAmountCell asset={asset} />
                </td>
              ) : (
                <>
                  <td>
                    <BorrowAmountCell asset={asset} />
                  </td>
                  <td>
                    <LiquidityCell asset={asset} />
                  </td>
                </>
              )}
              <td>
                <div className="flex flex-col whitespace-nowrap">
                  <span className="text-sm">
                    {marketType === "supply" ? (
                      asset.can_deposit ? (
                        <APYCell
                          rewards={asset.depositRewards}
                          baseAPY={asset.supplyApy}
                          page="deposit"
                          tokenId={asset.tokenId}
                          onlyMarket
                          textColor="text-green-110"
                        />
                      ) : (
                        "-"
                      )
                    ) : asset.can_borrow ? (
                      <APYCell
                        rewards={asset.borrowRewards}
                        baseAPY={asset.borrowApy}
                        page="borrow"
                        tokenId={asset.tokenId}
                        onlyMarket
                        textColor="text-red-70"
                      />
                    ) : (
                      "-"
                    )}
                  </span>
                  {/* <span className="mt-2">
                    {isPointToken(asset) && <PointTag multiple="2x" />}
                  </span> */}
                </div>
              </td>
              <td className="pr-6 w-20">
                <button
                  onClick={(e) => handleActionClick(e, asset)}
                  className={`border border-gray-30 rounded-lg h-[34px] flex items-center 
                  justify-center w-[60px] text-sm text-black hover:${actionButtonHoverColor} 
                  hover:text-black hover:border-${actionButtonHoverColor} transition-colors`}
                >
                  {actionButtonText}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileCards = () => (
    <div className="hidden max-sm:block space-y-4 py-2">
      {paginatedAssets?.map((asset) => (
        <div
          key={asset.tokenId}
          className="bg-white rounded-2xl p-4 border border-gray-30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTokenClick(asset.tokenId)}
        >
          <div className="flex items-center justify-between mb-3 border-b border-gray-30 pb-3">
            <div className="flex items-center gap-3">
              <AssetCell asset={asset} />
            </div>
            <div className="text-sm text-black">
              {beautifyNumber({
                num: asset.price,
                isUsd: true,
                className: "text-sm text-black",
              })}
            </div>
          </div>

          {marketType === "supply" ? (
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-50">Total Supplied</div>
              <SupplyAmountCell asset={asset} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-50">Total Borrowed</div>
                <BorrowAmountCell asset={asset} />
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-50">Available Liquidity</div>
                <LiquidityCell asset={asset} />
              </div>
            </>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-50">APY</div>
            <div className="flex items-end flex-col gap-2">
              <div className="text-sm">
                {marketType === "supply" ? (
                  asset.can_deposit ? (
                    <APYCell
                      rewards={asset.depositRewards}
                      baseAPY={asset.supplyApy}
                      page="deposit"
                      tokenId={asset.tokenId}
                      onlyMarket
                      textColor="text-green-110"
                    />
                  ) : (
                    "-"
                  )
                ) : asset.can_borrow ? (
                  <APYCell
                    rewards={asset.borrowRewards}
                    baseAPY={asset.borrowApy}
                    page="borrow"
                    tokenId={asset.tokenId}
                    onlyMarket
                    textColor="text-red-70"
                  />
                ) : (
                  "-"
                )}
              </div>
              {/* <div className="flex items-center gap-2">
                {isPointToken(asset) && <PointTag multiple="2x" />}
              </div> */}
            </div>
          </div>

          <button
            onClick={(e) => handleActionClick(e, asset)}
            className={`w-full border border-black rounded-lg h-[40px] flex items-center justify-center 
            text-sm text-black hover:${actionButtonHoverColor} hover:text-black hover:border-${actionButtonHoverColor} transition-colors`}
          >
            {actionButtonText}
          </button>
        </div>
      ))}
    </div>
  );

  const renderSearchAndPagination = () => (
    <>
      <div className="border-t border-gray-30 px-6 pt-4 flex items-center justify-between max-sm:hidden">
        <div className="flex items-center gap-2">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search Token"
            value={searchTerm}
            onChange={handleSearchChange}
            className="text-sm text-gray-20"
          />
        </div>
        <div className="text-sm text-gray-20">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <div className="hidden max-sm:block px-4 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search Token"
            value={searchTerm}
            onChange={handleSearchChange}
            className="text-sm text-gray-20 flex-1"
          />
        </div>
        <div className="text-sm text-gray-20 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-2xl py-4 border border-gray-30 max-sm:border-0 max-sm:rounded-none">
      <div
        className={`${titleBgColor} rounded-lg h-[62px] flex items-center justify-center ${titleTextColor} text-lg font-bold mb-[18px] mx-4 max-sm:hidden`}
      >
        {title}
      </div>
      <div className="flex items-center justify-between h-[42px] mb-3 mx-4 max-sm:mx-0">
        <ChainSelector
          currentChain={currentChain}
          onChainChange={onChainChange}
        />
      </div>

      {renderDesktopTable()}
      {renderMobileCards()}
      {renderSearchAndPagination()}
    </div>
  );
};
