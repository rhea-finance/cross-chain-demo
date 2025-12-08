import Big from "big.js";
import Decimal from "decimal.js";
import { cn } from "@heroui/react";
import { isInvalid } from "./uiNumber";
import { toInternationalCurrencySystem } from "@/utils/numbers";
const efficientDigit = 5;
export function beautifyNumber({
  num,
  className,
  subClassName,
  isUsd,
  isPercent,
}: {
  num: string | number;
  className?: string;
  subClassName?: string;
  isUsd?: boolean;
  isPercent?: boolean;
}) {
  if (isInvalid(num))
    return (
      <Wrap className={className}>{isUsd ? "$-" : isPercent ? "-%" : num}</Wrap>
    );
  if (new Big(num || 0).gte(1.0e3)) {
    return (
      <Wrap className={className}>
        {isUsd
          ? "$" + toInternationalCurrencySystem(num?.toString() || "0")
          : isPercent
          ? toInternationalCurrencySystem(num?.toString() || "0") + "%"
          : toInternationalCurrencySystem(num?.toString() || "0")}
      </Wrap>
    );
  }
  num = new Big(num || 0).toFixed();
  const is_integer = !Big(num).toFixed().includes(".");
  if (is_integer)
    return (
      <Wrap className={className}>
        {(isUsd ? "$" : "") + num + (isPercent ? "%" : "")}
      </Wrap>
    );
  const arr = num.toString().split(".");
  const interPart = arr[0];
  const floatPart = arr[1];
  if (+interPart == 0 && num.toString().length <= efficientDigit + 2)
    return (
      <Wrap className={className}>
        {(isUsd ? "$" : "") + num + (isPercent ? "%" : "")}
      </Wrap>
    );
  if (+interPart !== 0 && num.toString().length <= efficientDigit + 1)
    return (
      <Wrap className={className}>
        {(isUsd ? "$" : "") + num + (isPercent ? "%" : "")}
      </Wrap>
    );

  if (+interPart == 0) {
    const nonZeroIndex = floatPart.split("").findIndex((n) => +n !== 0);
    const pendingNum = Big(num).toFixed(nonZeroIndex + 5, Big.roundDown);
    if (nonZeroIndex <= 1)
      return (
        <Wrap className={className}>
          {(isUsd ? "$" : "") +
            "0." +
            removeFootZero(pendingNum.split(".")[1]) +
            (isPercent ? "%" : "")}
        </Wrap>
      );
    const nonZeroPart = removeHeadAndFootZero(pendingNum.split(".")[1]);
    return (
      <Wrap className={className}>
        {isUsd ? "$" : ""}0.0
        <span
          className={cn("px-px text-green-10 leading-none", subClassName || "")}
          style={{ fontSize: "10px" }}
        >
          {nonZeroIndex}
        </span>
        {nonZeroPart}
        {isPercent ? "%" : ""}
      </Wrap>
    );
  } else {
    const floatPartLength = Math.max(efficientDigit - interPart.length, 2);
    const pendingNum = Big(num).toFixed(floatPartLength, Big.roundDown);
    const [onePart, twoPart] = pendingNum.split(".");
    const twoPartRemoveZreo = removeFootZero(twoPart);
    if (twoPartRemoveZreo) {
      return (
        <Wrap className={className}>
          {isUsd ? "$" : ""}
          {onePart}.{twoPartRemoveZreo}
          {isPercent ? "%" : ""}
        </Wrap>
      );
    }
    return (
      <Wrap className={className}>
        {(isUsd ? "$" : "") + onePart + (isPercent ? "%" : "")}
      </Wrap>
    );
  }
}

