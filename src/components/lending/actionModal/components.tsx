import { Icon } from "@iconify/react";
import Decimal from "decimal.js";
import React, { useEffect, useState, useMemo } from "react";
import { BeatLoader } from "react-spinners";
import { cn } from "@heroui/react";
import { actionMapTitle } from "./utils";
import { TOKEN_FORMAT } from "@/services/constantConfig";
import { useDegenMode } from "@/hooks/lending/hooks";
import { useAppSelector, useAppDispatch } from "@/hooks/lending/useRedux";
import { toggleUseAsCollateral } from "@/redux/slice/appSlice";
import { isInvalid, formatWithCommas_usd } from "@/utils/uiNumber";
import { EnterSolidSubmitButton, OutSolidSubmitButton } from "./button";
import { TipIcon, CloseIcon, WarnIcon, ArrowRight } from "./svg";
import { TagToolTip } from "@/components/toolTip";
import { Asset } from "@rhea-finance/cross-chain-sdk";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { BTC_ICON, INTENTS_TOKENS } from "@/services/chainConfig";
import { config_near, IChain, NDeposit } from "@rhea-finance/cross-chain-sdk";
import { shrinkToken } from "@/utils/numbers";
import { LENDING_STORAGE_DEPOSIT } from "@/services/constantConfig";
import { getAssets } from "@/redux/selectors/assetsSelectors";
import { ICreateFeeToken } from "@/interface/lending/chains";
import { useChainAppStore } from "@/stores/chainApp";
import { DefaultToolTip } from "@/components/toolTip";
import { LightningIcon } from "@/components/lending/icon";

export const CloseButton = ({ onClose, ...props }: any) => (
  <CloseIcon onClick={onClose} {...props} />
);

export const ModalTitle = ({ asset, onClose }: any) => {
  const { action, symbol } = asset;
  return (
    <div className="lg:mb-5">
      <div className="flex items-center justify-between text-lg text-b-10">
        <div className={`flex items-center flex-wrap gap-1.5`}>
          {actionMapTitle[action]}{" "}
          <span className="text-base text-b-10">{symbol}</span>
        </div>
        <CloseButton onClose={onClose} className="cursor-pointer" />
      </div>
    </div>
  );
};
export const RepayTab = ({ asset }: any) => {
  const { action } = asset;
  const isRepay = action === "Repay";
  const { degenMode, isRepayFromDeposits, setRepayFromDeposits } =
    useDegenMode();
  return (
    <div className="mb-[20px]">
      {isRepay && degenMode.enabled && (
        <div className="flex items-center justify-between rounded-md bg-gray-230 h-[46px] mt-5 p-[3px]">
          <span
            onClick={() => setRepayFromDeposits(false)}
            className={`flex items-center justify-center flex-grow w-1 h-full text-sm rounded-md cursor-pointer ${
              isRepayFromDeposits ? "text-black/50" : "text-black bg-white"
            }`}
          >
            From Wallet
          </span>
          <span
            onClick={() => setRepayFromDeposits(true)}
            className={`flex items-center justify-center flex-grow w-1 h-full text-sm rounded-md cursor-pointer ${
              isRepayFromDeposits ? "text-black bg-white" : "text-black/50"
            }`}
          >
            From Supplied
          </span>
        </div>
      )}
    </div>
  );
};
export const Available = ({ totalAvailable, available$ }: any) => (
  <div className="flex items-center">
    <div className="text-sm">
      Available:{" "}
      {Number(totalAvailable).toLocaleString(undefined, TOKEN_FORMAT as any)} (
      {available$})
    </div>
  </div>
);

