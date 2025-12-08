import BigNumber from "bignumber.js";
import Decimal from "decimal.js";
import BN from "bn.js";
import * as math from "mathjs";
import Big from "big.js";
import _, { sortBy } from "lodash";

const BPS_CONVERSION = 10000;

const ROUNDING_OFFSETS: BN[] = [];
const BN10 = new BN(10);
for (let i = 0, offset = new BN(5); i < 24; i++, offset = offset.mul(BN10)) {
  ROUNDING_OFFSETS[i] = offset;
}

type BigValue = Big | string | number | undefined | null;

export function safeBig(val: BigValue, defaultVal = "0") {
  try {
    const v = val || defaultVal;
    return new Big(v);
  } catch (error) {
    console.error("safeBig error", val, error);
    return new Big("0");
  }
}

export function safeBigMax(v1: BigValue, v2: BigValue) {
  return safeBig(v1).gt(safeBig(v2))
    ? safeBig(v1).toFixed()
    : safeBig(v2).toFixed();
}

export function safeBigMin(v1: BigValue, v2: BigValue) {
  return safeBig(v1).lt(safeBig(v2))
    ? safeBig(v1).toFixed()
    : safeBig(v2).toFixed();
}

export function safeBigDiv(v1: BigValue, v2: BigValue) {
  return safeBig(v1).div(safeBig(v2).eq(0) ? 1 : safeBig(v2));
}

export const ONLY_ZEROS = /^0*\.?0*$/;

export const sumBN = (...args: string[]): string => {
  return args
    .reduce((acc, n) => {
      return acc.add(new BN(n));
    }, new BN(0))
    .toString();
};
export const toReadableNumber = (
  decimals: number,
  number: string = "0"
): string => {
  if (!decimals) return number;
  if (!number) return "0";

  const wholeStr = number.substring(0, number.length - decimals) || "0";
  const fractionStr = number
    .substring(number.length - decimals)
    .padStart(decimals, "0")
    .substring(0, decimals);
  return `${wholeStr}.${fractionStr}`.replace(/\.?0+$/, "");
};

export const toNonDivisibleNumber = (
  decimals: number,
  number: string
): string => {
  if (decimals === null || decimals === undefined) return number;
  const [wholePart, fracPart = ""] = number.split(".");
  return `${wholePart}${fracPart.padEnd(decimals, "0").slice(0, decimals)}`
    .replace(/^0+/, "")
    .padStart(1, "0");
};

export const toPrecision = (
  number: string,
  precision: number,
  withCommas: boolean = false,
  atLeastOne: boolean = true
): string => {
  if (typeof number === "undefined") return "0";

  const [whole, decimal = ""] = number.split(".");

  let str = `${withCommas ? formatWithCommas(whole) : whole}.${decimal.slice(
    0,
    precision
  )}`.replace(/\.$/, "");
  if (atLeastOne && Number(str) === 0 && str.length > 1) {
    const n = str.lastIndexOf("0");
    str = str.slice(0, n) + str.slice(n).replace("0", "1");
  }

  return str;
};

export const toRoundedReadableNumber = ({
  decimals,
  number,
  precision = 6,
  withCommas = true,
}: {
  decimals: number;
  number?: string;
  precision?: number;
  withCommas?: boolean;
}): string => {
  return toPrecision(toReadableNumber(decimals, number), precision, withCommas);
};

export const convertToPercentDecimal = (percent: number) => {
  return math.divide(percent, 100);
};

export const calculateFeePercent = (fee: number) => {
  return math.divide(fee, 100);
};

export const calculateFeeCharge = (fee: number, total: string) => {
  const floor: any = math.floor;
  return floor(math.evaluate(`(${fee} / ${BPS_CONVERSION}) * ${total}`), 3);
};

export const subtraction = (initialValue: string, toBeSubtract: string) => {
  return math.format(math.evaluate(`${initialValue} - ${toBeSubtract}`), {
    notation: "fixed",
  });
};

export const percentOf = (percent: number, num: number | string) => {
  return math.evaluate(`${convertToPercentDecimal(percent)} * ${num}`);
};

export const percentOfBigNumber = (
  percent: number,
  num: number | string,
  precision: number
) => {
  const valueBig = math.bignumber(num);
  const percentBig = math.bignumber(percent).div(100);

  return toPrecision(
    scientificNotationToString(valueBig.mul(percentBig).toString()),
    precision
  );
};

export const percentLess = (percent: number, num: number | string) => {
  return math.format(math.evaluate(`${num} - ${percentOf(percent, num)}`), {
    notation: "fixed",
  });
};

export const percentIncrese = (percent: number, num: number | string) => {
  return math.format(math.evaluate(`${num} + ${percentOf(percent, num)}`), {
    notation: "fixed",
  });
};

export function formatWithCommas(value: string): string {
  const pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(value)) {
    value = value.replace(pattern, "$1,$2");
  }
  return value;
}

export function divide(numerator: string, denominator: string) {
  return math.format(math.evaluate(`${numerator} / ${denominator}`), {
    notation: "fixed",
  });
}

