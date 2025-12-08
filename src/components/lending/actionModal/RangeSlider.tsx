import React, { useRef, useState, useEffect } from "react";
import { cn } from "@heroui/react";
import { formatPercent } from "@/utils/lendingUtil";

export default function RangeSlider(props: any) {
  const { value, onChange, action } = props;
  const [splitList] = useState([0, 25, 50, 75, 100]);
  const tipRef = useRef(null) as any;
  const valueRef = useRef(null) as any;
  useEffect(() => {
    if (valueRef.current) {
      valueRef.current.style.backgroundSize = `${value}% 100%`;
    }
    if (tipRef.current) {
      tipRef.current.style.left = `${+value}%`;
      const marginLeft = -13 - (20 * +value) / 100;
      tipRef.current.style.marginLeft = `${marginLeft}px`;
    }
  }, [value]);

  function changeValue(v: string, isClickValue?: boolean) {
    let matchedValue;
    const numValue = Number(v);
    if (isClickValue) {
      matchedValue = numValue;
    } else {
      const nearestValue = 100 / (splitList.length - 1);
      const ratio = Number(v) / nearestValue;
      const nearest = Math.round(ratio);
      if (!Number.isNaN(nearest)) {
        matchedValue = splitList[nearest];
      }
    }
    onChange(v, matchedValue);
  }

  const actionShowRedColor = action === "Borrow" || action === "Repay";
  return (
    <div className="mt-3 mb-12">
      <div className={cn("flex justify-between items-center mb-2")}>
        {splitList.map((p) => {
          return (
            <div
              key={p}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => {
                changeValue(p.toString(), true);
              }}
            >
              <span
                className={cn(
                  `flex items-center justify-center text-xs text-gray-50 w-11 py-0.5 rounded-lg`,
                  p === value ? "bg-gray-80" : ""
                )}
              >
                {formatPercent(p)}
              </span>
              <span
                style={{ height: "5px", width: "1px" }}
                className="bg-gray-300 mt-1"
              />
            </div>
          );
        })}
      </div>

      <div className="relative flex flex-col z-[1]">
        <input
          ref={valueRef}
          onChange={(e) => {
            changeValue(e.target.value);
          }}
          value={value}
          type="range"
          className={`w-full cursor-pointer ${
            actionShowRedColor ? "orangeInput" : "greenInput"
          }`}
          style={{ backgroundSize: "100% 100%" }}
          min="0"
          max="100"
          step="1"
        />
        <div
          className={`flex items-center justify-center absolute top-5 rounded-lg py-1 ${
            actionShowRedColor ? "bg-red-10" : "bg-green-10"
          }`}
          style={{ marginLeft: "-33px", left: "100%", width: "46px" }}
          ref={tipRef}
        >
          <span
            className={`text-sm ${
              actionShowRedColor ? "text-white" : "text-b-10"
            }`}
          >
            {formatPercent(value)}
          </span>
        </div>
      </div>
    </div>
  );
}
