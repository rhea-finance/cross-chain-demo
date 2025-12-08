import { useEffect } from "react";
import Modal from "react-modal";
import { useFetchData } from "@/hooks/lending/useFetchData";
import { useIdle, useInterval } from "react-use";
import { IDLE_INTERVAL, REFETCH_INTERVAL } from "@/services/constantConfig";
import { isMobile } from "@/utils/device";
import { useChainAccountStore } from "@/stores/chainAccount";
import { useChainAppStore } from "@/stores/chainApp";
import {
  getCreateMcaFeePaged,
  getNearValuesPaged,
  getMultichainLendingConfig,
  setCustomNodeUrl,
} from "@rhea-finance/cross-chain-sdk";
import { ASSETS_CHAINS_NEAR } from "@/services/chainConfig";

const mobile = isMobile();
setCustomNodeUrl("https://nearinner.deltarpc.com");
export default function Init() {
  const isIdle = useIdle(IDLE_INTERVAL);
  const { fetchData } = useFetchData();
  const chainAccountStore = useChainAccountStore();
  const chainAppStore = useChainAppStore();
  const mca = chainAccountStore.getMca();
  const tokenIds = ASSETS_CHAINS_NEAR.map((asset) => asset.address);

  useEffect(() => {
    getCreateMcaFeePaged().then((res) => {
      chainAppStore.setCreateMcaFeePaged(res);
    });
    getNearValuesPaged().then((res) => {
      chainAppStore.setNearValuesPaged(res);
    });
    getMultichainLendingConfig().then((res) => {
      const target_relayer = res.find(
        (item) => item["key"] == "COLLECT_FEE_ACCOUNT_ID"
      );
      const target_gas = res.find((item) => item["key"] == "GAS_FEE");
      if (target_relayer && target_gas) {
        const result_gas = JSON.parse(target_gas["value"]);
        const result_relayer = target_relayer["value"];
        chainAppStore.setRelayerGasFees(result_gas);
        chainAppStore.setRelayerId(result_relayer);
      }
    });
  }, []);
  useEffect(() => {
    fetchData({
      accountId: mca,
      tokenIds,
    });
  }, [mca]);

  useInterval(
    () => {
      fetchData({
        accountId: mca,
        tokenIds,
      });
    },
    !isIdle ? REFETCH_INTERVAL : null
  );

  return null;
}

Modal.defaultStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 8,
    outline: "none",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  content: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    ...(mobile
      ? {
          bottom: "0px",
          maxHeight: "66vh",
          overflowY: "auto",
          overflowX: "hidden",
        }
      : { top: "50%" }),
    left: "50%",
    transform: mobile ? "translate(-50%, 0)" : "translate(-50%, -55%)",
    outline: "none",
  },
};
