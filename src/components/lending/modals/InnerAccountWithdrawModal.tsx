import React, { useState, useMemo, useEffect } from "react";
import { DefaultModal } from "@/components/common/modal";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { shrinkToken } from "@/utils/numbers";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import Decimal from "decimal.js";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { formatSymbolName } from "@/utils/chainsUtil";
import { ASSETS_CHAINS_NEAR } from "@/services/chainConfig";
import InnerWithdrawChainsAction from "./innerWithdrawChainsAction";
import { ISelectWithdrawToken } from "@/interface/lending/tokens";
import { CloseButton } from "../actionModal/components";

interface InnerAccountWithdrawModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

export default function InnerAccountWithdrawModal({
  isOpen,
  onRequestClose,
}: InnerAccountWithdrawModalProps) {
  const balances = useAppSelector((state) => state.account.balances);
  const assets = useAppSelector((state) => state.assets.data);

  const availableTokens = useMemo(() => {
    if (!balances || !assets) return [];

    const { WRAP_NEAR_CONTRACT_ID } = config_near;
    const tokens: Array<ISelectWithdrawToken> = [];

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

      const { metadata, config } = asset;
      const amountRead = Number(shrinkToken(balance, metadata.decimals || 0));
      const amountToken = new Decimal(balance || "0").toFixed(
        0,
        Decimal.ROUND_DOWN
      );

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

      tokens.push({
        tokenId,
        symbol: formatSymbolName(metadata.symbol || tokenId),
        icon: metadata.icon || "",
        balance,
        amountRead,
        amountToken,
      });
    });

    return tokens.sort((a, b) => {
      return b.amountRead - a.amountRead;
    });
  }, [balances, assets]);

  const [selectedToken, setSelectedToken] = useState(
    availableTokens[0] || null
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedToken(availableTokens[0] || null);
    }
  }, [isOpen, availableTokens]);

  return (
    <DefaultModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div className="bg-white rounded-[20px] p-6 lg:w-[460px] max-sm:w-[95vw] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-black">Inner account</h2>
          <CloseButton onClose={onRequestClose} className="cursor-pointer" />
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-20 mb-3">Select token</div>
          <div className="gap-1 flex-wrap grid grid-cols-2">
            {availableTokens.map((token) => (
              <button
                key={token.tokenId}
                onClick={() => setSelectedToken(token)}
                className={`flex items-center justify-between gap-2 px-4 py-3 rounded-lg border transition-all ${
                  selectedToken?.tokenId === token.tokenId
                    ? "border-black bg-w-10"
                    : "border-gray-30 bg-white hover:border-gray-40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={token.icon}
                    alt={token.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-sm font-medium text-gray-50">
                    {token.symbol}
                  </span>
                </div>
                <div>
                  {beautifyNumber({
                    num: token.amountRead,
                    className: "text-base",
                  })}
                </div>
              </button>
            ))}
          </div>
          {/* Select destination chain */}
          <div>
            <div className="text-gray-40 text-sm mt-5 mb-4">
              Select destination chain
            </div>
            <InnerWithdrawChainsAction
              selectedToken={selectedToken}
              onRequestClose={onRequestClose}
            />
          </div>
        </div>
      </div>
    </DefaultModal>
  );
}
