import _ from "lodash";
import { useEffect, useState } from "react";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";
import { config_evm } from "@rhea-finance/cross-chain-sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ethers } from "ethers";
import type { PublicKey, Connection } from "@solana/web3.js";
import { useBTCProvider, getPublicKeyBase58 } from "btc-wallet";
declare global {
  interface Window {
    ethProvider: ReturnType<typeof useConnectWallet>[0]["wallet"]["provider"];
    ethWeb3Provider: ethers.providers.Web3Provider;
    solanaWallet: {
      publicKey: PublicKey;
      connection: Connection;
    } & ReturnType<typeof useWallet>;
  }
}
export default function useWalletConnect() {
  // evm
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const [{ connectedChain }, setChain] = useSetChain();
  const isEVMSignedIn = wallet && !connecting;
  const evm_wallet = {
    accountId: wallet?.accounts?.[0]?.address,
    isSignedIn: isEVMSignedIn,
    connectedChainData: _.pick(
      Object.values(config_evm.chains).find(
        (c) => c.id.toLowerCase() === connectedChain?.id?.toLowerCase()
      ) || {},
      ["id", "label"]
    ) as { id: string; label: string },
    open: connect,
    disconnect: async () => {
      await disconnect({ label: wallet?.label || "" });
    },
    setChain: (id: string) => {
      if (!isEVMSignedIn) return;
      if (id?.toLowerCase() !== connectedChain?.id?.toLowerCase()) {
        setChain({ chainId: id });
      }
    },
  };
  // solana
  const walletHooks = useWallet();
  const { connected, disconnect: solanaDisconnect, publicKey } = walletHooks;
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const solana_wallet = {
    accountId: publicKey?.toBase58(),
    isSignedIn: !!connected,
    open: () => {
      setVisible(true);
    },
    disconnect: async () => {
      await solanaDisconnect();
    },
  };
  // btc
  const [btc_publicKey, set_btc_publicKey] = useState("");
  const { accounts, connector } = useBTCProvider();
  const btc_wallet = {
    accountId: accounts?.[0] || null,
    isSignedIn: !!accounts?.length && !!connector,
    open: async () => {
      try {
        await window.btcContext.login();
      } catch (error) {
        console.error("Failed to connect BTC wallet:", error);
      }
    },
    disconnect: async () => {
      try {
        await window.btcContext.logout();
      } catch (error) {
        console.error("Failed to disconnect BTC wallet:", error);
      }
    },
  };
  useEffect(() => {
    if (btc_wallet.accountId) {
      getPublicKeyBase58().then((res) => {
        set_btc_publicKey(res);
      });
    } else {
      set_btc_publicKey("");
    }
  }, [btc_wallet.accountId]);
  // evm on window
  useEffect(() => {
    if (wallet?.provider && evm_wallet.accountId) {
      window.ethProvider = wallet?.provider;
      window.ethWeb3Provider = new ethers.providers.Web3Provider(
        wallet?.provider,
        "any"
      );
    }
  }, [wallet?.provider, evm_wallet.accountId]);

  // solana on window
  useEffect(() => {
    if (solana_wallet.accountId) {
      window.solanaWallet = {
        publicKey,
        connection,
        ...walletHooks,
      };
    }
  }, [solana_wallet.accountId, publicKey, connection, walletHooks]);

  return {
    evm: evm_wallet,
    solana: solana_wallet,
    btc: {
      ...btc_wallet,
      publicKey: btc_publicKey,
    },
  };
}
