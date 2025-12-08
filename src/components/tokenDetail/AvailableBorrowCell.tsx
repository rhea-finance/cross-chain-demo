import React, { useMemo } from "react";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import { DEFAULT_POSITION } from "@/services/constantConfig";
import { useAvailableAssets } from "@/hooks/lending/hooks";
import { getRandomString } from "@/utils/common";
import { UIAsset } from "@/interface/lending/asset";
import { DefaultToolTip } from "../common/toolTip";
import { beautifyNumber, beautifyNumberV2 } from "@/utils/beautifyNumber";
const { NBTCTokenId } = config_near;

const AvailableBorrowCell = ({
  asset,
  borrowData,
}: {
  asset: UIAsset;
  borrowData: [string, number];
}) => {
  const assets = useAvailableAssets();
  const toolTipId = useMemo(() => {
    return getRandomString();
  }, []);
  function getName(position) {
    if (position === DEFAULT_POSITION) return "Standard Token";
    const t = assets.find((a: UIAsset) => a.tokenId === position);
    const symbols = t?.tokens?.reduce(
      (acc, cur, index) =>
        acc +
        (cur.metadata?.symbol || "") +
        (index !== t.tokens.length - 1 ? "-" : ""),
      ""
    );
    return `LP token (${symbols})`;
  }
  return (
    <div>
      <div className="flex items-center">
        <span className="text-sm text-black mr-2.5">
          {asset.tokenId == NBTCTokenId
            ? beautifyNumberV2({
                num: borrowData?.[1] || 0,
                maxDecimal: 8,
              })
            : beautifyNumber({
                num: borrowData?.[1] || 0,
              })}
        </span>
        <img src={asset?.icon} className="w-5 h-5 rounded-full" alt="" />
      </div>
    </div>
  );
};

export default AvailableBorrowCell;