export const HealthFactor = ({
  value,
  title,
}: {
  value: number;
  title?: string;
}) => {
  const healthFactorColor =
    value === -1
      ? "text-green-50"
      : value <= 100
      ? "text-red-60"
      : value <= 180
      ? "text-yellow-10"
      : "text-green-50";
  const healthFactorDisplayValue =
    value === -1 ? "10000%" : `${value?.toFixed(2)}%`;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">{title || "Health Factor"}</span>
      <span className={`text-sm ${healthFactorColor}`}>
        {healthFactorDisplayValue}
      </span>
    </div>
  );
};
export const BorrowLimit = ({
  from,
  to,
}: {
  from: string | number | Decimal;
  to: string | number | Decimal;
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">Borrow limit</span>
      <div className="flex items-center text-sm">
        <span className="text-gray-220 line-through">
          {formatWithCommas_usd(from)}
        </span>
        <ArrowRight className="mx-1.5" />
        <span className="text-b-10">{formatWithCommas_usd(to)}</span>
      </div>
    </div>
  );
};

export const StorageDeposit = ({
  token,
  amount,
}: {
  token: Asset;
  amount: string | number;
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">Storage Deposit</span>
      <div className="flex items-center text-sm gap-1">
        <img src={token?.metadata?.icon} className="w-5 h-5" alt="" />
        <span className="text-b-10">{beautifyNumber({ num: amount })}</span>
      </div>
    </div>
  );
};