export function multiply(factor1: string, factor2: string) {
  return math.format(math.evaluate(`${factor1} * ${factor2}`), {
    notation: "fixed",
  });
}

export const percent = (numerator: string, denominator: string) => {
  if (new Big((isNaN(Number(denominator)) ? "0" : denominator) || "0").eq(0)) {
    return 0;
  }
  return math.evaluate(`(${numerator} / ${denominator}) * 100`);
};

export const calculateFairShare = ({
  shareOf,
  contribution,
  totalContribution,
}: {
  shareOf: string;
  contribution: string;
  totalContribution: string;
}) => {
  if (!shareOf || !contribution || !totalContribution) {
    return "0";
  }

  return math.format(
    math.evaluate(`(${shareOf} * ${contribution}) / ${totalContribution}`),
    {
      notation: "fixed",
      precision: 0,
    }
  );
};

export const toInternationalCurrencySystem = (
  labelValue: string,
  percent?: number
) => {
  const hasPercent = !(percent == undefined || percent == null);
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(percent || 2) + "B"
    : Math.abs(Number(labelValue)) >= 1.0e6
    ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(percent || 2) + "M"
    : Math.abs(Number(labelValue)) >= 1.0e3
    ? (Math.abs(Number(labelValue)) / 1.0e3).toFixed(percent || 2) + "K"
    : Math.abs(Number(labelValue)).toFixed(hasPercent ? percent : 2);
};

export const toInternationalCurrencySystemLongString = (
  labelValue: string,
  percent?: number
) => {
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(
        percent !== undefined ? percent : 2
      ) + "B"
    : Math.abs(Number(labelValue)) >= 1.0e6
    ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(
        percent !== undefined ? percent : 2
      ) + "M"
    : Math.abs(Number(labelValue)).toFixed(percent !== undefined ? percent : 2);
};

export const toInternationalCurrencySystemNature = (
  labelValue: string,
  percent?: number
) => {
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? new BigNumber(Math.abs(Number(labelValue)) / 1.0e9).toFixed(
        percent || 2,
        1
      ) + "B"
    : Math.abs(Number(labelValue)) >= 1.0e6
    ? new BigNumber(Math.abs(Number(labelValue)) / 1.0e6).toFixed(
        percent || 2,
        1
      ) + "M"
    : Math.abs(Number(labelValue)) >= 1.0e3
    ? new BigNumber(Math.abs(Number(labelValue)) / 1.0e3).toFixed(
        percent || 2,
        1
      ) + "K"
    : niceDecimals(labelValue);
};

export function scientificNotationToString(strParam: string = "") {
  const flag = /e/.test(strParam);
  if (!flag) return strParam;

  let sysbol = true;
  if (/e-/.test(strParam)) {
    sysbol = false;
  }

  const negative = Number(strParam) < 0 ? "-" : "";

  const index = Number(strParam.match(/\d+$/)?.[0]);

  const basis = strParam.match(/[\d\.]+/)?.[0] || "";

  const ifFraction = basis.includes(".");

  let wholeStr;
  let fractionStr;

  if (ifFraction) {
    wholeStr = basis.split(".")[0];
    fractionStr = basis.split(".")[1];
  } else {
    wholeStr = basis;
    fractionStr = "";
  }

  if (sysbol) {
    if (!ifFraction) {
      return negative + wholeStr.padEnd(index + wholeStr.length, "0");
    } else {
      if (fractionStr.length <= index) {
        return negative + wholeStr + fractionStr.padEnd(index, "0");
      } else {
        return (
          negative +
          wholeStr +
          fractionStr.substring(0, index) +
          "." +
          fractionStr.substring(index)
        );
      }
    }
  } else {
    if (!ifFraction)
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, "0").replace(/^0/, "0.")
      );
    else {
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, "0").replace(/^0/, "0.") +
        fractionStr
      );
    }
  }
}

export const calcStableSwapPriceImpact = (
  from: string,
  to: string,
  marketPrice: string = "1"
) => {
  const newMarketPrice = math.evaluate(`${from} / ${to}`);

  return math.format(
    percent(
      math.evaluate(`${newMarketPrice} - ${marketPrice}`),
      newMarketPrice
    ),
    {
      notation: "fixed",
    }
  );
};

