import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { BeatLoader } from "react-spinners";
import { DefaultModal } from "@/components/common/modal";
import { useRewards } from "@/hooks/lending/useRewards";
import { useNonFarmedAssets } from "@/hooks/lending/hooks";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { getTotalAccountBalance } from "@/redux/selectors/getTotalAccountBalance";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { claimAll } from "@/services/lending/actions/claimAll";
import successToast from "@/components/common/toast/successToast";
import failToast from "@/components/common/toast/failToast";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";
import { useChainAccountStore } from "@/stores/chainAccount";
import { useFetchData } from "@/hooks/lending/useFetchData";
import { useConnectedChainData } from "@/hooks/useChainsLendingStatus";
import { CloseButton } from "../lending/actionModal/components";

export default function ClaimJoinModal({
  isOpen,
  onRequestClose,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
}) {
  const [dontShow, setDontShow] = useState(false);
  const [claimLoading, setClaimLoading] = useState<boolean>(false);
  const { data } = useRewards();
  const { relayer_near_gas_fee_amount } = useRelayerConfigGasFee();
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const { hasNonFarmedAssets } = useNonFarmedAssets();
  const { fetchData } = useFetchData();
  const userSupplied = useAppSelector(getTotalAccountBalance("supplied"));
  const displayAmount = hasNonFarmedAssets
    ? userSupplied
    : data?.totalUnClaimUSD || 0;
  const connectedChainData = useConnectedChainData();
  const { chain, identityKey } = connectedChainData || {};
  if (displayAmount <= 0) {
    return null;
  }
  async function doClaimAll() {
    setClaimLoading(true);
    const { status, message } = await claimAll({
      mca,
      chain,
      identityKey,
      relayerNearGasAmount: relayer_near_gas_fee_amount,
    });
    if (status == "success") {
      successToast();
    } else if (status == "error") {
      failToast({
        failText: message,
        noAutoClose: true,
      });
    }
    // fetch lending data
    fetchData({
      accountId: mca,
    });
    setClaimLoading(false);
    onRequestClose();
  }
  return (
    <DefaultModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div className="bg-white rounded-[20px] p-8 lg:w-[400px] max-sm:w-[95vw]">
        <div className="flex items-center justify-end">
          <CloseButton onClose={onRequestClose} className="cursor-pointer" />
        </div>
        <div className="flex flex-col items-center">
          <div className="text-5xl mb-4">💡</div>
          <div className="text-black text-2xl font-medium">Claim rewards</div>
          <div className="text-center text-sm text-gray-40 mt-3">
            Your rewards will be auto-deposited into your Supply
            <br />
            balance to earn yield.
          </div>
          <div className="w-full rounded-xl bg-gray-80 p-4 mt-[28px]">
            <div className="flex items-center justify-between text-sm text-gray-40">
              <span>Your Rewards:</span>
              <div className="flex items-center gap-2">
                <span className="line-through text-gray-40">
                  {beautifyNumber({
                    num: displayAmount,
                    isUsd: true,
                  })}
                </span>
                <span className="text-black">→ $0</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-40 mt-3">
              <span>You&apos;ll supply balance:</span>
              <span className="text-b-10">
                +
                {beautifyNumber({
                  num: displayAmount,
                  isUsd: true,
                })}
              </span>
            </div>
          </div>
          <Button
            className="w-full py-3 bg-green-10 text-black rounded-xl font-medium mt-6"
            onPress={doClaimAll}
            isDisabled={!mca}
          >
            {claimLoading ? <BeatLoader size={5} color="#16161B" /> : "Claim"}
          </Button>
        </div>
      </div>
    </DefaultModal>
  );
}
