import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { Icon } from "@iconify/react";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { Button } from "@heroui/react";
import { Img } from "./common/img";
import {
  ASSETS_CHAINS_SUPPORT_UI,
  EVM_CHAINS,
  SOLANA_CHAIN,
  ASSETS_CHAINS_EVM,
} from "@/services/chainConfig";
import useWalletConnect from "@/hooks/useWalletConnect";
import useChainsLendingBalance from "@/hooks/useChainsLendingBalance";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
import {
  useChainAccountStore,
  useChainAccountInstantStore,
} from "@/stores/chainAccount";

export default function Assets() {
  const [expandId, setExpandId] = useState("USDC");
  // init balances of chains
  useChainsLendingBalance();
  const dispatch = useAppDispatch();
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const btcBalanceLoading = chainAccountInstantStore.getBtcBalanceLoading();
  const solanaBalanceLoading =
    chainAccountInstantStore.getSolanaBalanceLoading();
  const evmBalanceLoading = chainAccountInstantStore.getEvmBalanceLoading();
  const chainAccountStore = useChainAccountStore();
  const balances = chainAccountStore.getBalances();
  const accountAssetsMap = chainAccountStore.getBalancesUi();
  useEffect(() => {
    get_balances_ui_data();
  }, [
    JSON.stringify(balances || {}),
    evm.isSignedIn,
    solana.isSignedIn,
    btc.isSignedIn,
  ]);
  useEffect(() => {
    if (btc.isSignedIn && expandId == "BTC") {
      setExpandId("");
    }
  }, [btc.isSignedIn, expandId]);
  function switchId(id) {
    if (id == expandId) {
      setExpandId("");
    } else {
      setExpandId(id);
    }
  }
  function get_balances_ui_data() {
    const ui_map = {};
    ASSETS_CHAINS_SUPPORT_UI.map((asset) => {
      const { supportChain, symbol, icon } = asset;
      ui_map[symbol] = {
        symbol,
        icon,
        total: "0",
        details: [],
      };
      if (supportChain.includes("evm") && evm.isSignedIn) {
        const chainMap = EVM_CHAINS.reduce((acc, cur) => {
          acc[cur.label] = cur;
          return acc;
        }, {});
        const chainAssetsMap = ASSETS_CHAINS_EVM.reduce((acc, cur) => {
          acc[cur.symbol] = cur;
          return acc;
        }, {});
        const evm_balances_of_symbol = balances["evm"]?.[symbol] || {};
        const evm_addresses_of_symbol = chainAssetsMap[symbol].addresses;
        const res = Object.keys(evm_addresses_of_symbol).reduce(
          (acc, cur) => {
            const _b = evm_balances_of_symbol[cur] || "0";
            acc.assets.push({
              chain: cur,
              chainIcon: chainMap?.[cur]?.icon,
              balanceOnChain: _b,
            });
            acc.total = new Decimal(acc.total || 0).plus(_b).toFixed();
            return acc;
          },
          { assets: [], total: "0" }
        );
        ui_map[symbol].details = [...ui_map[symbol].details, ...res.assets];
        ui_map[symbol].total = new Decimal(ui_map[symbol].total || 0)
          .plus(res.total || 0)
          .toFixed();
      }
      if (supportChain.includes("solana") && solana.isSignedIn) {
        const _b = balances?.["solana"]?.[symbol]?.balance || "0";
        ui_map[symbol].details = [
          ...ui_map[symbol].details,
          {
            chain: "Solana",
            chainIcon: SOLANA_CHAIN.icon,
            balanceOnChain: _b,
          },
        ];
        ui_map[symbol].total = new Decimal(ui_map[symbol].total || 0)
          .plus(_b)
          .toFixed();
      }
      if (supportChain.includes("btc") && btc.isSignedIn) {
        ui_map[symbol].total = balances["btc"] || "0";
      }
    });
    chainAccountStore.setBalancesUi(ui_map);
  }
  function show() {
    dispatch(showWalletModal());
  }

  return (
    <div className="mt-6">
      <div className="flex items-center text-base text-white mb-6">
        Assets across all your wallets
      </div>
      <div className="flex flex-col gap-4 w-full">
        {Object.values(accountAssetsMap).map((item) => {
          const isBTC = item.symbol == "BTC";
          const assetOnSolana = item.details?.find((d) => d.chain == "Solana");
          const assetOnEvm = item.details?.find(
            (d) => d.chain !== "Solana" && !isBTC
          );
          const is_btc_loading_wrap = isBTC && btcBalanceLoading;
          const is_solana_loading_wrap = assetOnSolana && solanaBalanceLoading;
          const is_evm_loading_wrap = assetOnEvm && evmBalanceLoading;
          const is_loading_wrap =
            is_btc_loading_wrap ||
            is_solana_loading_wrap ||
            is_evm_loading_wrap;

          const assetUi = ASSETS_CHAINS_SUPPORT_UI.find(
            (a) => a.symbol.toLowerCase() == item.symbol.toLowerCase()
          );
          if (!assetUi) return null;
          const show_connect_button =
            (assetUi.supportChain.includes("solana") && !solana.isSignedIn) ||
            (assetUi.supportChain.includes("evm") && !evm.isSignedIn) ||
            (isBTC && !btc.isSignedIn);
          let show_more_connect_button = false;
          if (assetUi.supportChain.length > 1) {
            if (
              assetOnSolana &&
              !evm.isSignedIn &&
              assetUi.supportChain.includes("evm")
            ) {
              show_more_connect_button = true;
            } else if (
              assetOnEvm &&
              !solana.isSignedIn &&
              assetUi.supportChain.includes("solana")
            ) {
              show_more_connect_button = true;
            }
          }
          const is_btc_and_signedIn = isBTC && btc.isSignedIn;
          return (
            <div
              key={item.symbol}
              className={`border border-gray-180 rounded-xl p-3.5 ${
                expandId == item.symbol ? "bg-gray-180/30" : ""
              }`}
            >
              {/* total balance */}
              <div
                className={`flex items-center justify-between h-[32px] ${
                  is_btc_and_signedIn ? "" : "cursor-pointer"
                }`}
                onClick={() => {
                  if (!is_btc_and_signedIn) {
                    switchId(item.symbol);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={item.icon}
                    className={`w-[30px] h-[30px] rounded-full ${
                      item.symbol.toLowerCase() == "wbtc" ? "bg-white" : ""
                    }`}
                    alt=""
                  />
                  <span className="text-sm text-white">{item.symbol}</span>
                  {is_loading_wrap ? (
                    <Icon
                      icon="line-md:loading-twotone-loop"
                      className="text-xl"
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <span>
                    {beautifyNumber({
                      num: item.total,
                      className: "text-sm text-white",
                    })}
                  </span>
                  {is_btc_and_signedIn ? null : (
                    <Icon
                      icon="iconamoon:arrow-down-2"
                      className="text-gray-40 text-2xl"
                    />
                  )}
                </div>
              </div>
              {/* detail balances */}
              <div
                className={`border-t border-gray-190 mt-3 ${
                  expandId == item.symbol ? "" : "hidden"
                }`}
              >
                <div
                  className={`flex items-center justify-between text-sm text-white/50 h-[38px] py-2 ${
                    isBTC || (show_connect_button && !show_more_connect_button)
                      ? "hidden"
                      : ""
                  }`}
                >
                  <span>Chain</span>
                  <span>Balance</span>
                </div>
                {item.details?.map((sub) => {
                  return (
                    <div
                      key={sub.chain}
                      className="flex items-center justify-between text-sm text-white h-[38px]"
                    >
                      <div className="flex items-center gap-2">
                        <Img path={sub.chainIcon} className="w-5 h-5" />
                        <span>{sub.chain}</span>
                      </div>
                      <span>
                        {beautifyNumber({
                          num: sub.balanceOnChain,
                          className: "text-sm text-white",
                        })}
                      </span>
                    </div>
                  );
                })}
                {show_connect_button ? (
                  <Button
                    className="w-full rounded-md border border-gray-180 bg-transparent text-xs text-gray-200 h-7 mt-5 mb-2"
                    onPress={show}
                  >
                    {show_more_connect_button
                      ? "Connect More wallets"
                      : "Connect wallets"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