export const niceDecimals = (number: string | number, precision = 2) => {
  const str = number.toString();
  const [whole, decimals] = str.split(".");
  if (!decimals || Number(decimals) == 0) {
    return whole;
  } else {
    return new BigNumber(number).toFixed(precision, 1);
  }
};
export const niceDecimalsExtreme = (number: string | number, precision = 2) => {
  const str = number.toString();
  const [whole, decimals] = str.split(".");
  if (!decimals || Number(decimals) == 0) {
    return whole;
  } else if (decimals.length > precision) {
    const temp = new BigNumber(number).toFixed(precision, 1);
    const [tempWhole, tempDecimals] = temp.split(".");
    if (!tempDecimals || Number(tempDecimals) == 0) {
      return tempWhole;
    } else {
      return temp;
    }
  } else {
    return str;
  }
};
export function numberWithCommas(x: number | string) {
  const str = typeof x === "number" ? x.toString() : x;

  const parts = scientificNotationToString(str).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export const round = (decimals: number, minAmountOut: string) => {
  return Number.isInteger(Number(minAmountOut))
    ? minAmountOut
    : Math.ceil(
        Math.round(Number(minAmountOut) * Math.pow(10, decimals)) /
          Math.pow(10, decimals)
      ).toString();
};

export function getAllocationsLeastOne(arr: string[]) {
  if (arr.length === 0) return [];

  if (arr.length === 1) return ["100"];

  if (arr) {
    const partialAmounts = arr.map((v) => {
      return math.bignumber(v);
    });

    const ps: string[] = new Array(partialAmounts.length).fill("0");

    const sum =
      partialAmounts.length === 1
        ? partialAmounts[0]
        : math.sum(...partialAmounts);

    const sortedAmount = sortBy(partialAmounts, (p) => Number(p));

    const minIndexes: number[] = [];

    for (let k = 0; k < sortedAmount.length - 1; k++) {
      let minIndex = -1;

      for (let j = 0; j < partialAmounts.length; j++) {
        if (partialAmounts[j].eq(sortedAmount[k]) && !minIndexes.includes(j)) {
          minIndex = j;
          minIndexes.push(j);
          break;
        }
      }
      const res = math
        .round(percent(partialAmounts[minIndex].toString(), sum))
        .toString();

      if (Number(res) === 0) {
        ps[minIndex] = "1";
      } else {
        ps[minIndex] = res;
      }
    }

    const finalPIndex = ps.indexOf("0");

    ps[finalPIndex] = subtraction(
      "100",
      ps.length === 1 ? Number(ps[0]) : math.sum(...ps.map((p) => Number(p)))
    ).toString();

    return ps;
  } else {
    return [];
  }
}

export const checkAllocations = (sum: string, allocations: string[]) => {
  if (!allocations || allocations?.length === 0) return [];

  const sumNumber = new Big(sum);
  const sumAllocations = allocations.reduce((acc, cur) => {
    return acc.plus(new Big(cur));
  }, new Big(0));

  if (!sumAllocations.eq(sumNumber)) {
    const maxNum = _.maxBy(allocations, (o) => Number(o));

    const maxIndex = allocations.indexOf(maxNum!);

    const leftSum = sumAllocations.minus(maxNum!);
    const newMaxNum = sumNumber.minus(leftSum);

    return [
      ...allocations.slice(0, maxIndex),
      newMaxNum.toString(),
      ...allocations.slice(maxIndex + 1),
    ];
  } else return allocations;
};
export function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}
export function filterSpecialChar(str: string) {
  if (/[^a-zA-Z0-9 ,.?!'"&%#@¥$^*()_\-~`+/<>:;\n\r\t\{\}\[\]\\\|]/.test(str)) {
    return "?";
  }
  return str;
}

export const expandTokenDecimal = (
  value: string | number | Decimal,
  decimals: string | number
): Decimal => {
  return new Decimal(value).mul(new Decimal(10).pow(decimals));
};

export const expandToken = (
  value: string | number | Decimal,
  decimals: string | number,
  fixed?: number
): string => {
  return expandTokenDecimal(value, decimals).toFixed(fixed);
};

export const shrinkTokenDecimal = (
  value: string | number,
  decimals: string | number
): Decimal => {
  return new Decimal(value).div(new Decimal(10).pow(decimals));
};
export const shrinkToken = (
  value: string | number,
  decimals: string | number,
  fixed?: number
): string => {
  if (!value) return "";
  return new Decimal(value).div(new Decimal(10).pow(decimals)).toFixed(fixed);
};

export const formatTokenAmount = (
  amount: string,
  decimals: number = 18
): string => {
  const result = new BigNumber(amount).div(new BigNumber(10).pow(decimals));

  if (result.lt(0.01) && result.gt(0)) {
    return "<0.01";
  }

  return result.toFixed(2, BigNumber.ROUND_DOWN);
};

export const formatConversionRate = (num: number): string => {
  if (num === 0) return "0";
  if (num === Math.floor(num)) return num.toString();
  if (num > 100000) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  let result = num.toString();
  if (result.indexOf(".") >= 0) {
    result = result.replace(/\.?(0+)$/, "");
  }
  return result;
};

export function balanceFormatedWithoutRound(
  balance?: string | number,
  digits = 8
) {
  if (!balance) return "0";
  const _balance = new Big(balance);
  if (_balance.eq(0) || _balance.lt(1 / 10 ** digits)) return "0";
  // if (_balance.lt(1 / 10 ** digits)) return `<${1 / 10 ** digits}`;

  //
  const multiplier = new Big(10).pow(digits);
  const truncated = _balance.times(multiplier).round(0, 0).div(multiplier);
  const val = truncated.toFixed(digits);

  return val.replace(/(\.?)0+$/, "");
}
