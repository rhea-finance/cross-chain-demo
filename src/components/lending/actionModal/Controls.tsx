import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { BeatLoader } from "react-spinners";
import { Icon } from "@iconify/react";
import { updateAmount } from "@/redux/slice/appSlice";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { beautifyNumber } from "@/utils/beautifyNumber";
import PercentList from "@/components/common/percentList";
import { useDegenMode } from "@/hooks/lending/hooks";
import RangeSlider from "./RangeSlider";
import { useChainAccountInstantStore } from "@/stores/chainAccount";

export default function Controls({
  amount,
  action,
  asset,
  totalAvailable,
  borrowedAmount,
  suppliedBalance,
  walletBalance,
}: any) {
  const [clearPercent, setClearPercent] = useState(0);
  const dispatch = useAppDispatch();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const { chain } = chainAccountInstantStore.getActionChainSeleced();
  const btcBalanceLoading = chainAccountInstantStore.getBtcBalanceLoading();
  const solanaBalanceLoading =
    chainAccountInstantStore.getSolanaBalanceLoading();
  const evmBalanceLoading = chainAccountInstantStore.getEvmBalanceLoading();
  const { isRepayFromDeposits } = useDegenMode();
  const isSupplyAction = action == "Supply";
  const balanceLoading = useMemo(() => {
    if (action == "Supply" || (action == "Repay" && !isRepayFromDeposits)) {
      return (
        (chain == "btc" && btcBalanceLoading) ||
        (chain == "evm" && evmBalanceLoading) ||
        (chain == "solana" && solanaBalanceLoading)
      );
    }
    return false;
  }, [
    btcBalanceLoading,
    solanaBalanceLoading,
    evmBalanceLoading,
    action,
    chain,
  ]);
  const maxAmount = useMemo(() => {
    if (action == "Repay" && isRepayFromDeposits) {
      return borrowedAmount;
    } else {
      return totalAvailable;
    }
  }, [totalAvailable, action, isRepayFromDeposits, borrowedAmount]);
  const { amount$, inputAmount } = useMemo(() => {
    const amount$ = beautifyNumber({
      num: new Decimal(amount || 0).mul(asset?.price || 0).toFixed(),
      isUsd: true,
      className: "text-gray-50",
    });
    const inputAmount = `${amount}`
      .replace(/[^0-9.-]/g, "")
      .replace(/(\..*)\./g, "$1")
      .replace(/(?!^)-/g, "")
      .replace(/^0+(\d)/gm, "$1");
    return {
      amount$,
      inputAmount,
    };
  }, [amount, asset?.price]);
  const sliderValue = useMemo(() => {
    const _total = maxAmount;
    const res =
      +_total == 0
        ? "0"
        : Decimal.min(Math.round((amount * 100) / _total) || 0, 100).toNumber();
    // for adjust init amount
    if (
      res == 100 &&
      new Decimal(_total || 0).gt(amount || 0) &&
      action == "Adjust"
    ) {
      return 99;
    }
    return res;
  }, [amount, maxAmount]);

  // manual input so need to be same with the user input format
  const handleInputChange = (e) => {
    const _total = maxAmount;
    const { value } = e.target;
    // const numRegex = /^([0-9]*\.?[0-9]*$)/;
    const numRegex = /^(?:\d+(?:\.\d*)?|\.\d+)?$/;
    if (
      !numRegex.test(value) ||
      (!isSupplyAction && Number(value) > Number(_total))
    ) {
      e.preventDefault();
      return;
    }
    changeAmount({
      value,
      isMax: false,
    });
    setClearPercent((pre) => pre + 1);
  };
  const handleTabChange = (key) => {
    const _total = maxAmount;
    const isMax = key == "100";
    const _amount = isMax
      ? _total
      : new Decimal(
          new Decimal(key)
            .div(100)
            .mul(_total || 0)
            .toFixed(asset.decimals, Decimal.ROUND_DOWN)
        ).toFixed();
    changeAmount({
      value: _amount,
      isMax,
    });
  };
  function handleRepayMaxAvailable() {
    let _amount;
    if (isRepayFromDeposits) {
      _amount = Decimal.min(
        borrowedAmount || 0,
        suppliedBalance || 0
      ).toFixed();
    } else {
      _amount = Decimal.min(walletBalance || 0, totalAvailable || 0).toFixed();
    }
    changeAmount({
      value: _amount,
      isMax: true,
    });
  }
  // auto input so can use Decimal to handle display amount
  const handleSliderChange = (percent) => {
    const _total = maxAmount;
    const p = Number(percent || 0);
    const _value = new Decimal(_total).mul(p).div(100).toFixed();
    let value;
    if (p == 100) {
      value = _total;
    } else {
      value = new Decimal(_value).toFixed(asset.decimals, Decimal.ROUND_DOWN);
    }
    dispatch(
      updateAmount({
        isMax: p === 100,
        amount: new Decimal(value || 0).toFixed(),
      })
    );
    setClearPercent((pre) => pre + 1);
  };
  function changeAmount({
    value,
    isMax,
  }: {
    value: string | number;
    isMax: boolean;
  }) {
    dispatch(
      updateAmount({
        isMax,
        amount: value.toString(),
      })
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {action == "Repay" ? (
          <div className="flex items-center text-sm text-gray-50 gap-1">
            <span className="text-sm text-gray-50">Borrowed</span>
            <span className="flex items-center text-sm">
              {beautifyNumber({
                num: borrowedAmount || 0,
                className: "text-gray-50",
              })}
            </span>
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-50 gap-1">
            <span className="text-sm text-gray-50">Available</span>
            <span className="flex items-center text-sm gap-2">
              {beautifyNumber({
                num: totalAvailable || 0,
                className: "text-gray-50",
              })}
              {balanceLoading ? (
                <Icon
                  icon="svg-spinners:ring-resize"
                  className="text-base flex-shrink-0"
                />
              ) : null}
            </span>
          </div>
        )}

        <PercentList onChange={handleTabChange} clear={clearPercent} />
      </div>
      {/* input field */}
      <div className="border border-b-20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <input
            type="text"
            value={inputAmount}
            onChange={handleInputChange}
            className="text-2xl font-bold text-b-10 outline-none flex-1 bg-transparent"
            placeholder="0.0"
          />
          <div className="flex items-center gap-2">
            {asset?.icon && (
              <img src={asset?.icon} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="text-base font-medium text-b-10">
              {asset?.symbol}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-50">{amount$}</div>
      </div>
      {/* Slider */}
      <RangeSlider
        value={sliderValue}
        onChange={handleSliderChange}
        action={action}
      />
      {/* balance field */}
      {action == "Repay" ? (
        <div className="flex items-center justify-between text-sm text-gray-50 pt-2">
          <span className="text-sm text-gray-50">
            {isRepayFromDeposits ? "Supplied" : "Balance"}
          </span>
          <span
            className="flex items-center text-sm underline text-b-10 cursor-pointer"
            onClick={() => {
              handleRepayMaxAvailable();
            }}
          >
            {beautifyNumber({
              num: isRepayFromDeposits
                ? suppliedBalance || 0
                : walletBalance || 0,
              className: "text-b-10",
            })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