export const beautifyNumberV2 = ({
  num,
  isDollar,
  decimalPlaces = 5,
  digitsPlaces = 4,
  maxDecimal,
}: {
  num: string | number;
  isDollar?: boolean;
  decimalPlaces?: number;
  digitsPlaces?: number;
  maxDecimal?: number;
}) => {
  if (isInvalid(num)) return "-";
  if (new Decimal(num || 0).eq(0)) return "0";
  const numStr = new Decimal(num || 0).toFixed();
  const [integerPart, decimalPart = ""] = numStr.split(".");
  if (+integerPart >= 100) {
    const significantDigits = decimalPart.slice(0, 2).replace(/0+$/, "");
    return (
      <span key={num} className="animate-flipIn">
        {isDollar ? "$" : ""}
        {`${integerPart}${significantDigits ? `.${significantDigits}` : ""}`}
      </span>
    );
  } else if (+integerPart > 0 && +integerPart < 100) {
    let totalDigits = `${integerPart}${
      decimalPart ? `.${decimalPart}` : ""
    }`.slice(0, 6);
    if (decimalPart) {
      totalDigits = totalDigits.replace(/0+$/, "");
      if (totalDigits.endsWith(".")) {
        totalDigits = totalDigits.slice(0, -1);
      }
    }

    return (
      <span key={num} className="animate-flipIn">
        {isDollar ? "$" : ""}
        {totalDigits}
      </span>
    );
  }
  // 0.xxxxx
  const nonZeroIndex = decimalPart.split("").findIndex((n) => +n !== 0);
  if (nonZeroIndex <= 1) {
    let significantDigits = decimalPart
      .replace(/0+$/, "")
      .slice(0, maxDecimal || decimalPlaces);
    while (significantDigits.endsWith("0")) {
      significantDigits = significantDigits.slice(0, -1);
    }
    significantDigits = significantDigits.replace(/0+$/, "");
    return (
      <span key={num} className="animate-flipIn">
        {isDollar ? "$" : ""}
        {`${integerPart}${significantDigits ? `.${significantDigits}` : ""}`}
      </span>
    );
  }
  const nonZeroPart = decimalPart.substring(nonZeroIndex);
  let digits;
  if (new Decimal(maxDecimal || 0).gte(3)) {
    if (new Decimal(nonZeroIndex).gte(maxDecimal || 0)) {
      return "0";
    }
    digits = nonZeroPart.slice(
      0,
      Math.max(+(maxDecimal || 0) - +nonZeroIndex, 0)
    );
  } else {
    digits = nonZeroPart.slice(0, digitsPlaces);
  }
  while (digits.endsWith("0")) {
    digits = digits.slice(0, -1);
  }
  return (
    <span key={num} className="animate-flipIn">
      {isDollar ? "$" : ""}
      {+integerPart === 0 ? "0.0" : integerPart + ".0"}
      <span className="px-px text-green-10" style={{ fontSize: "10px" }}>
        {nonZeroIndex}
      </span>
      {digits}
    </span>
  );
};

function removeHeadAndFootZero(str: string) {
  return str.replace(/^0+/, "").replace(/0+$/, "");
}
function removeFootZero(str: string) {
  return str.replace(/0+$/, "");
}
function Wrap({ children, className }: any) {
  return (
    <span className={cn("text-sm text-black", className || "")}>
      {children}
    </span>
  );
}

export const beautifyPrice = (num: number | string): string => {
  if (num === 0) return "0";

  let numStr = num.toString();
  if (numStr.includes("e")) {
    const [base, exp] = numStr.split("e");
    const expNum = parseInt(exp);
    if (expNum < 0) {
      const absExp = Math.abs(expNum);
      numStr = "0." + "0".repeat(absExp - 1) + base.replace(".", "");
    }
  }

  const [integerPart, decimalPart = ""] = numStr.split(".");

  if (+integerPart !== 0) {
    return numStr;
  }

  const firstNonZero = decimalPart.split("").findIndex((n) => n !== "0");
  if (firstNonZero === -1) return "0";

  const significantPart = decimalPart.slice(firstNonZero, firstNonZero + 3);

  if (firstNonZero <= 3) {
    return `0.${decimalPart.slice(0, firstNonZero + 4)}`;
  }

  return `0.0(${firstNonZero})${significantPart}`;
};

