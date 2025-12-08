import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import type { AppProps } from "next/app";
import DefaultLayout from "@/components/layout/defaultLayout";
import { HeroUIProvider } from "@heroui/react";
import { Web3OnboardProvider } from "@web3-onboard/react";
import { config_solana } from "@rhea-finance/cross-chain-sdk";
import { solalaWallets, web3Onboard } from "@/services/wallets";
import {
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { BtcWalletSelectorContextProvider } from "btc-wallet";
import Init from "@/components/init";
import ToastContainerEle from "@/components/common/toast/Toast";
import Modal from "@/components/lending/actionModal";
import { store, persistor } from "@/redux/store";
import WalletModal from "@/components/wallet";
import IntentsModal from "@/components/common/intentsModal";
import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import LoadingBar from "react-top-loading-bar";
import { useRouter } from "next/router";
import { ErrorBoundary } from "@sentry/react";
import FallbackError from "@/components/common/FallbackError";
declare global {
  interface Window {
    accountId?: string;
  }
}

type IApp = AppProps & {
  Component: {
    CustomLayout: () => React.ReactNode;
  };
};

export default function App({ Component, pageProps }: IApp) {
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setProgress(30);
    };
    const handleRouteChangeComplete = () => {
      setProgress(100);
    };
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, []);

  return (
    <HeroUIProvider validationBehavior="aria">
      <Head>
        <title>Cross Chain Lending</title>
      </Head>
      <LoadingBar
        color="#00F7A5"
        height={3}
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <ErrorBoundary
        fallback={(error) => {
          return <FallbackError error={error} />;
        }}
      >
        <BtcWalletSelectorContextProvider>
          <Web3OnboardProvider web3Onboard={web3Onboard}>
            <ConnectionProvider endpoint={config_solana.nodeUrl}>
              <WalletProvider wallets={solalaWallets} autoConnect>
                <WalletModalProvider>
                  <Provider store={store}>
                    <PersistGate loading={null} persistor={persistor}>
                      {Component.CustomLayout ? (
                        <Component.CustomLayout />
                      ) : (
                        <DefaultLayout>
                          <Component {...pageProps} />
                        </DefaultLayout>
                      )}
                      <Init />
                      <Modal />
                      <WalletModal />
                      <IntentsModal />
                      <ToastContainerEle />
                    </PersistGate>
                  </Provider>
                </WalletModalProvider>
              </WalletProvider>
            </ConnectionProvider>
          </Web3OnboardProvider>
        </BtcWalletSelectorContextProvider>
      </ErrorBoundary>
    </HeroUIProvider>
  );
}
