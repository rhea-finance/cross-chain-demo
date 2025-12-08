import { ToastProvider } from "@heroui/toast";
import { useEffect, useState, createContext, useContext, useMemo } from "react";
import { useRouter } from "next/router";
import { useInterval, useIdle } from "react-use";
import Decimal from "decimal.js";
import { cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useBtcWalletSelector } from "btc-wallet";
import { showWalletModal, updatePosition } from "@/redux/slice/appSlice";
import useWalletConnect from "@/hooks/useWalletConnect";
import {
  useAccountId,
  useAvailableAssets,
  usePortfolioAssets,
} from "@/hooks/lending/hooks";
import {
  toInternationalCurrencySystem_number,
  toInternationalCurrencySystem_usd,
  format_apy,
  formatWithCommas_number,
  formatWithCommas_usd,
  isInvalid,
  digitalProcess,
} from "@/utils/uiNumber";
import { useAPY } from "@/hooks/lending/useAPY";
import { useUserBalance } from "@/hooks/lending/useUserBalance";
import { shrinkToken } from "@/utils/numbers";
import {
  useWithdrawTrigger,
  useAdjustTrigger,
  useSupplyTrigger,
  useBorrowTrigger,
  useRepayTrigger,
} from "@/hooks/lending/useModal";
import { isMobileDevice } from "@/utils/common";
import { OuterLinkConfig } from "./config";
import { DEFAULT_POSITION, lpTokenPrefix } from "@/services/constantConfig";
import { config_near, get_token_detail } from "@rhea-finance/cross-chain-sdk";
import { useTokenDetails } from "@/hooks/lending/useTokenDetails";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import {
  YellowSolidButton,
  RedSolidButton,
  YellowLineButton,
  RedLineButton,
} from "./button";
import {
  CucoinIcon,
  BinanceIcon,
  NearIntentIcon,
  OKXIon,
  GateIcon,
  CoinbaseIcon,
} from "./svg";
import { fetchTokenBalances } from "@/redux/slice/accountSlice";
import { IDLE_INTERVAL, REFETCH_INTERVAL } from "@/services/constantConfig";
import { IToken, UIAsset } from "@/interface/lending/asset";
import { Img } from "../common/img";
import APYCell from "../lending/market/APYCell";
import { RewardsV2 } from "./subComponents/Rewards";
import TokenBorrowSuppliesChart from "./tokenBorrowSuppliesChart";
import InterestRateChart, { LabelText } from "./interestRateChart";
import { beautifyNumber } from "@/utils/beautifyNumber";
import LPTokenCell from "./LPTokenCell";
import AvailableBorrowCell from "./AvailableBorrowCell";
import { useChainAccountStore } from "@/stores/chainAccount";
import { formatSymbolName } from "@/utils/chainsUtil";
import { BTC_ICON } from "@/services/chainConfig";
const { NBTCTokenId, WRAP_NEAR_CONTRACT_ID } = config_near;
const RHEALAB_TOKEN_ID = "lst.rhealab.near";
const DISABLED_OPERATION_TOKENS = [RHEALAB_TOKEN_ID];

const DetailData = createContext(null) as any;
const TokenDetail = () => {
  const dispatch = useAppDispatch();
  const isIdle = useIdle(IDLE_INTERVAL);
  const router = useRouter();
  const main = useAvailableAssets();
  const { account, autoConnect } = useBtcWalletSelector();
  const { id, pageType } = router.query;
  const { rows } = useMemo(() => {
    return {
      rows: main,
    };
  }, [JSON.stringify(main || [])]);
  const tokenRow = rows.find((row: UIAsset) => {
    return row.tokenId === id;
  });
  const accountId = useAccountId();
  const selectedWalletId = (window as any).selector?.store?.getState()
    ?.selectedWalletId;
  const isNBTC = NBTCTokenId === id && selectedWalletId === "btc-wallet";
  // get asset token balance start
  useInterval(
    () => {
      updateTokenBalance();
    },
    !isIdle ? REFETCH_INTERVAL : null
  );
  useEffect(() => {
    updateTokenBalance();
  }, [accountId, id, pageType]);
  // get asset token balance end
  function updateTokenBalance() {
    if (!(accountId && id)) return;
    dispatch(
      fetchTokenBalances({
        tokenIds: [id] as string[],
        accountId,
      })
    );
  }
  // connect btc wallet to get btc balance;
  useEffect(() => {
    if (accountId && isNBTC && !account) {
      autoConnect();
    }
  }, [isNBTC, account, accountId, selectedWalletId]);
  if (!tokenRow) return null;
  return (
    <>
      <TokenDetailView tokenRow={tokenRow} assets={rows} />
      <ToastProvider placement="bottom-center" />
    </>
  );
};