export const SetUpFeeSelector = ({
  selectedFeeTokenData,
  setSelectedFeeTokenData,
  chain,
  subChain,
  uniqueTokenId,
  from,
}: {
  selectedFeeTokenData: ICreateFeeToken;
  setSelectedFeeTokenData: (v: ICreateFeeToken) => void;
  chain: IChain;
  subChain?: string;
  uniqueTokenId?: string;
  from?: "supply";
}) => {
  const [list, setList] = useState<ICreateFeeToken[]>([]);
  const [show, setShow] = useState<boolean>(false);
  const assets = useAppSelector(getAssets);
  const chainAppStore = useChainAppStore();
  const nearValuesPaged = chainAppStore.getNearValuesPaged();
  const createMcaFeePaged = chainAppStore.getCreateMcaFeePaged();
  // get all fee token data
  useEffect(() => {
    getSetUpFeeAmount();
  }, [uniqueTokenId, nearValuesPaged, createMcaFeePaged, assets]);

  // get all fee token ui data
  const nearAssetsSupportChainsMap: Record<string, string[]> = useMemo(() => {
    const map = getNearAssetsChainAssetsMap();
    return map;
  }, []);
  const { btc_fee_data, unique_fee_data, other_fee_list, all_fee_map } =
    useMemo(() => {
      const btc_fee_data = list.find(
        (item) => item.tokenId == config_near.NBTCTokenId
      );
      const unique_fee_data = list.find(
        (item) => item.tokenId == uniqueTokenId
      );
      const _other_fee_list = list.filter(
        (item) => item.tokenId !== config_near.NBTCTokenId
      );
      const other_fee_list = _other_fee_list.filter((item) => {
        const supportChains = nearAssetsSupportChainsMap[item.tokenId];
        const showit = supportChains.includes(
          chain == "evm" ? subChain?.toLowerCase() : chain?.toLowerCase()
        );
        return showit;
      });
      const all_fee_map: Record<string, ICreateFeeToken> = list.reduce(
        (acc, cur) => {
          acc[cur.tokenId] = cur;
          return acc;
        },
        {}
      );
      return {
        btc_fee_data,
        unique_fee_data,
        other_fee_list,
        all_fee_map,
      };
    }, [list, uniqueTokenId]);
  // init create fee token
  useEffect(() => {
    if (uniqueTokenId && all_fee_map?.[uniqueTokenId]) {
      setSelectedFeeTokenData(all_fee_map[uniqueTokenId]);
    } else if (chain == "btc" && all_fee_map?.[config_near.NBTCTokenId]) {
      setSelectedFeeTokenData(all_fee_map[config_near.NBTCTokenId]);
    } else {
      setSelectedFeeTokenData(other_fee_list?.[0]);
    }
  }, [
    JSON.stringify(Object.keys(all_fee_map)),
    JSON.stringify(Object.keys(other_fee_list || {})),
    chain,
    uniqueTokenId,
  ]);
  function getSetUpFeeAmount() {
    const list = Object.entries(createMcaFeePaged || {}).map(
      ([tokenId, amount]) => {
        const asset = assets?.data?.[tokenId];
        // token amount map 1 near
        const amount_one_near =
          tokenId == config_near.WRAP_NEAR_CONTRACT_ID
            ? NDeposit(1)
            : nearValuesPaged[tokenId];
        const actual_amount = new Decimal(amount_one_near || 0)
          .mul(LENDING_STORAGE_DEPOSIT)
          .plus(amount || 0);
        const total_amount = actual_amount
          .mul(1.05)
          .toFixed(0, Decimal.ROUND_UP);

        const total_amount_read = shrinkToken(
          total_amount,
          asset?.metadata?.decimals || 0
        );
        const actual_amount_read = shrinkToken(
          actual_amount.toFixed(),
          asset?.metadata?.decimals || 0
        );
        return {
          tokenId,
          totalFeeAmout: total_amount,
          totalFeeAmoutRead: total_amount_read,
          actualAmount: actual_amount.toFixed(),
          actualAmountRead: actual_amount_read,
          metadata: asset?.metadata,
          price: asset?.price?.usd || 0,
        };
      }
    );
    setList(list);
  }
  function getNearAssetsChainAssetsMap() {
    const list = Object.values(INTENTS_TOKENS);
    const map = list.reduce((acc, cur) => {
      acc[cur.near.contractAddress] = [];
      if (cur.solana) {
        acc[cur.near.contractAddress].push("solana");
      }
      if (cur.btc) {
        acc[cur.near.contractAddress].push("btc");
      }
      if (cur.evm) {
        const arr = Object.keys(cur.evm).map((i) => i.toLowerCase());
        acc[cur.near.contractAddress].push(...arr);
      }
      return acc;
    }, {});
    return map;
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-40">{from ? "Fee" : "Setup Fee"}</span>
      {chain == "btc" ? (
        <div className="flex items-center text-sm gap-1">
          <img src={BTC_ICON} className="w-5 h-5" alt="" />
          <span className="text-b-10">
            {beautifyNumber({ num: btc_fee_data?.totalFeeAmoutRead || 0 })}
          </span>
        </div>
      ) : uniqueTokenId ? (
        <div className="flex items-center text-sm gap-1 text-b-10">
          ≈
          <img
            src={selectedFeeTokenData?.metadata?.icon}
            className="w-5 h-5"
            alt=""
          />
          <span className="text-b-10">
            {beautifyNumber({
              num:
                from == "supply"
                  ? unique_fee_data?.actualAmountRead || 0
                  : unique_fee_data?.totalFeeAmoutRead || 0,
            })}
          </span>
        </div>
      ) : (
        <div className="relative">
          <div
            className="flex items-center justify-between border border-gray-30 p-1.5 rounded-lg gap-2 w-[max-content] bg-white cursor-pointer"
            onClick={() => {
              setShow(!show);
            }}
          >
            <div className="flex items-center gap-1">
              <img
                className="w-5 h-5 rounded-full"
                src={selectedFeeTokenData?.metadata?.icon}
                alt=""
              />
              <span className="text-sm text-black">
                {selectedFeeTokenData?.totalFeeAmoutRead}
              </span>
            </div>
            <Icon icon="mingcute:down-line" className="text-xl text-b-20" />
          </div>

          <div
            className={`flex flex-col gap-1 absolute right-0 border border-gray-30 rounded-lg p-1 top-[40px] w-[max-content] bg-white ${
              show ? "" : "hidden"
            }`}
          >
            {other_fee_list?.map((item) => {
              const { tokenId, metadata, totalFeeAmoutRead } = item;
              return (
                <div
                  className="flex items-center justify-between gap-10 cursor-pointer hover:bg-black/10 rounded p-1"
                  key={tokenId}
                  onClick={() => {
                    setSelectedFeeTokenData(item);
                    setShow(false);
                  }}
                >
                  <img
                    src={metadata?.icon}
                    className="w-5 h-5 rounded-full"
                    alt=""
                  />
                  <span className="text-sm text-black">
                    {totalFeeAmoutRead}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const Receive = ({ value }: { value: string | number }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">Received Amount</span>
      <span className="text-b-10">
        {new Decimal(value || 0).gt(0) ? "≈" : ""}{" "}
        {beautifyNumber({
          num: value || 0,
          className: "text-b-10",
        })}
      </span>
    </div>
  );
};

export const CollateralSwitch = ({
  action,
  canUseAsCollateral,
  tokenId,
}: any) => {
  const [collateralStatus, setCollateralStatus] = useState<boolean>(true);
  const dispatch = useAppDispatch();
  const showToggle = action === "Supply";
  useEffect(() => {
    if (!canUseAsCollateral) {
      dispatch(toggleUseAsCollateral({ useAsCollateral: false }));
      setCollateralStatus(false);
    } else {
      dispatch(toggleUseAsCollateral({ useAsCollateral: true }));
      setCollateralStatus(true);
    }
  }, [tokenId]);
  useEffect(() => {
    if (!canUseAsCollateral) {
      dispatch(toggleUseAsCollateral({ useAsCollateral: false }));
      setCollateralStatus(false);
    } else {
      dispatch(toggleUseAsCollateral({ useAsCollateral: collateralStatus }));
    }
  }, [collateralStatus]);
  const handleSwitchToggle = (checked: boolean) => {
    setCollateralStatus(checked);
  };
  if (!showToggle) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">Use as Collateral</span>
      <div className="flex items-center">
        {!canUseAsCollateral && (
          <TagToolTip
            type="warn"
            title="This asset can't be used as collateral yet"
          />
        )}
        <Switch
          onChange={handleSwitchToggle}
          checked={collateralStatus}
          disabled={!canUseAsCollateral}
        />
      </div>
    </div>
  );
};

export const CollateralTip = () => {
  return (
    <div className="flex items-center gap-2.5">
      <WarnIcon />
      <span className="text-gray-50 text-sm">
        This asset cannot be used as collateral yet
      </span>
    </div>
  );
};

const Switch = ({ onChange, checked, disabled }: any) => {
  if (checked) {
    return (
      <div
        onClick={() => {
          onChange(false);
        }}
        className="flex items-center justify-end w-[36px] h-5 rounded-xl border border-gray-30 bg-green-10 cursor-pointer p-0.5"
      >
        <span className="w-4 h-4 rounded-full bg-linear_gradient_dark" />
      </div>
    );
  } else {
    return (
      <div
        onClick={() => {
          if (!disabled) {
            onChange(true);
          }
        }}
        className="flex items-center w-[36px] h-5 rounded-xl border border-gray-30 bg-dark-600 cursor-pointer p-0.5"
      >
        <span className="w-4 h-4 rounded-full bg-gray-50" />
      </div>
    );
  }
};

export const Rates = ({ rates }: any) => {
  if (!rates) return null;
  return rates.map(({ label, value, value$ }) => (
    <div key={label} className="flex items-center justify-between">
      <span className="text-sm text-gray-50">{label}</span>
      <div className="flex items-center">
        <span className="text-sm text-b-10">{value}</span>
        {!isInvalid(value$) && (
          <span className="text-xs text-gray-50 ml-1.5">
            ({formatWithCommas_usd(value$)})
          </span>
        )}
      </div>
    </div>
  ));
};

export const SubmitButton = ({
  action,
  disabled,
  onClick,
  loading,
  disabledText,
}: any) => {
  if (action === "Borrow" || action === "Repay")
    return (
      <OutSolidSubmitButton disabled={disabled || loading} onClick={onClick}>
        {loading ? (
          <BeatLoader size={5} color="#16161B" />
        ) : (
          disabledText || action
        )}
      </OutSolidSubmitButton>
    );

  return (
    <EnterSolidSubmitButton disabled={disabled || loading} onClick={onClick}>
      {loading ? (
        <BeatLoader size={5} color="#16161B" />
      ) : disabledText ? (
        disabledText
      ) : action === "Adjust" ? (
        "Confirm"
      ) : (
        action
      )}
    </EnterSolidSubmitButton>
  );
};

export const Alerts = ({ data, errorClassName }: any) => {
  const sort = (b: any, a: any) => {
    if (b[1].severity === "error") return 1;
    if (a[1].severity === "error") return -1;
    return 0;
  };

  return (
    <div className={`flex flex-col gap-4`}>
      {Object.entries(data)
        .sort(sort)
        .map(([alert]) => {
          if (data[alert].severity === "warning") {
            return <AlertWarning key={alert} title={data[alert].title} />;
          } else {
            return (
              <AlertError
                className={cn("pb-5 -mb-7", errorClassName || "")}
                key={alert}
                title={data[alert].title}
              />
            );
          }
        })}
    </div>
  );
};

export const AlertWarning = ({
  title,
  className,
}: {
  title: string;
  className?: string;
}) => {
  return (
    <div className={`text-yellow-10 text-sm ${className || ""}`}>{title}</div>
  );
};

export const AlertError = ({
  title,
  className,
}: {
  title: string;
  className?: string;
}) => {
  return (
    <div
      className={`flex items-start gap-2 text-red-10 text-sm bg-red-10/10 rounded-md p-3 ${
        className || ""
      }`}
    >
      <TipIcon className="flex-shrink-0 relative top-1" />
      {title}
    </div>
  );
};

export const Fee = ({
  requireBridgeAction,
  requireRelayerAction,
  isSetup,
  bridgeValue,
  relayerValue,
  setUpValue,
  loading,
}: {
  requireBridgeAction: boolean;
  requireRelayerAction: boolean;
  isSetup?: boolean;
  bridgeValue?: string | number;
  relayerValue?: string | number;
  setUpValue?: string | number;
  loading?: boolean;
}) => {
  const { actionFeeValue, totalFeeValue } = useMemo(() => {
    const actionFeeValue = new Decimal(0)
      .plus(requireRelayerAction ? relayerValue || 0 : 0)
      .plus(requireBridgeAction ? bridgeValue || 0 : 0)
      .toFixed();
    const totalFeeValue = new Decimal(0)
      .plus(isSetup ? setUpValue || 0 : 0)
      .plus(actionFeeValue)
      .toFixed();
    return {
      actionFeeValue,
      totalFeeValue,
    };
  }, [
    relayerValue,
    bridgeValue,
    setUpValue,
    requireBridgeAction,
    requireRelayerAction,
    isSetup,
  ]);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">Fee</span>
      {loading ? (
        <BeatLoader size={5} color="#16161B" />
      ) : (
        <DefaultToolTip
          tip={
            <div className="flex flex-col gap-2">
              {isSetup ? (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span>Setup Fee</span>
                  <span>
                    {beautifyNumber({
                      num: setUpValue || 0,
                      isUsd: true,
                      className: "text-xs text-white",
                    })}
                  </span>
                </div>
              ) : null}
              {requireBridgeAction ? (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span>Action Fee</span>
                  <span>
                    {beautifyNumber({
                      num: actionFeeValue,
                      isUsd: true,
                      className: "text-xs text-white",
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span>Relayer Fee</span>
                  <span>
                    {beautifyNumber({
                      num: relayerValue || 0,
                      isUsd: true,
                      className: "text-xs text-white",
                    })}
                  </span>
                </div>
              )}
            </div>
          }
        >
          <span className="text-sm text-b-10 border-b border-dashed cursor-pointer">
            {beautifyNumber({
              num: totalFeeValue,
              isUsd: true,
              className: "text-sm text-b-10",
            })}
          </span>
        </DefaultToolTip>
      )}
    </div>
  );
};

export function FasterTag() {
  return (
    <div className="flex items-center gap-0.5 bg-black h-5 rounded p-1 text-white text-[10px]">
      <LightningIcon />
      30-60s
    </div>
  );
}
