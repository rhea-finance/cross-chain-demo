import Big from "big.js";
import Decimal from "decimal.js";
import {
  formatWithCommas,
  toInternationalCurrencySystem,
  toPrecision,
  toInternationalCurrencySystemLongString,
} from "./numbers";
import { beautifyNumber } from "./beautifyNumber";

export const formatWithCommas_usd = (v: any) => {
  if (isInvalid(v)) return "$-";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "$0";
  } else if (decimal.lt(0.01)) {
    return "<$0.01";
  } else if (decimal.lt(10000)) {
    return `$${formatWithCommas(decimal.toFixed(2))}`;
  } else {
    return `$${formatWithCommas(decimal.toFixed(0))}`;
  }
};
export const formatWithCommas_number = (v: any, d?: number | any) => {
  if (isInvalid(v)) return "-";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "0";
  } else if (decimal.lt(0.01)) {
    return "<0.01";
  } else {
    return `${formatWithCommas(decimal.toFixed(isInvalid(d) ? 2 : d))}`;
  }
};

export const toInternationalCurrencySystem_number = (v: any) => {
  if (isInvalid(v)) return "-";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "0";
  } else if (decimal.lt(0.01)) {
    return "<0.01";
  } else {
    return toInternationalCurrencySystem(decimal.toFixed());
  }
};
export const toInternationalCurrencySystem_usd = (v: any, fixed?: any) => {
  if (isInvalid(v)) return "$-";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "$0";
  } else if (decimal.lt(0.01)) {
    return "<$0.01";
  } else {
    if (fixed == 0) {
      return `$${toInternationalCurrencySystem(decimal.toFixed(2, fixed))}`;
    } else {
      return `$${toInternationalCurrencySystem(decimal.toFixed())}`;
    }
  }
};
export const toInternationalCurrencySystemLongString_usd = (v: any) => {
  if (isInvalid(v)) return "$-";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "$0";
  } else if (decimal.lt(0.01)) {
    return "<$0.01";
  } else {
    return `$${toInternationalCurrencySystemLongString(decimal.toFixed())}`;
  }
};

export const format_apy = (v: any) => {
  if (isInvalid(v)) return "-%";
  const decimal = new Big(v);
  if (decimal.lte(0)) {
    return "0%";
  } else if (decimal.lt(0.01) && decimal.gt(0)) {
    return "<0.01%";
  } else {
    return `${decimal.toFixed(2, 1)}%`;
  }
};

export function digitalProcess(v: string | number, precision: number = 2) {
  if (isInvalid(v)) return "-";
  let zero = "";
  for (let i = 0; i < precision - 1; i++) {
    zero += "0";
  }
  zero = `0.${zero}1`;
  const decimal = new Big(v);
  if (decimal.eq(0)) {
    return "0";
  } else if (decimal.lt(0.001)) {
    return beautifyNumber({ num: decimal.toFixed() });
  } else if (decimal.lt(zero)) {
    return `<${zero}`;
  } else {
    return `${decimal.toFixed(precision)}`;
  }
}

export const formatPercentage = (v: string | number) => {
  if (isInvalid(v)) return "-%";
  const big = Big(v);
  if (big.lte(0)) {
    return "0%";
  } else if (big.lt(0.01)) {
    return "<0.01%";
  } else {
    return big.toFixed(2) + "%";
  }
};
export const formatPercentageUi = (v: string | number) => {
  if (isInvalid(v)) return "-%";
  const big = Big(v);
  if (big.lte(0)) {
    return "0%";
  } else if (big.lt(0.01)) {
    return "<0.01%";
  } else if (big.gte(999)) {
    return "999%";
  } else {
    return big.toFixed(2) + "%";
  }
};

export const isInvalid = (v: any, noExtra?: boolean) => {
  if (
    v === "" ||
    v === undefined ||
    v == null ||
    v == Infinity ||
    (noExtra ? false : isNaN(v))
  )
    return true;
  return false;
};

export const toBig = (v: any) => {
  return new Big(v).toFixed();
};

export const addThousandSeparator = (num: any) => {
  const numParts = num.toString().split(".");
  numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return numParts.join(".");
};

export const formatTokenPrice = (v: string | number, precision = 2) => {
  if (isInvalid(v)) return "$-";
  let zero = "";
  for (let i = 0; i < precision - 1; i++) {
    zero += "0";
  }
  zero = `0.${zero}1`;
  const decimal = new Big(v);
  if (decimal.eq(0)) {
    return "$0";
  } else if (decimal.lt(zero)) {
    return `<$${zero}`;
  } else {
    return `$${toPrecision(decimal.toFixed(), precision)}`;
  }
};

export const formatNumber = (v: string | number, decimal?: number) => {
  const big = Big(v || 0);
  if (big.eq(0)) {
    return "0";
  } else if (big.lt(0.001)) {
    return "<0.001";
  } else {
    return big.toFixed(decimal || 3, 1);
  }
};

export const disPlayBalance = (isSignedIn: boolean, balance: string) => {
  const result = isSignedIn
    ? 0 < Number(balance) && Number(balance) < 0.001
      ? beautifyNumber({
          num: balance,
          className: "text-gray-50 hover:text-white",
        })
      : toPrecision(String(balance), 3)
    : "-";
  return result;
};

export const formatWithCommas_usd_down = (v: string | number) => {
  if (isInvalid(v)) return "$-";
  const big = Big(v);
  if (big.eq(0)) {
    return "$0";
  } else if (big.lt(0.01)) {
    return "<$0.01";
  } else if (big.lt(10000)) {
    return "$" + formatWithCommas(big.toFixed(2, 0));
  } else {
    return "$" + formatWithCommas(big.toFixed(0, 0));
  }
};

// Designated service
export const formateExtremelyNumber = (num: string | number) => {
  if (Big(num || 0).lt(0.001)) return beautifyNumber({ num: num || 0 });
  return toPrecision(Big(num || 0).toFixed(), 2);
};
export const toDecimal = (v: any) => {
  return new Decimal(v || "0").toFixed();
};

export function formatNumberDecimalPart({
  num,
  decimal,
}: {
  num: string | number;
  decimal: number;
}) {
  if (isInvalid(num)) return num;
  const str = new Big(num || 0).toFixed();
  const [whole, decimalPart] = str.split(".");
  if (decimalPart && new Big(whole || 0).gt(0)) {
    if (decimalPart.length > decimal) {
      return Number(new Big(num).toFixed(decimal, Big.roundDown));
    }
  }
  return num;
}
