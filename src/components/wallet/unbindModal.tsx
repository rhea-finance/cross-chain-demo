import { useEffect, useMemo, useState, useContext } from "react";
import { DefaultModal } from "@/components/common/modal";
import { Button } from "@heroui/react";
import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react";
import { getAccountIdUi, getChainUiByChain } from "@/utils/chainsUtil";
import { removeWallet } from "@/services/lending/actions/am_mca";
import { useChainAccountStore } from "@/stores/chainAccount";
import { ButtonTextWrapper } from "@/components/common/Button";
import failToast from "@/components/common/toast/failToast";
import successToast from "@/components/common/toast/successToast";
import useFetchMcaAndWallets from "@/hooks/useFetchMcaAndWallets";
import { IUnBindData } from "@/interface/lending/chains";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";

export default function UnBindModal({
  isOpen,
  onRequestClose,
  unBindData,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  unBindData: IUnBindData;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const chainAccountStore = useChainAccountStore();
  const { fetchAndUpdateWallets } = useFetchMcaAndWallets();
  const mca = chainAccountStore.getMca();
  const selectedEvmChain = chainAccountStore.getSelectedEvmChain();
  const { relayer_near_gas_fee_amount } = useRelayerConfigGasFee();
  const { name, icon, accountId } = useMemo(() => {
    const { name, icon } = getChainUiByChain({
      chain: unBindData?.deleteWallet?.chain,
      subChain: selectedEvmChain,
    });
    const accountId = getAccountIdUi(unBindData?.deleteWallet?.accountId);
    return {
      name,
      icon,
      accountId,
    };
  }, [unBindData?.deleteWallet]);
  async function doUnBind() {
    setLoading(true);
    const { status, message } = await removeWallet({
      mca,
      signerWallet: unBindData.signerWallet,
      deleteWallet: unBindData.deleteWallet,
      relayerGasAMount: relayer_near_gas_fee_amount,
    });
    if (status == "success") {
      successToast({
        successText: `${unBindData.deleteWallet.accountId} has been removed`,
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
        <div className="border-2 border-black/20 rounded-xl bg-gray-160  mt-[34px] p-5 py-4 w-full">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col justify-center items-center">
              <Img path={icon} className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center relative">
              <span className="border-b border-dashed border-black/50 w-[100px]"></span>
              <Icon
                icon="fluent:triangle-right-32-filled"
                className="text-black/50"
              />
              <div className="flex items-center justify-center absolute w-9 h-9 rounded-full bg-gray-170">
                <Img path="disconnected-8-icon.svg" className="w-7" />
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
        <div className="text-xs text-gray-40 text-center mt-4 mb-5">
          Your {name} wallet will be DisConnected to this Cross-chain Account.
        </div>

        <Button
          className="rounded-lg border border-black bg-transparent text-base text-black w-full h-[46px] mt-8"
          onPress={doUnBind}
        >
          <ButtonTextWrapper
            loading={loading}
            loadingColor="#000000"
            Text={() => "Disconnect"}
          />
        </Button>
      </div>
    </DefaultModal>
  );
}