function TokenDetailView({
  tokenRow,
  assets,
}: {
  tokenRow: UIAsset;
  assets: UIAsset[];
}) {
  const [suppliers_number, set_suppliers_number] = useState<number>();
  const [borrowers_number, set_borrowers_number] = useState<number>();
  const isMobile = isMobileDevice();
  const router = useRouter();
  const NATIVE_TOKENS = [];
  const NEW_TOKENS = [];
  const [depositAPY] = useAPY({
    baseAPY: tokenRow.supplyApy,
    rewards: tokenRow.depositRewards,
    tokenId: tokenRow.tokenId,
    page: "deposit",
    onlyMarket: true,
  });
  const [borrowAPY] = useAPY({
    baseAPY: tokenRow.borrowApy,
    rewards: tokenRow.borrowRewards,
    tokenId: tokenRow.tokenId,
    page: "borrow",
    onlyMarket: true,
  });
  const tokenDetails = useTokenDetails();
  const { fetchTokenDetails, changePeriodDisplay } = tokenDetails || {};
  const [suppliedRows, borrowedRows, , , borrowedLPRows] =
    usePortfolioAssets() as [
      any[],
      any[],
      number,
      number,
      Record<string, any[]>
    ];
  const supplied = suppliedRows?.find((row) => {
    return row.tokenId === tokenRow.tokenId;
  });
  const borrowed = borrowedRows?.find((row) => {
    return row.tokenId === tokenRow.tokenId;
  });
  const borrowedLp = Object.keys(borrowedLPRows || {}).reduce((acc, cur) => {
    const borrowedLPRowsCur = borrowedLPRows?.[cur];
    if (Array.isArray(borrowedLPRowsCur)) {
      const b = borrowedLPRowsCur.find((row) => {
        return row.tokenId === tokenRow.tokenId;
      });
      if (b) {
        return { ...acc, [cur]: b };
      }
    }
    return acc;
  }, {});
  useEffect(() => {
    fetchTokenDetails(tokenRow.tokenId, 365).catch();
    get_token_detail(tokenRow.tokenId).then((response) => {
      const { total_suppliers, total_borrowers } = response[0] || {};
      if (!isInvalid(total_suppliers)) {
        set_suppliers_number(total_suppliers);
      }
      if (!isInvalid(total_borrowers)) {
        set_borrowers_number(total_borrowers);
      }
    });
  }, []);

  const handlePeriodClick = async ({ borrowPeriod, supplyPeriod }) => {
    try {
      await changePeriodDisplay({
        tokenId: tokenRow.tokenId,
        borrowPeriod,
        supplyPeriod,
      });
    } catch (e) {
      console.error("err", e);
    }
  };

  const is_native = NATIVE_TOKENS?.includes(tokenRow.tokenId);
  const is_new = NEW_TOKENS?.includes(tokenRow.tokenId);
  function getIcons() {
    const { isLpToken, tokens } = tokenRow;
    return (
      <div className="flex items-center justify-center flex-wrap flex-shrink-0 max-sm:w-[34px]">
        {isLpToken ? (
          tokens.map((token: IToken, index) => {
            if (isMobile) {
              return (
                <img
                  key={token.token_id}
                  src={token.metadata?.icon}
                  alt=""
                  className={`w-5 h-5 rounded-full relative ${
                    index !== 0 && index !== 2 ? "-ml-1.5" : ""
                  } ${index > 1 ? "-mt-1.5" : "z-10"}`}
                />
              );
            } else {
              return (
                <img
                  key={token.token_id}
                  src={token?.metadata?.icon}
                  alt=""
                  className={`w-6 h-6 rounded-full relative ${
                    index !== 0 ? "-ml-1.5" : ""
                  }`}
                />
              );
            }
          })
        ) : (
          <img
            src={tokenRow?.icon}
            className="w-8 h-8 max-sm:w-6 max-sm:h-6 rounded-full"
            alt=""
          />
        )}
      </div>
    );
  }
  function getSymbols() {
    const { isLpToken, tokens } = tokenRow;
    return (
      <div className="flex items-center flex-wrap flex-shrink-0 max-sm:max-w-[160px]">
        {isLpToken ? (
          tokens.map((token: IToken, index) => {
            return (
              <span
                className="lg:text-base text-black font-bold max-sm:text-sm"
                key={token.token_id}
              >
                {token?.metadata?.symbol}
                {index === tokens.length - 1 ? "" : "-"}
                {index === tokens.length - 1 ? (
                  <span
                    style={{ zoom: 0.85 }}
                    className="text-gray-410 italic text-xs transform ml-1 -translate-y-0.5"
                  >
                    LP token
                  </span>
                ) : null}
              </span>
            );
          })
        ) : (
          <span className="flex items-center gap-1 text-base text-black font-bold">
            <span className="max-sm:max-w-[100px] max-sm:text-base max-sm:overflow-hidden max-sm:text-ellipsis max-sm:whitespace-nowrap">
              {tokenRow?.symbol}
            </span>
            {is_native ? (
              <span
                style={{ zoom: 0.85 }}
                className="text-gray-410 italic text-sm transform"
              >
                Native
              </span>
            ) : null}
          </span>
        )}
      </div>
    );
  }
  return (
    <DetailData.Provider
      value={{
        router,
        depositAPY,
        borrowAPY,
        supplied,
        borrowed,
        tokenRow,
        suppliers_number,
        borrowers_number,
        is_native,
        is_new,
        borrowedLp,
        assets,
        getIcons,
        getSymbols,
      }}
    >
      {isMobile ? (
        <DetailMobile
          tokenDetails={tokenDetails}
          handlePeriodClick={handlePeriodClick}
        />
      ) : (
        <DetailPc
          tokenDetails={tokenDetails}
          handlePeriodClick={handlePeriodClick}
        />
      )}
    </DetailData.Provider>
  );
}

function DetailMobile({ tokenDetails, handlePeriodClick }: any) {
  const { tokenRow } = useContext(DetailData) as any;
  const [activeTab, setActiveTab] = useState<"market" | "your">("market");
  const [open, setOpen] = useState(false);

  function switchTab(tab) {
    setActiveTab(tab);
  }

  return (
    <>
      {/* Token head */}
      <div className="flex items-center justify-between">
        <Breadcrumbs />
      </div>
      <div className="p-1 flex w-fit mx-auto border border-gray-30 rounded-full text-lg font-medium mb-[18px]">
        <button
          onClick={() => switchTab("market")}
          className={`px-10 py-2 min-w-[160px] rounded-full text-black cursor-pointer ${
            activeTab === "market" ? "bg-green-10" : ""
          }`}
        >
          Market
        </button>
        <button
          onClick={() => switchTab("your")}
          className={`px-10 py-2 min-w-[160px] rounded-full text-black cursor-pointer ${
            activeTab === "your" ? "bg-green-10" : ""
          }`}
        >
          Yours
        </button>
      </div>
      {/* Tab content */}
      {activeTab === "market" && (
        <>
          <MarketInfo
            tokenDetails={tokenDetails}
            handlePeriodClick={handlePeriodClick}
          />
        </>
      )}
      {activeTab === "your" && (
        <YourInfo className="my-4 flex  max-sm:flex-col max-sm:gap-4" />
      )}
    </>
  );
}

function MarketInfo({ className, tokenDetails, handlePeriodClick }: any) {
  const { interestRates } = tokenDetails || {};
  const { tokenRow } = useContext(DetailData) as any;

  return (
    <div className={`grid grid-cols-1 gap-y-4 ${className}`}>
      <TokenOverviewMobile />
      <TokenSupplyBorrowChart
        tokenDetails={tokenDetails}
        handlePeriodClick={handlePeriodClick}
      />
      {tokenRow.can_borrow && (
        <TokenRateModeChart interestRates={interestRates} tokenRow={tokenRow} />
      )}
    </div>
  );
}

