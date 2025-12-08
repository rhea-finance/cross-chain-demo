import { useMemo } from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import useWalletConnect from "@/hooks/useWalletConnect";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
import { MENU_ITEMS, isMenuActive } from "./menuConfig";
import { ChainMcaStatusIcon } from "./ChainStatusIcon";
import DustSet from "../common/DustSet";

export default function Menu() {
  const { evm, solana, btc } = useWalletConnect();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isTradePage = router.pathname.includes("trade");
  const { chainConnected, chainList } = useMemo(() => {
    const list = [
      { evm: evm?.isSignedIn ? 3 : 0 },
      { solana: solana?.isSignedIn ? 2 : -1 },
      { btc: btc?.isSignedIn ? 1 : -2 },
    ];
    const sorted = list.sort((a, b) => {
      return Object.values(b)[0] - Object.values(a)[0];
    });
    return {
      chainConnected: evm?.isSignedIn || solana?.isSignedIn || btc?.isSignedIn,
      chainList: sorted.map((s) => Object.keys(s)[0]),
    };
  }, [evm?.isSignedIn, solana?.isSignedIn, btc?.isSignedIn]);

  function show() {
    dispatch(showWalletModal());
  }

  function handleMenuClick(path: string) {
    router.push(path);
  }

  return (
    <div className="flex items-start justify-between h-[62px] px-6">
      {/* menu */}
      <div className="flex items-center justify-center gap-2">
        {MENU_ITEMS.map((item) => {
          const isActive = isMenuActive(router.pathname, item);
          return (
            <span
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              className={`text-sm rounded-lg px-5 py-2 cursor-pointer transition-colors ${
                isActive
                  ? "text-black bg-gray-10 font-semibold"
                  : "text-gray-20 bg-transparent hover:bg-gray-10/50"
              }`}
            >
              {item.label}
            </span>
          );
        })}
      </div>
      <div className={`flex items-center gap-3`}>
        {/* wallet button */}
        <Button
          className={`flex items-center justify-between text-sm rounded-xl outline-none h-[38px] cursor-pointer ${
            chainConnected
              ? "border border-gray-30 bg-white pr-1.5"
              : "text-black bg-green-10"
          }`}
          onPress={show}
        >
          {chainConnected ? (
            <>
              <div className="flex items-center">
                {chainList.map((i) => (
                  <ChainMcaStatusIcon chain={i as IChain} key={i} />
                ))}
              </div>
              <Icon
                icon="iconoir:nav-arrow-down"
                className="text-black/50 text-xl"
              />
            </>
          ) : (
            "Connect Wallet"
          )}
        </Button>
        <DustSet />
      </div>
    </div>
  );
}