export const beautifyPriceWithE = (num: number, isUsd?: boolean) => {
  //
  let numStr = num.toString();
  if (numStr.includes("e")) {
    const [base, exp] = numStr.split("e");
    const expNum = parseInt(exp);
    if (expNum < 0) {
      const absExp = Math.abs(expNum);
      numStr = "0." + "0".repeat(absExp - 1) + base.replace(".", "");
    } else {
      numStr = base.replace(".", "") + "0".repeat(expNum);
    }
  }

  const arr = numStr.split(".");
  const integerPart = arr[0];
  const decimalPart = arr[1] || "";

  if (!decimalPart) {
    //
    const digits = integerPart.slice(0, 5);
    //
    return (
      <span key={num} className="animate-flipIn">
        {(isUsd ? "$" : "") +
          (digits.endsWith("0") ? digits.slice(0, 4) : digits)}
      </span>
    );
  }

  if (+integerPart === 0) {
    const nonZeroIndex = decimalPart.split("").findIndex((n) => +n !== 0);
    if (nonZeroIndex <= 1) {
      //
      let significantDigits = decimalPart.replace(/0+$/, "").slice(0, 5);
      if (significantDigits.endsWith("0")) {
        significantDigits = significantDigits.slice(0, 4);
      }
      return (
        <span key={num} className="animate-flipIn">
          {(isUsd ? "$" : "") + "0." + significantDigits}
        </span>
      );
    }
    const nonZeroPart = decimalPart.substring(nonZeroIndex);
    let digits = nonZeroPart.slice(0, 4);
    if (digits.endsWith("0")) {
      digits = digits.slice(0, 3);
    }
    return (
      <span key={num} className="animate-flipIn">
        {isUsd ? "$" : ""}0.0
        <span className="px-px" style={{ fontSize: "10px" }}>
          {nonZeroIndex}
        </span>
        {digits}
      </span>
    );
  }

  //
  const floatPartLength = Math.max(5 - integerPart.length, 2);
  let formattedDecimal = decimalPart
    .slice(0, floatPartLength)
    .replace(/0+$/, "");

  //
  const fullNumber = integerPart + (formattedDecimal ? formattedDecimal : "");
  if (fullNumber.endsWith("0")) {
    if (formattedDecimal) {
      formattedDecimal = formattedDecimal.slice(0, -1);
    } else {
      return (
        <span key={num} className="animate-flipIn">
          {(isUsd ? "$" : "") + integerPart.slice(0, -1)}
        </span>
      );
    }
  }

  return (
    <span key={num} className="animate-flipIn">
      {(isUsd ? "$" : "") + integerPart}
      {formattedDecimal ? `.${formattedDecimal}` : ""}
    </span>
  );
};

export const formatNumberWithTwoDecimals = (
  num: string | number | undefined,
  isDollar: boolean = false
) => {
  if (!num && num !== 0) return "-";
  const formattedNum = Number(num).toFixed(2);

  const [integerPart, decimalPart] = formattedNum.split(".");
  const finalDecimal = decimalPart.replace(/0+$/, "");

  const result = finalDecimal ? `${integerPart}.${finalDecimal}` : integerPart;

  const absValue = Math.abs(Number(num));
  if (absValue >= 1.0e9) {
    return (
      <span className="animate-flipIn">
        {isDollar ? "$" : ""}
        {(absValue / 1.0e9).toFixed(2)}B
      </span>
    );
  } else if (absValue >= 1.0e6) {
    return (
      <span className="animate-flipIn">
        {isDollar ? "$" : ""}
        {(absValue / 1.0e6).toFixed(2)}M
      </span>
    );
  } else if (absValue >= 1.0e3) {
    return (
      <span className="animate-flipIn">
        {isDollar ? "$" : ""}
        {(absValue / 1.0e3).toFixed(2)}K
      </span>
    );
  }

  return (
    <span className="animate-flipIn">
      {isDollar ? "$" : ""}
      {result}
    </span>
  );
};
