import { expandToken, shrinkToken } from "@/utils/numbers";
import {
  getBtcBalance,
  sendBitcoin,
  signMessage,
  getDepositAmount,
} from "btc-wallet";
import Decimal from "decimal.js";
import {
  prepare_sign_message_btc,
  process_signature_btc,
} from "@rhea-finance/cross-chain-sdk";
export async function transfer_btc({
  address,
  amount,
  feeRate,
}: {
  address: string;
  amount: number;
  feeRate: number;
}) {
  const res = await sendBitcoin(address, amount, feeRate);
  return res;
}

export async function sign_message_btc(message: string) {
  const _message = prepare_sign_message_btc(message);
  const res = await signMessage(_message);
  const result = process_signature_btc(res.signature);
  return result;
}

export async function get_balance_btc() {
  try {
    const { balance, rawBalance, availableBalance } = await getBtcBalance();
    const expandAvailableBalance = expandToken(availableBalance || "0", 8);
    const { protocolFee, repayAmount } = await getDepositAmount(
      expandAvailableBalance
    );
    const _availableBalanceRaw = Decimal.max(
      new Decimal(expandAvailableBalance).minus(protocolFee).minus(repayAmount),
      0
    ).toFixed();
    const _availableBalance = shrinkToken(_availableBalanceRaw, 8);
    return {
      balance,
      rawBalance,
      availableBalance: _availableBalance,
    };
  } catch (error) {
    console.error(`----------btc-balance-error`, error);
    return {
      rawBalance: "0",
      balance: "0",
      availableBalance: "0",
    };
  }
}
