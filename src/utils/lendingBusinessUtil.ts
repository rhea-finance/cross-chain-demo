import _ from "lodash";
import Decimal from "decimal.js";
import { intentsQuotationUi } from "@/services/lending/actions/commonAction";
import { AssetsState } from "@/redux/state/assetState";
import { DEFAULT_POSITION } from "@/services/constantConfig";
import { expandToken, shrinkToken, expandTokenDecimal } from "@/utils/numbers";
import { Portfolio } from "@rhea-finance/cross-chain-sdk";
import { IChain } from "@rhea-finance/cross-chain-sdk";

export function getDebtAmountOfToken({
  portfolio,
  tokenId,
  assets,
}: {
  portfolio: Portfolio;
  tokenId: string;
  assets: AssetsState;
}) {
  const asset = assets.data[tokenId];
  const extraDecimals = asset.config.extra_decimals;
  const decimals = asset.metadata.decimals;
  const borrowApy = asset.borrow_apr;
  const price = asset.price?.usd || 0;
  const poolAsset = assets?.data?.[tokenId];
  const extraDecimalMultiplier = expandTokenDecimal(1, extraDecimals);
  // borrowed balance contract decimals
  const borrowedDecimals =
    portfolio?.positions?.[DEFAULT_POSITION]?.borrowed?.[tokenId]?.balance ||
    "0";
  const borrowed = shrinkToken(
    borrowedDecimals,
    (extraDecimals || 0) + (decimals || 0)
  );
  let minRepay = "0";
  let interestChargedInmins = "0";
  // The interestChargedInmins with token decimals
  if (borrowApy && price && borrowed) {
    interestChargedInmins = expandToken(
      new Decimal(borrowApy)
        .div(365 * 24 * 60)
        .div(100)
        .mul(borrowed)
        .mul(10)
        .toFixed(),
      decimals,
      0
    );
    if (+interestChargedInmins === 0) {
      interestChargedInmins = "1";
    }
  }
  // The minRepay with token decimals
  if (poolAsset?.supplied?.shares) {
    minRepay = new Decimal(poolAsset?.supplied?.balance)
      .div(poolAsset?.supplied?.shares)
      .mul(2)
      .toFixed(0, 2);
  }
  // the amount for pay off token decimals
  const tokenBorrowedBalance = Decimal.max(
    new Decimal(borrowedDecimals)
      .divToInt(extraDecimalMultiplier)
      .plus(interestChargedInmins),
    minRepay
  );
  const borrowedUsd = new Decimal(
    shrinkToken(tokenBorrowedBalance.toFixed(), decimals) || 0
  )
    .mul(price || 0)
    .toFixed();
  return {
    borrowedTokenBalance: tokenBorrowedBalance.toFixed(),
    borrowedUsd,
  };
}

export async function getAmountInByAmountOutQuotation({
  symbol,
  chain,
  subChain,
  amount,
  refundTo,
  recipient,
  slippageTolerance,
}: {
  symbol: string;
  chain: IChain;
  subChain: string;
  amount: string;
  refundTo: string;
  recipient: string;
  slippageTolerance?: number;
}) {
  const quoteResult = await intentsQuotationUi({
    symbol,
    chain,
    selectedEvmChain: subChain,
    amount,
    refundTo,
    recipient,
    outChainToNearChain: true,
    isReverse: true,
    dry: true,
    slippageTolerance,
  });
  if (
    quoteResult.quoteStatus == "error" &&
    quoteResult.message?.includes("low")
  ) {
    // quote again
    const leastAmount = quoteResult.message.split(" ").pop();
    const quoteResultAgain = await intentsQuotationUi({
      symbol,
      chain,
      selectedEvmChain: subChain,
      amount: leastAmount,
      refundTo,
      recipient,
      outChainToNearChain: true,
      isReverse: true,
      dry: true,
      slippageTolerance,
    });
    return {
      amountInToken:
        quoteResultAgain.quoteSuccessResult?.quote?.minAmountIn || 0,
    };
  } else {
    return {
      amountInToken: quoteResult.quoteSuccessResult?.quote?.amountIn || 0,
    };
  }
}
