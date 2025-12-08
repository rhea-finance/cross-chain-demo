import React, { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import { Img } from "../common/img";
import useWalletConnect from "@/hooks/useWalletConnect";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import { MobileMenuIcon } from "../common/Icons";
import { MENU_ITEMS, isMenuActive } from "./menuConfig";
import { ChainStatusIcon } from "./ChainStatusIcon";
import DustSet from "../common/DustSet";

export default function MobileMenu() {
  const { evm, solana, btc } = useWalletConnect();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  function toggleMenu() {
    setIsDrawerOpen(!isDrawerOpen);
  }

  function handleMenuClick(path: string) {
    router.push(path);
    setIsDrawerOpen(false);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Img path="rhea-logo-black.svg" className="w-[34px] h-[30px]" />
      </div>

      <div className="flex items-center gap-3">
        {/* Login */}
        <Button
          className={`flex items-center justify-between text-sm rounded-xl outline-none h-8 cursor-pointer ${
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
                  <ChainStatusIcon chain={i as IChain} key={i} />
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
        {/* Menu Toggle Button */}
        <button onClick={toggleMenu}>
          <MobileMenuIcon />
        </button>
      </div>

      {/* Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="py-4 px-6">
              <div className="flex justify-end mb-4">
                <button className="" onClick={() => setIsDrawerOpen(false)}>
                  <Icon icon="iconamoon:close" className="text-black text-lg" />
                </button>
              </div>
              <div className="space-y-1">
                {MENU_ITEMS.map((item) => {
                  const isActive = isMenuActive(router.pathname, item);
                  return (
                    <div
                      key={item.path}
                      onClick={() => handleMenuClick(item.path)}
                      className={`flex items-center gap-4 cursor-pointer px-4 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-gray-10" : "hover:bg-gray-10/50"
                      }`}
                    >
                      <span
                        className={`text-base ${
                          isActive ? "text-black font-semibold" : "text-gray-50"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
