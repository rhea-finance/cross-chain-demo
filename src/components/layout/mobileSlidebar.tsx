import React, { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app";
import Assets from "@/components/assets";
import { ASSETS_CHAINS_SUPPORT_UI } from "@/services/chainConfig";
import useWalletConnect from "@/hooks/useWalletConnect";
import useChainsLendingBalance from "@/hooks/useChainsLendingBalance";
import { useChainAccountStore } from "@/stores/chainAccount";

export default function MobileSlidebar() {
  const appStore = useAppStore();
  const isCollapse = appStore.getIsCollapse();
  const [accountAssetsMap, setAccountAssetsMap] = useState<{
    [key: string]: {
      symbol: string;
      icon: string;
      total: string;
      details: any[];
    };
  }>({});

  const { evm, solana, btc } = useWalletConnect();
  useChainsLendingBalance();
  const chainAccountStore = useChainAccountStore();
  const balances = chainAccountStore.getBalances();

  useEffect(() => {
    get_balances_ui_data();
  }, [
    JSON.stringify(balances || {}),
    evm.isSignedIn,
    solana.isSignedIn,
    btc.isSignedIn,
  ]);

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
    });
    setAccountAssetsMap(ui_map);
  }

  function switchEvent() {
    appStore.setIsCollapse(!isCollapse);
  }

  return (
    <>
      {/* Modal popup when expanded */}
      {!isCollapse && (
        <div className="fixed inset-0 z-11 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={switchEvent} />
          <div className="relative w-full max-h-[65vh] bg-b-50 overflow-y-auto mb-[66px]">
            <div className="px-5 py-1">
              <Assets />
            </div>
          </div>
        </div>
      )}

      {/* Bottom token icons row - always visible, not affected by modal */}
      <div className="fixed bottom-0 left-0 right-0 z-12 bg-b-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[22px]">
            {Object.values(accountAssetsMap).map((item) => (
              <img
                key={item.symbol}
                src={item.icon}
                className="w-[34px] h-[34px] border border-b-60 rounded-full cursor-pointer"
                onClick={switchEvent}
                alt={item.symbol}
              />
            ))}
            <div
              onClick={switchEvent}
              className="h-[34px] w-auto border border-gray-90 rounded-xl px-4 flex items-center text-sm text-white cursor-pointer"
            >
              +{Object.keys(accountAssetsMap).length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
