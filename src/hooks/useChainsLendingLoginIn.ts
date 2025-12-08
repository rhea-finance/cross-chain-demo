import { useEffect, useRef } from "react";
import _ from "lodash";
import useWalletConnect from "@/hooks/useWalletConnect";
import {
  IChain,
  getMcaByWallet,
  getListWalletsByMca,
} from "@rhea-finance/cross-chain-sdk";
import { IWalletData } from "@/interface/lending/chains";
import { useChainAccountStore } from "@/stores/chainAccount";
import { getWalletModalStatus } from "@/redux/selectors/appSelectors";
import { useAppDispatch, useAppSelector } from "@/hooks/lending/useRedux";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
export function useChainsLendingLoginIn({
  setShowSetModal,
  setLoading,
  setTipWalletData,
}: {
  setShowSetModal: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setTipWalletData: (v: IWalletData) => void;
}) {
  const evmFirstRun = useRef(true);
  const solanaFirstRun = useRef(true);
  const btcFirstRun = useRef(true);
  const { evm, solana, btc } = useWalletConnect();
  const { getChansStatus } = useChainsLendingStatus();
  const dispatch = useAppDispatch();
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const mcaWallets = chainAccountStore.getMcaWallets();
  const firstLoginWallet = chainAccountStore.getFirstLoginWallet();
  const isOpen = useAppSelector(getWalletModalStatus);
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  const connectedSolanaAccountId = solana.accountId;
  /**
   * select a first wallet
   * as standard for mca
   * action manual
   */
  useEffect(() => {
    if (evmFirstRun.current) {
      evmFirstRun.current = false;
      return;
    }
    if (evmStatus.accountId && !firstLoginWallet) {
      chainAccountStore.setFirstLoginWallet("evm");
    }
  }, [evm.accountId, firstLoginWallet]);
  useEffect(() => {
    if (solanaFirstRun.current) {
      solanaFirstRun.current = false;
      return;
    }
    if (solanaStatus.accountId && !firstLoginWallet) {
      chainAccountStore.setFirstLoginWallet("solana");
    }
  }, [solana.accountId, firstLoginWallet]);
  useEffect(() => {
    if (btcFirstRun.current) {
      btcFirstRun.current = false;
      return;
    }
    if (btcStatus.accountId && !firstLoginWallet) {
      chainAccountStore.setFirstLoginWallet("btc");
    }
  }, [btc.accountId, firstLoginWallet]);

  /**
   * get login in account status
   * action auto
   */
  useEffect(() => {
    if (evm.accountId && firstLoginWallet) {
      if (firstLoginWallet == "evm") {
        get_mca_data({
          chain: "evm",
          identityKey: evm.accountId,
          accountId: evm.accountId,
        });
        chainAccountStore.setEvmAccountIsOtherMca(false);
      } else {
        checkAccountValidity({
          chain: "evm",
          identityKey: evm.accountId,
        }).then((status) => {
          if (status == 2) {
            chainAccountStore.setEvmAccountIsOtherMca(true);
          }
        });
      }
    }
  }, [evm.accountId, firstLoginWallet, mca]);
  useEffect(() => {
    if (solana.accountId && firstLoginWallet) {
      if (firstLoginWallet == "solana") {
        get_mca_data({
          chain: "solana",
          identityKey: solana.accountId,
          accountId: solana.accountId,
        });
        chainAccountStore.setSolanaAccountIsOtherMca(false);
      } else {
        checkAccountValidity({
          chain: "solana",
          identityKey: solana.accountId,
        }).then(async (status) => {
          if (status == 2) {
            chainAccountStore.setSolanaAccountIsOtherMca(true);
          }
        });
      }
    }
  }, [solana.accountId, firstLoginWallet, mca]);
  useEffect(() => {
    if (btc.accountId && btc.publicKey && firstLoginWallet) {
      if (firstLoginWallet == "btc") {
        get_mca_data({
          chain: "btc",
          identityKey: btc.publicKey,
          accountId: btc.accountId,
        });
        chainAccountStore.setBtcAccountIsOtherMca(false);
      } else {
        checkAccountValidity({
          chain: "btc",
          identityKey: btc.publicKey,
        }).then((status) => {
          if (status == 2) {
            chainAccountStore.setBtcAccountIsOtherMca(true);
          }
        });
      }
    }
  }, [btc.accountId, btc.publicKey, firstLoginWallet, mca]);
  async function get_mca_data({
    chain,
    identityKey,
    accountId,
  }: {
    chain: IChain;
    identityKey: string;
    accountId;
  }) {
    setLoading(true);
    const currentMca = chainAccountStore.getMca();
    const mca_id = await get_mca_by_wallet({ chain, identityKey });

    const mcaChanged =
      (currentMca && !mca_id) ||
      (!currentMca && mca_id) ||
      (currentMca && mca_id && currentMca !== mca_id);

    if (mca_id) {
      const wallets = await getListWalletsByMca(mca_id);
      chainAccountStore.setMca(mca_id);
      chainAccountStore.setMcaWallets(wallets);
    } else {
      if (currentMca) {
        chainAccountStore.setMca("");
        chainAccountStore.setMcaWallets([]);
      }

      if (isOpen) {
        setShowSetModal(true);
        setTipWalletData({
          chain,
          accountId,
          identityKey,
        });
      }
    }
    setLoading(false);
  }
  async function get_mca_by_wallet({
    chain,
    identityKey,
  }: {
    chain: IChain;
    identityKey: string;
  }) {
    const mca_id = await getMcaByWallet({ chain, identityKey });
    return mca_id;
  }

  async function checkAccountValidity({
    chain,
    identityKey,
  }: {
    chain: IChain;
    identityKey: string;
  }) {
    if (chain == "evm") {
      const w = mcaWallets.find((item) => item["EVM"]);
      if (w) {
        const [key, value] = Object.entries(w)[0];
        if ("0x" + value !== identityKey) {
          return 1;
        }
      } else {
        setLoading(true);
        const otherMca = await get_mca_by_wallet({ chain, identityKey });
        setLoading(false);
        if (otherMca && mca !== otherMca) {
          return 2;
        }
      }
      return 0;
    }
    if (chain == "solana") {
      const w = mcaWallets.find((item) => item["Solana"]);
      if (w) {
        const [key, value] = Object.entries(w)[0];
        if (value !== identityKey) {
          return 1;
        }
      } else {
        setLoading(true);
        const otherMca = await get_mca_by_wallet({ chain, identityKey });
        setLoading(false);
        if (otherMca && mca !== otherMca) {
          return 2;
        }
      }
      return 0;
    }
    if (chain == "btc") {
      const w = mcaWallets.find((item) => item["Bitcoin"]);
      if (w) {
        const [key, value] = Object.entries(w)[0];
        if (value !== identityKey) {
          return 1;
        }
      } else {
        setLoading(true);
        const otherMca = await get_mca_by_wallet({ chain, identityKey });
        setLoading(false);
        if (otherMca && mca !== otherMca) {
          return 2;
        }
      }
      return 0;
    }
  }
}