function YourInfo({ className }: { className?: string }) {
  const { tokenRow } = useContext(DetailData) as any;
  return (
    <div className={`${className}`}>
      <TokenUserInfo />
      <YouSupplied />
      {tokenRow.can_borrow && <YouBorrowed />}
    </div>
  );
}

function DetailPc({ tokenDetails, handlePeriodClick }: any) {
  const { interestRates } = tokenDetails || {};
  const { tokenRow } = useContext(DetailData) as any;
  return (
    <div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-4 flex-grow">
          <TokenOverview />
          <TokenSupplyBorrowChart
            tokenDetails={tokenDetails}
            handlePeriodClick={handlePeriodClick}
          />
          {tokenRow.can_borrow && (
            <TokenRateModeChart interestRates={interestRates} />
          )}
        </div>
        <div className="flex flex-col gap-6 w-[420px]">
          <TokenUserInfo />
          <YouSupplied />
          {tokenRow.can_borrow && <YouBorrowed />}
          <OuterLink />
        </div>
      </div>
    </div>
  );
}
function Breadcrumbs() {
  const { router, is_new, getIcons, getSymbols, tokenRow } = useContext(
    DetailData
  ) as any;
  function backTo() {
    router.push("/");
  }
  return (
    <div className="flex items-center gap-2 mb-6">
      <div
        onClick={backTo}
        className="flex items-center justify-center w-[30px] h-[30px] rounded-md bg-white bg-opacity-10 cursor-pointer"
      >
        <Icon
          icon="ep:back"
          className="text-xl text-gray-90 hover:text-black"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex flex-col items-center">
          {getIcons()}
          {is_new ? (
            <Img
              path="newTag-icon-v2.svg"
              className="absolute -bottom-1 w-8 h-8"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex">{getSymbols()}</div>
          <span className="text-xs text-gray-50 transform -translate-y-2">
            {formatWithCommas_usd(tokenRow?.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
function TokenOverviewMobile() {
  const { tokenRow, suppliers_number, borrowers_number, assets } = useContext(
    DetailData
  ) as any;
  let isLpToken = false;
  if (tokenRow?.tokenId?.indexOf(lpTokenPrefix) > -1) {
    isLpToken = true;
  }
  return (
    <div className="bg-white border border-gray-30 rounded-2xl px-4 py-6">
      {/* Top Section - Total Supplied and Total Borrowed */}
      <div className="grid grid-cols-2 gap-10 mb-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-50">Total Supplied</span>
          <span className="whitespace-nowrap">
            {beautifyNumber({
              num: tokenRow?.totalSupply,
              className: "text-lg font-semibold text-black",
            })}{" "}
            <span className="text-sm text-gray-50 ml-1">
              (
              {beautifyNumber({
                num: tokenRow?.totalSupplyMoney,
                isUsd: true,
                className: "text-sm text-gray-50",
              })}{" "}
              )
            </span>
          </span>
        </div>
        {!isLpToken ? (
          <div className="flex flex-col">
            <span className="text-sm text-gray-50">Total Borrowed</span>
            <span className="whitespace-nowrap">
              {beautifyNumber({
                num: !tokenRow?.can_borrow ? "-" : tokenRow?.totalBorrowed,
                className: "text-lg font-semibold text-black",
              })}{" "}
              <span className="text-sm text-gray-50 ml-1">
                (
                {tokenRow?.can_borrow
                  ? beautifyNumber({
                      num: tokenRow?.totalBorrowedMoney,
                      isUsd: true,
                      className: "text-sm text-gray-50",
                    })
                  : ""}
                )
              </span>
            </span>
          </div>
        ) : (
          <div></div>
        )}
      </div>

      {/* Available Liquidity and Rewards/day */}
      <div className="grid grid-cols-2 gap-10 mb-4">
        {!isLpToken ? (
          <div className="flex flex-col">
            <span className="text-sm text-gray-50">Available Liquidity</span>
            <span className="whitespace-nowrap">
              {tokenRow?.can_borrow
                ? beautifyNumber({
                    num: tokenRow?.availableLiquidity,
                    className: "text-lg font-semibold text-black",
                  })
                : "-"}
              {tokenRow?.can_borrow && (
                <span className="text-sm text-gray-50 ml-1">
                  ({" "}
                  {beautifyNumber({
                    num: tokenRow?.availableLiquidityMoney,
                    isUsd: true,
                    className: "text-sm text-gray-50",
                  })}{" "}
                  )
                </span>
              )}
            </span>
          </div>
        ) : (
          <div></div>
        )}
        <div className="flex flex-col">
          <span className="text-sm text-gray-50">Rewards/day</span>
          <div className="text-lg font-semibold text-black">
            <RewardsV2
              rewards={tokenRow.depositRewards}
              layout="horizontal"
              page="deposit"
              tokenId={tokenRow.tokenId}
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-dotted border-gray-30 my-4"></div>

      {/* Bottom Section - APYs and Participant Counts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-50">Supply APY</span>
          <div className="text-lg font-semibold text-black">
            <APYCell
              rewards={tokenRow.depositRewards}
              baseAPY={tokenRow.supplyApy}
              page="deposit"
              tokenId={tokenRow.tokenId}
              onlyMarket
            />
          </div>
        </div>
        {!isLpToken && (
          <div className="flex flex-col">
            <span className="text-sm text-gray-50">Borrow APY</span>
            <span className="text-lg font-semibold text-black">
              {!tokenRow?.can_borrow ? "-" : format_apy(tokenRow?.borrowApy)}
            </span>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm text-gray-50"># of suppliers</span>
          <span className="text-lg font-semibold text-black">
            {formatWithCommas_number(suppliers_number, 0)}
          </span>
        </div>
        {!isLpToken && (
          <div className="flex flex-col">
            <span className="text-sm text-gray-50"># of borrowers</span>
            <span className="text-lg font-semibold text-black">
              {!tokenRow?.can_borrow
                ? "-"
                : formatWithCommas_number(borrowers_number, 0)}
            </span>
          </div>
        )}
      </div>

      {/* Token breakdown for LP tokens */}
      {tokenRow?.tokens?.map((token) => {
        const { token_id, price, amount, metadata } = token;
        const asset = assets.find((a) => a.tokenId === token_id);
        function getTotalSupply() {
          return toInternationalCurrencySystem_number(
            new Decimal(tokenRow?.totalSupply || 0).mul(
              shrinkToken(amount, metadata.decimals)
            )
          );
        }
        function getTotalSupplyMoney() {
          return toInternationalCurrencySystem_usd(
            new Decimal(tokenRow?.totalSupply || 0)
              .mul(shrinkToken(amount, metadata.decimals))
              .mul(price.usd || 0)
          );
        }
        return (
          <div
            key={`mobile-${token_id}`}
            className="mt-2 pt-2 border-t border-gray-30"
          >
            <div className="flex justify-between">
              <span className="text-sm text-gray-50">{asset?.symbol}</span>
              <div className="text-sm text-black whitespace-nowrap">
                {getTotalSupply()}
                <span className="text-gray-50 ml-1">
                  {getTotalSupplyMoney()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TokenOverview() {
  const { suppliers_number, borrowers_number, tokenRow, borrowAPY, assets } =
    useContext(DetailData) as any;
  let isLpToken = false;
  if (tokenRow?.tokenId?.indexOf(lpTokenPrefix) > -1) {
    isLpToken = true;
  }
  return (
    <Box>
      <Breadcrumbs />
      {isLpToken ? (
        <>
          <div className="flex items-center mt-4">
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Total Supplied
              </span>
              <div className="flex items-center">
                <span>
                  {beautifyNumber({
                    num: tokenRow?.totalSupply,
                    className: "text-[22px] text-black font-bold",
                  })}
                </span>
                <span className="text-[22px] text-gray-90 ml-1">
                  ({" "}
                  {beautifyNumber({
                    num: tokenRow?.totalSupplyMoney,
                    isUsd: true,
                    className: "text-[22px] text-gray-90",
                  })}
                  )
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-8 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Supply APY
              </span>
              <div className="flex items-center text-[20px]">
                <APYCell
                  rewards={tokenRow.depositRewards}
                  baseAPY={tokenRow.supplyApy}
                  page="deposit"
                  tokenId={tokenRow.tokenId}
                  onlyMarket
                />
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-8 bg-black" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                # of suppliers
              </span>
              <div className="flex items-center">
                {beautifyNumber({
                  num: suppliers_number,
                  className: "text-[22px] text-black font-bold",
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 mt-5 gap-x-10">
            {tokenRow?.tokens?.map((token) => {
              const { token_id, price, amount, metadata } = token;
              const asset = assets.find((a) => a.tokenId === token_id);
              function getTotalSupply() {
                return toInternationalCurrencySystem_number(
                  new Decimal(tokenRow?.totalSupply || 0).mul(
                    shrinkToken(amount, metadata.decimals)
                  )
                );
              }
              function getTotalSupplyMoney() {
                return toInternationalCurrencySystem_usd(
                  new Decimal(tokenRow?.totalSupply || 0)
                    .mul(shrinkToken(amount, metadata.decimals))
                    .mul(price.usd || 0)
                );
              }

              return (
                <div key={token.token_id} className="flex flex-col">
                  <span className="text-sm text-gray-90 whitespace-nowrap">
                    {asset?.symbol}
                  </span>
                  <div className="flex items-center whitespace-nowrap">
                    <span>
                      {beautifyNumber({
                        num: getTotalSupply(),
                        className: "text-[22px] text-black font-bold",
                      })}
                    </span>
                    <span className="text-sm text-gray-90 ml-1">
                      ({" "}
                      {beautifyNumber({
                        num: getTotalSupplyMoney(),
                        isUsd: true,
                        className: "text-sm text-gray-90",
                      })}{" "}
                      )
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center mt-4">
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Total Supplied
              </span>
              <div className="flex items-center whitespace-nowrap">
                <span>
                  {beautifyNumber({
                    num: tokenRow?.totalSupply,
                    className: "text-base text-black font-semibold",
                  })}
                </span>
                <span className="text-sm text-gray-90 ml-1">
                  ({" "}
                  {beautifyNumber({
                    num: tokenRow?.totalSupplyMoney,
                    isUsd: true,
                    className: "text-sm text-gray-90",
                  })}{" "}
                  )
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-8 bg-black" />
            </div>
            {tokenRow?.can_borrow && (
              <>
                <div className="flex-1 text-left">
                  <span className="text-sm text-gray-90 whitespace-nowrap">
                    Total Borrowed
                  </span>
                  <div className="flex items-center whitespace-nowrap">
                    <span>
                      {beautifyNumber({
                        num: tokenRow?.totalBorrowed,
                        className: "text-base text-black font-semibold",
                      })}
                    </span>
                    <span className="text-sm text-gray-90 ml-1">
                      ({" "}
                      {beautifyNumber({
                        num: tokenRow?.totalBorrowedMoney,
                        isUsd: true,
                        className: "text-sm text-gray-90",
                      })}{" "}
                      )
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-1">
                  <div className="w-px h-8 bg-black" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm text-gray-90 whitespace-nowrap">
                    Available Liquidity
                  </span>
                  <div className="flex items-center whitespace-nowrap">
                    <span>
                      {beautifyNumber({
                        num: tokenRow?.availableLiquidity,
                        className: "text-base text-black font-semibold",
                      })}
                    </span>
                    <span className="text-sm text-gray-90 ml-1">
                      ({" "}
                      {beautifyNumber({
                        num: tokenRow?.availableLiquidityMoney,
                        isUsd: true,
                        className: "text-sm text-gray-90",
                      })}{" "}
                      )
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-1">
                  <div className="w-px h-8 bg-black" />
                </div>
              </>
            )}
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Rewards/day
              </span>
              <div className="flex items-center text-base text-black font-semibold">
                <RewardsV2
                  rewards={tokenRow.depositRewards}
                  layout="horizontal"
                  page="deposit"
                  tokenId={tokenRow.tokenId}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center mt-10">
            <div className="flex-1 text-left flex items-center gap-2">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Supply APY
              </span>
              <div className="flex items-center">
                <APYCell
                  rewards={tokenRow.depositRewards}
                  baseAPY={tokenRow.supplyApy}
                  page="deposit"
                  tokenId={tokenRow.tokenId}
                  onlyMarket
                />
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-4 bg-black" />
            </div>
            <div className="flex-1 text-left flex items-center gap-2">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                Borrow APY
              </span>
              <div className="flex items-center">
                <span className="text-base text-black font-bold">
                  {!tokenRow?.can_borrow ? "-" : format_apy(borrowAPY)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-4 bg-black" />
            </div>
            <div className="flex-1 text-left flex items-center gap-2">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                # of suppliers
              </span>
              <div className="flex items-center">
                <span className="text-base text-black font-bold">
                  {beautifyNumber({
                    num: suppliers_number,
                    className: "text-base text-black font-bold",
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="w-px h-4 bg-black" />
            </div>
            <div className="flex-1 text-left flex items-center gap-2">
              <span className="text-sm text-gray-90 whitespace-nowrap">
                # of borrowers
              </span>
              <div className="flex items-center">
                <span className="text-base text-black font-bold">
                  {!tokenRow?.can_borrow
                    ? "-"
                    : beautifyNumber({
                        num: borrowers_number,
                        className: "text-base text-black font-bold",
                      })}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Box>
  );
}

function TokenSupplyBorrowChart({ tokenDetails, handlePeriodClick }: any) {
  const { tokenSupplyDays, tokenBorrowDays, supplyAnimating } =
    tokenDetails || {};
  const isMobile = isMobileDevice();

  const [period, setPeriod] = useState(365);

  const handlePeriodChange = (v: number) => {
    setPeriod(v);
    handlePeriodClick({ supplyPeriod: v, borrowPeriod: v });
  };

  // Sync period from chart component
  const handleChartPeriodClick = (v: number) => {
    setPeriod(v);
    handlePeriodClick({ supplyPeriod: v, borrowPeriod: v });
  };

  return (
    <Box>
      <div className="font-bold text-lg text-gray-20 mb-5 flex items-center justify-between gap-2 max-sm:text-base">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-10 rounded-full" />
          SUPPLY & BORROW INFO
        </div>
        {isMobile && (
          <div className="flex gap-1 text-sm font-normal">
            <div
              onClick={() => !supplyAnimating && handlePeriodChange(30)}
              className={`px-2 rounded-lg cursor-pointer select-none text-black font-normal ${
                period === 30 ? "border border-gray-30" : "bg-gray-80"
              } ${supplyAnimating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              1M
            </div>
            <div
              onClick={() => !supplyAnimating && handlePeriodChange(365)}
              className={`px-2 rounded-lg cursor-pointer select-none text-black font-normal ${
                period === 365 ? "border border-gray-30" : "bg-gray-80"
              } ${supplyAnimating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              1Y
            </div>
            <div
              onClick={() => !supplyAnimating && handlePeriodChange(0)}
              className={`px-2 rounded-lg cursor-pointer select-none text-black font-normal ${
                period === 0 ? "border border-gray-30" : "bg-gray-80"
              } ${supplyAnimating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              ALL
            </div>
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="mt-8 max-sm:overflow-x-auto max-sm:-mx-4 relative">
        <TokenBorrowSuppliesChart
          data={tokenSupplyDays}
          borrowData={tokenBorrowDays}
          key="dayDate"
          yKey="tokenSupplyApy"
          borrowYKey="tokenBorrowApy"
          disableControl={supplyAnimating}
          onPeriodClick={handleChartPeriodClick}
          showPeriodTabs={false}
          defaultPeriod={period}
        />
      </div>
    </Box>
  );
}

function TokenRateModeChart({
  interestRates,
  tokenRow,
}: {
  interestRates: Array<any>;
  tokenRow?: any;
}) {
  const { currentUtilRate } = interestRates?.[0] || {};
  const { borrowApy, supplyApy } = tokenRow || {};
  return (
    <Box>
      <div className="font-bold text-lg text-gray-20 mb-5 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-10 rounded-full" />
        INTEREST RATE MODE
      </div>

      <div className="grid grid-cols-1 gap-y-4 mb-6 lg:hidden ">
        <LabelText
          left="Current Utilization"
          leftIcon={<div className="bg-gray-20 mr-2 h-[2px] w-[10px]" />}
          right={currentUtilRate ? `${currentUtilRate.toFixed(2)}%` : "-"}
        />
        <LabelText
          left="Borrow Rate"
          leftIcon={
            <div className="rounded-full mr-2 bg-red-10 h-[10px] w-[10px]" />
          }
          right={borrowApy ? `${borrowApy.toFixed(2)}%` : "-"}
        />
        <LabelText
          left="Supply Rate"
          leftIcon={
            <div className="rounded-full mr-2 bg-green-10 h-[10px] w-[10px]" />
          }
          right={supplyApy ? `${supplyApy.toFixed(2)}%` : "-"}
        />
      </div>
      <div className="flex items-center justify-center h-[300px] xsm2:-ml-4">
        <InterestRateChart data={interestRates} />
      </div>
    </Box>
  );
}

function TokenUserInfo() {
  const [updaterCounter, setUpDaterCounter] = useState(1);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const { tokenRow } = useContext(DetailData) as any;
  const { tokenId, tokens, isLpToken, price, symbol } = tokenRow;
  const selectedWalletId = (window as any).selector?.store?.getState()
    ?.selectedWalletId;
  const isNBTC = NBTCTokenId === tokenId && selectedWalletId === "btc-wallet";
  const chainAccountStore = useChainAccountStore();
  const balancesUi = chainAccountStore.getBalancesUi();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!isNBTC) return;

    const interval = setInterval(() => {
      setUpDaterCounter((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [isNBTC]);
  const accountId = useAccountId();
  const { evm, solana, btc } = useWalletConnect();
  const isWalletConnected =
    evm.isSignedIn || solana.isSignedIn || btc.isSignedIn;
  const isWrappedNear = tokenRow.symbol === "NEAR";
  const { maxBorrowAmountPositions } = useUserBalance(tokenId, isWrappedNear);
  const supplyBalance = useMemo(() => {
    const _symbol = formatSymbolName(symbol);
    if (_symbol) {
      return balancesUi?.[_symbol]?.total || 0;
    }
    return 0;
  }, [symbol, balancesUi]);

  const handleSupplyClick = useSupplyTrigger(tokenId);
  const handleBorrowClick = useBorrowTrigger(tokenId);
  const handleWithdrawClick = useWithdrawTrigger(tokenId);

  const handleSupplyModalOpen = () => {
    handleSupplyClick();
  };

  const handleBorrowModalOpen = () => {
    handleBorrowClick();
  };

  function handleConnect() {
    dispatch(showWalletModal());
  }

  const isOperationDisabled = DISABLED_OPERATION_TOKENS.includes(tokenId);
  const getIcons = () => {
    return (
      <div className="flex items-center justify-center flex-wrap flex-shrink-0">
        {isLpToken ? (
          tokens.map((token: IToken, index) => (
            <img
              key={token.token_id}
              src={token?.metadata?.icon}
              alt=""
              className={`w-5 h-5 rounded-full relative ${
                index !== 0 ? "-ml-1.5" : ""
              }`}
            />
          ))
        ) : (
          <img src={tokenRow?.icon} className="w-5 h-5 rounded-full" alt="" />
        )}
      </div>
    );
  };
  const getUserLpUsd = () =>
    accountId
      ? `$${digitalProcess(
          new Decimal(supplyBalance || 0).mul(price || 0).toFixed(),
          2
        )}`
      : "-";
  const totalBorrowAmount = useMemo(
    () =>
      Object.values(maxBorrowAmountPositions || {}).reduce(
        (acc, { maxBorrowAmount }) => acc + maxBorrowAmount,
        0
      ),
    [maxBorrowAmountPositions]
  );
  return (
    <>
      <UserBox>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-10 rounded-full" />
          <span className="text-lg text-gray-20 font-bold">YOUR INFO</span>
        </div>
        <div className="bg-gray-80 rounded-lg p-4 my-[25px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-50">Available to Supply</span>
            <div className="flex items-center">
              <span className="text-sm text-black mr-2.5">
                {accountId
                  ? beautifyNumber({
                      num: supplyBalance,
                    })
                  : "-"}
              </span>
              <LPTokenCell asset={tokenRow} balance={supplyBalance}>
                {getIcons()}
              </LPTokenCell>
            </div>
          </div>

          {isLpToken ? (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-50">USD Value</span>
              <div>{getUserLpUsd()}</div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-50">Available to Borrow</span>
              {accountId &&
              tokenRow?.can_borrow &&
              Object.keys(maxBorrowAmountPositions).length ? (
                <div className="flex flex-col items-end gap-2">
                  {Object.entries(maxBorrowAmountPositions).map(
                    ([position, { maxBorrowAmount }]) => {
                      return (
                        <AvailableBorrowCell
                          key={position}
                          asset={tokenRow}
                          borrowData={[position, maxBorrowAmount]}
                        />
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm text-black mr-2.5">
                    {accountId && tokenRow?.can_borrow ? "0" : "-"}
                  </span>
                  <img
                    src={tokenRow?.icon}
                    className="w-5 h-5 rounded-full"
                    alt=""
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-[30px]">
          {accountId ? (
            <>
              {tokenRow?.can_deposit && !isOperationDisabled && (
                <YellowSolidButton
                  className="flex-1"
                  onClick={handleSupplyModalOpen}
                  data-tour="supply-button"
                >
                  Supply
                </YellowSolidButton>
              )}

              {tokenRow?.can_borrow && !isOperationDisabled && (
                <RedSolidButton
                  disabled={!+totalBorrowAmount}
                  className="flex-1"
                  onClick={handleBorrowModalOpen}
                >
                  Borrow
                </RedSolidButton>
              )}
            </>
          ) : isWalletConnected ? (
            <YellowLineButton className="w-full" onClick={handleConnect}>
              Create Account
            </YellowLineButton>
          ) : (
            <YellowLineButton className="w-full" onClick={handleConnect}>
              Connect Wallet
            </YellowLineButton>
          )}
        </div>
      </UserBox>
    </>
  );
}

function YouSupplied() {
  const { tokenRow, supplied } = useContext(DetailData) as any;
  const { tokenId } = tokenRow;
  const isOperationDisabled = DISABLED_OPERATION_TOKENS.includes(tokenId);
  const [icons, totalDailyRewardsMoney] = supplied?.rewards?.reduce(
    (acc, cur) => {
      const { rewards, metadata, config, price } = cur;
      const { icon, decimals } = metadata;
      const dailyRewards = Number(
        shrinkToken(
          rewards.reward_per_day || 0,
          decimals + config.extra_decimals
        )
      );
      acc[1] = new Decimal(acc[1]).plus(dailyRewards * price).toNumber();
      acc[0].push(icon);
      return acc;
    },
    [[], 0]
  ) || [[], 0];
  const handleWithdrawClick = useWithdrawTrigger(tokenId);
  const handleAdjustClick = useAdjustTrigger(tokenId);
  const withdraw_disabled =
    !supplied || !supplied?.canWithdraw || isOperationDisabled;
  const adjust_disabled = !supplied?.canUseAsCollateral;
  const is_empty = !supplied;

  const handleWithdrawModalOpen = () => {
    handleWithdrawClick();
  };
  if (is_empty) return null;
  return (
    <>
      <div className=" relative overflow-hidden">
        <UserBox>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-green-10 rounded-full" />
            <span className="text-lg text-gray-20 font-bold">
              YOUR SUPPLIED
            </span>
          </div>
          <div className="flex flex-col items-center">
            {beautifyNumber({
              num: supplied?.supplied || 0,
              className: "text-2xl text-b-10 font-bold mb-1",
            })}
            <span className="text-lg text-gray-90">
              (
              {supplied
                ? beautifyNumber({
                    num: new Decimal(supplied?.supplied || 0)
                      .mul(supplied?.price || 0)
                      .toFixed(),
                    isUsd: true,
                    className: "text-lg text-gray-90",
                  })
                : "$-"}
              )
            </span>
          </div>
          <div className="bg-gray-80 rounded-lg p-4 mt-6">
            <Label
              title="Collateral"
              content={beautifyNumber({
                num: supplied?.collateral || 0,
              })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 mt-6">
            <YellowLineButton
              disabled={withdraw_disabled}
              className="w-1 flex-grow"
              onClick={handleWithdrawModalOpen}
            >
              Withdraw
            </YellowLineButton>
            {tokenRow.canUseAsCollateral && (
              <YellowLineButton
                disabled={adjust_disabled}
                className="w-1 flex-grow"
                onClick={handleAdjustClick}
              >
                Adjust
              </YellowLineButton>
            )}
          </div>
        </UserBox>
      </div>
    </>
  );
}

function YouBorrowed() {
  const { tokenRow, borrowed, borrowedLp, assets } = useContext(
    DetailData
  ) as any;
  const { tokenId } = tokenRow;
  const [icons, totalDailyRewardsMoney] = borrowed?.rewards?.reduce(
    (acc, cur) => {
      const { rewards, metadata, config, price } = cur;
      const { icon, decimals } = metadata;
      const dailyRewards = Number(
        shrinkToken(
          rewards.reward_per_day || 0,
          decimals + config.extra_decimals
        )
      );
      acc[1] = new Decimal(acc[1]).plus(dailyRewards * price).toNumber();
      acc[0].push(icon);
      return acc;
    },
    [[], 0]
  ) || [[], 0];
  const dispatch = useAppDispatch();
  const handleRepayClick = useRepayTrigger(tokenId);
  const is_empty = !borrowed && !Object.keys(borrowedLp).length;
  const borrowedList = { ...borrowedLp };
  if (borrowed) {
    borrowedList[DEFAULT_POSITION] = borrowed;
  }
  const totalBorrowedAmount = useMemo(() => {
    return Object.values(borrowedList).reduce(
      (acc, b: any) => acc + b.borrowed || 0,
      0
    );
  }, [borrowedList]) as number;
  function getName(position) {
    if (position === DEFAULT_POSITION) return "(Standard Token as collateral)";
    const a = assets.find((asset: UIAsset) => asset.tokenId === position);
    const symbols = a.tokens.reduce(
      (acc, cur, index) =>
        acc +
        (cur.metadata?.symbol || "") +
        (index !== a.tokens.length - 1 ? "-" : ""),
      ""
    );
    return `(${symbols} as collateral)`;
  }
  function getRewardsReactNode(position) {
    const b = borrowedList[position];
    let positionDailyRewardsMoney = "0";
    if (totalBorrowedAmount > 0) {
      positionDailyRewardsMoney = new Decimal(b.borrowed)
        .div(totalBorrowedAmount)
        .mul(totalDailyRewardsMoney)
        .toFixed();
    }
    const RewardsReactNode = b?.rewards?.length ? (
      <div className="flex items-center">
        {icons.map((icon, index) => {
          return (
            <img
              key={index}
              src={icon}
              className="w-4 h-4 rounded-full -ml-0.5"
              alt=""
            />
          );
        })}
        <span className="ml-2">
          {formatWithCommas_usd(totalDailyRewardsMoney)}
        </span>
      </div>
    ) : (
      "-"
    );
    return RewardsReactNode;
  }
  if (is_empty) return null;
  return (
    <div className="relative overflow-hidden">
      <UserBox>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-red-10 rounded-full" />
          <span className="text-lg text-gray-20 font-bold">YOUR BORROWED</span>
        </div>
        <div className="flex flex-col items-center">
          {beautifyNumber({
            num: totalBorrowedAmount || 0,
            className: "text-2xl text-b-10 font-bold mb-1",
          })}
          <span className="text-lg text-gray-90">
            (
            {beautifyNumber({
              num: new Decimal(totalBorrowedAmount)
                .mul(tokenRow?.price || 0)
                .toFixed(),
              isUsd: true,
              className: "text-lg text-gray-90",
            })}
            )
          </span>
        </div>
        {Object.entries(borrowedList).map(
          ([position, borrowedData]: [string, any], index) => (
            <div
              key={position}
              className={`${
                index !== Object.entries(borrowedList).length - 1 ? "mb-8" : ""
              }`}
            >
              <div className="bg-gray-80 rounded-lg p-4 mt-6 flex flex-col gap-y-4">
                <Label
                  title="Borrowed"
                  subTitle={`${getName(position)}`}
                  content={
                    <div className="flex items-center">
                      <span className="text-sm text-gray-20 mr-0.5">
                        {beautifyNumber({
                          num: borrowedData?.borrowed || 0,
                        })}
                      </span>
                      <span className="text-xs text-gray-50">
                        (
                        {beautifyNumber({
                          num: new Decimal(borrowedData?.borrowed || 0)
                            .mul(borrowedData?.price || 0)
                            .toFixed(),
                          isUsd: true,
                          className: "text-xs text-gray-50",
                        })}
                        )
                      </span>
                    </div>
                  }
                />
                <Label
                  title="Your APY"
                  content={
                    <APYCell
                      rewards={tokenRow.borrowRewards}
                      baseAPY={tokenRow.borrowApy}
                      page="borrow"
                      tokenId={tokenRow.tokenId}
                    />
                  }
                />
                <Label
                  title="Daily rewards"
                  content={getRewardsReactNode(position)}
                />
              </div>
              <div className="flex items-center justify-between gap-2 mt-6">
                <RedLineButton
                  className="w-1 flex-grow"
                  onClick={() => {
                    handleRepayClick();
                    dispatch(updatePosition({ position }));
                  }}
                >
                  Repay
                </RedLineButton>
              </div>
            </div>
          )
        )}
      </UserBox>
    </div>
  );
}

function OuterLink() {
  const [swapOpen, setSwapOpen] = useState(false);
  const { tokenRow } = useContext(DetailData) as any;
  // const poolFarmStore = usePoolFarmStore();
  // const swapSequence = poolFarmStore.getSwapSequence();
  const { symbol, isLpToken } = tokenRow;
  // useEffect(() => {
  //   if (swapSequence > 0 && accountId && tokenId) {
  //     dispatch(
  //       fetchTokenBalances({
  //         accountId,
  //         tokenIds: [tokenId],
  //       })
  //     );
  //   }
  // }, [swapSequence, accountId, tokenId]);
  function showSwapOpen() {
    setSwapOpen(true);
  }
  return (
    <div className="mt-1 outline-none">
      {/* {!isLpToken && (
        <LabelOuterLink
          title="Acquire token from"
          content={
            <LabelOuterLinkIcon>
              <div className="flex items-center gap-1" onClick={showSwapOpen}>
                <span className="text-sm">Swap</span>
                <Swap2Icon className="transform scale-75" />
              </div>
            </LabelOuterLinkIcon>
          }
        />
      )} */}
      {OuterLinkConfig[symbol] && (
        <LabelOuterLink
          title="Deposit from"
          className="items-start"
          content={
            <div className="flex flex-col gap-1.5">
              <div
                className={`flex items-center justify-end gap-1.5 ${
                  !OuterLinkConfig[symbol]?.kucoin &&
                  !OuterLinkConfig[symbol]?.binance
                    ? "hidden"
                    : ""
                }`}
              >
                {OuterLinkConfig[symbol]?.kucoin && (
                  <LabelOuterLinkIcon>
                    <CucoinIcon
                      key="2"
                      className="lg:opacity-60 lg:hover:opacity-100"
                      onClick={() => {
                        window.open(OuterLinkConfig[symbol]?.kucoin);
                      }}
                    />
                  </LabelOuterLinkIcon>
                )}
                {OuterLinkConfig[symbol]?.binance && (
                  <LabelOuterLinkIcon>
                    <BinanceIcon
                      key="3"
                      className="lg:opacity-60 lg:hover:opacity-100"
                      onClick={() => {
                        window.open(OuterLinkConfig[symbol]?.binance);
                      }}
                    />
                  </LabelOuterLinkIcon>
                )}
              </div>
              <div
                className={`flex items-center justify-end gap-1.5 ${
                  !OuterLinkConfig[symbol]?.okx &&
                  !OuterLinkConfig[symbol]?.gateio &&
                  !OuterLinkConfig[symbol]?.coinbase
                    ? "hidden"
                    : ""
                }`}
              >
                {OuterLinkConfig[symbol]?.okx && (
                  <LabelOuterLinkIcon>
                    <OKXIon
                      key="3"
                      className="lg:opacity-60 lg:hover:opacity-100"
                      onClick={() => {
                        window.open(OuterLinkConfig[symbol]?.okx);
                      }}
                    />
                  </LabelOuterLinkIcon>
                )}
                {OuterLinkConfig[symbol]?.gateio && (
                  <LabelOuterLinkIcon>
                    <GateIcon
                      key="3"
                      className="lg:opacity-60 lg:hover:opacity-100"
                      onClick={() => {
                        window.open(OuterLinkConfig[symbol]?.gateio);
                      }}
                    />
                  </LabelOuterLinkIcon>
                )}
                {OuterLinkConfig[symbol]?.coinbase && (
                  <LabelOuterLinkIcon>
                    <CoinbaseIcon
                      key="3"
                      className="lg:opacity-60 lg:hover:opacity-100"
                      onClick={() => {
                        window.open(OuterLinkConfig[symbol]?.coinbase);
                      }}
                    />
                  </LabelOuterLinkIcon>
                )}
              </div>
            </div>
          }
        />
      )}
      <LabelOuterLink
        title="Infrastructure"
        content={
          <LabelOuterLinkIcon>
            <NearIntentIcon
              key="4"
              className="h-[22px]"
              onClick={() => {
                window.open("https://near-intents.org/");
              }}
            />
          </LabelOuterLinkIcon>
        }
      />
      {/* <SwapModal isOpen={swapOpen} onRequestClose={() => setSwapOpen(false)} /> */}
    </div>
  );
}

function Box({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`pl-6 pr-[74px] py-5 border border-gray-30 rounded-2xl bg-white max-sm:pl-4 max-sm:pr-4 ${className}`}
    >
      {children}
    </div>
  );
}

function UserBox({
  children,
  className = "",
}: {
  children: string | React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-5 border border-gray-30 rounded-2xl bg-white max-sm:p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function Label({
  title,
  subTitle,
  content,
}: {
  title: string;
  subTitle?: string;
  content: string | React.ReactNode;
}) {
  return (
    <div
      className={`flex justify-between ${
        subTitle ? "items-start" : "items-center"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-sm text-gray-50">{title}</span>
        {subTitle ? (
          <span className="text-sm text-gray-50">{subTitle}</span>
        ) : null}
      </div>
      <div className="flex items-center text-sm text-black">{content}</div>
    </div>
  );
}

function LabelOuterLink({
  title,
  content,
  className,
}: {
  title: string;
  content: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-2", className)}>
      <span className="text-sm text-gray-50">{title}</span>
      {content}
    </div>
  );
}

function LabelOuterLinkIcon({ children }: any) {
  return (
    <span className="flex items-center h-[22px] max-sm:h-8 rounded-md cursor-pointer">
      <span className="">{children}</span>
    </span>
  );
}

function LabelMobile({
  title,
  value,
  subValue,
  subMode,
  hidden,
}: {
  title: string;
  value: string | React.ReactNode;
  subValue?: string;
  subMode?: "line" | "space";
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">{title}</span>
      <span className="text-sm text-black">
        {value}
        {subValue && subMode === "space" ? (
          <span className="text-gray-50 ml-1">{subValue}</span>
        ) : (
          ""
        )}
        {subValue && subMode !== "space" ? (
          <span className="text-gray-50">/{subValue}</span>
        ) : (
          ""
        )}
      </span>
    </div>
  );
}
function LabelMobileAPY({ tokenRow, title }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-50">{title}</span>
      <span className="text-sm text-black">
        <APYCell
          rewards={tokenRow.depositRewards}
          baseAPY={tokenRow.supplyApy}
          page="deposit"
          tokenId={tokenRow.tokenId}
          onlyMarket
        />
      </span>
    </div>
  );
}

export default TokenDetail;
