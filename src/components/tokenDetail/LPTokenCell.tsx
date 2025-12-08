import React, { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { shrinkToken } from "@/utils/numbers";
import { digitalProcess } from "@/utils/uiNumber";
import { getRandomString } from "@/utils/common";
import { IToken, UIAsset } from "@/interface/lending/asset";
import { Tooltip } from "@heroui/react";

const LPTokenCell = ({
  children,
  asset,
  balance,
}: {
  children: React.ReactNode;
  asset: UIAsset;
  balance: string | number;
}) => {
  const toolTipId = useMemo(() => {
    return getRandomString();
  }, []);
  const { tokens, isLpToken } = asset;
  function display_token_number(token: IToken) {
    const { amount, metadata } = token;
    const unit_amount = shrinkToken(amount, metadata?.decimals || 0);
    return digitalProcess(
      new Decimal(unit_amount || 0).mul(balance || 0).toFixed(),
      3
    );
  }
  if (!isLpToken) {
    return <span>{children}</span>;
  }
  return (
    <div>
      <span data-tooltip-id={toolTipId}>{children}</span>
      <Tooltip id={toolTipId}>
        <div className="flex flex-col gap-2.5">
          {tokens?.map((token: IToken) => {
            return (
              <div className="flex items-center" key={token.token_id}>
                <img
                  alt=""
                  src={token.metadata?.icon}
                  className="w-4 h-4 rounded-full mr-2"
                />
                <span className="text-xs text-white">
                  {display_token_number(token)}
                </span>
              </div>
            );
          })}
        </div>
      </Tooltip>
    </div>
  );
};

export default LPTokenCell;
