import { useEffect, useMemo, useState, useContext } from "react";
import { DefaultModal } from "@/components/common/modal";
import { Button } from "@heroui/react";
import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react";
import { IBindData } from "@/interface/lending/chains";
import { getAccountIdUi, getChainUiByChain } from "@/utils/chainsUtil";
import { addWallet } from "@/services/lending/actions/am_mca";
import { useChainAccountStore } from "@/stores/chainAccount";
import { ButtonTextWrapper } from "@/components/common/Button";
import failToast from "@/components/common/toast/failToast";
import successToast from "@/components/common/toast/successToast";
import useFetchMcaAndWallets from "@/hooks/useFetchMcaAndWallets";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";

export default function BindModal({
  isOpen,
  onRequestClose,
  bindData,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  bindData: IBindData;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const chainAccountStore = useChainAccountStore();
  const { fetchAndUpdateWallets } = useFetchMcaAndWallets();
  const { relayer_near_gas_fee_amount } = useRelayerConfigGasFee();
  const selectedEvmChain = chainAccountStore.getSelectedEvmChain();
  const { name, icon, accountId } = useMemo(() => {
    const { name, icon } = getChainUiByChain({
      chain: bindData?.newWallet?.chain,
      subChain: selectedEvmChain,
    });
    const accountId = getAccountIdUi(bindData?.newWallet?.accountId);
    return {
      name,
      icon,
      accountId,
    };
  }, [bindData?.newWallet]);
  const mca = chainAccountStore.getMca();
  async function doBind() {
    setLoading(true);
    const { status, message } = await addWallet({
      mca,
      signerWallet: bindData.signerWallet,
      newWallet: bindData.newWallet,
      relayerGasAMount: relayer_near_gas_fee_amount,
    });
    if (status == "success") {
      successToast({
        successText: `${bindData.newWallet.accountId} has been bound`,
      });
      fetchAndUpdateWallets();
    } else if (status == "error") {
      failToast({
        failText: message,
      });
    }
    setLoading(false);
    onRequestClose();
  }
  return (
    <DefaultModal
      onRequestClose={onRequestClose}
      isOpen={isOpen}
      style={{
        overlay: {
          zIndex: 10,
        },
      }}
    >
      <div className="flex flex-col items-center rounded-[20px] border border-gray-30 p-8 bg-white lg:w-[438px] max-sm:w-[98vw]">
        <span className="text-2xl text-b-10 paceGrotesk-Bold">
          Connect wallets
        </span>
        <div className="border-2 border-green-10 rounded-xl bg-green-10/15  mt-[34px] p-5 py-4 w-full">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col justify-center items-center">
              <Img path={icon} className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center relative">
              <span className="border-b border-dashed border-black w-[100px]"></span>
              <Icon
                icon="fluent:triangle-right-32-filled"
                className="text-black"
              />
              <div className="flex items-center justify-center absolute w-9 h-9 rounded-full bg-green-10">
                <Img path="onnecting-8-icon.svg" />
              </div>
            </div>
            <div className="flex flex-col justify-center items-center">
              <span className="flex items-center justify-center rounded-xl bg-black w-8 h-8">
                <Img path="rhea-inner-icon.svg" />
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between paceGrotesk-Bold w-full mt-2.5">
            <span className="text-sm text-b-10 ml-[25px]">{accountId}</span>
            <span className="text-sm text-b-10 mr-[5px]">
              Cross-chain Account
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-40 text-center mt-4 mb-8">
          Your {name} wallet will be connected to this Cross-chain Account.
        </div>

        <Button
          className="rounded-lg bg-green-10 text-base text-black w-full h-[46px]"
          onPress={doBind}
        >
          <ButtonTextWrapper loading={loading} Text={() => "Connect"} />
        </Button>
        <div className="text-xs text-gray-40 text-center mt-4">
          Once connected, your wallet joins your Cross-chain Account to share
          the same position
        </div>
      </div>
    </DefaultModal>
  );
}
