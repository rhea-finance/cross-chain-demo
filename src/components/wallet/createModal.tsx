import Decimal from "decimal.js";
import { useMemo, useState } from "react";
import { DefaultModal } from "@/components/common/modal";
import { Button } from "@heroui/react";
import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react";
import { getAccountIdUi, getChainUiByChain } from "@/utils/chainsUtil";
import { createMCA } from "@/services/lending/actions/am_mca";
import { ButtonTextWrapper } from "@/components/common/Button";
import failToast from "@/components/common/toast/failToast";
import useFetchMcaAndWallets from "@/hooks/useFetchMcaAndWallets";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { useChainAccountStore } from "@/stores/chainAccount";
import { pollingTransactionStatus } from "@rhea-finance/cross-chain-sdk";
import { showIntentsModal } from "@/redux/slice/appSlice";
import { useSelectedChainSymbolBalance } from "@/hooks/useChainsLendingStatus";
import {
  SetUpFeeSelector,
  Alerts,
} from "@/components/lending/actionModal/components";
import { useUpdateTokenChainBalance } from "@/hooks/useChainsLendingBalance";
import { ICreateFeeToken, IWalletData } from "@/interface/lending/chains";
import { expandToken } from "@/utils/numbers";
import { getChainTokenMetadataBySymbol } from "@/utils/chainsUtil";

export default function CreateModal({
  isOpen,
  onRequestClose,
  createData,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  createData: IWalletData;
}) {
  const dispatch = useAppDispatch();
  const chainAccountStore = useChainAccountStore();
  const [selectedFeeTokenData, setSelectedFeeTokenData] =
    useState<ICreateFeeToken>();
  const [loading, setLoading] = useState<boolean>(false);
  const { fetchMcaAndWallets } = useFetchMcaAndWallets();
  const selectedEvmChain = chainAccountStore.getSelectedEvmChain();
  const { updateSimgleTokenChainBalance } = useUpdateTokenChainBalance();
  const { icon, accountId } = useMemo(() => {
    const { icon } = getChainUiByChain({
      chain: createData?.chain,
      subChain: selectedEvmChain,
    });
    const accountId = getAccountIdUi(createData?.accountId);
    return {
      icon,
      accountId,
    };
  }, [createData, selectedEvmChain]);
  const symbolBalance = useSelectedChainSymbolBalance({
    chain: createData?.chain,
    subChain: selectedEvmChain,
    symbol: selectedFeeTokenData?.metadata?.symbol,
  });
  const { alerts, isDisabled, disabledText } = useMemo(() => {
    if (
      new Decimal(selectedFeeTokenData?.totalFeeAmoutRead || 0).gt(
        symbolBalance
      )
    ) {
      return {
        alerts: {
          createMca: {
            title: `Insufficient Balance`,
            severity: "warning",
          },
        },
        isDisabled: true,
        disabledText: undefined,
      };
    }
    return {
      alerts: {},
      isDisabled: false,
      disabledText: undefined,
    };
  }, [symbolBalance, selectedFeeTokenData?.totalFeeAmoutRead]);
  async function doCreate() {
    setLoading(true);
    const total_amount_read = selectedFeeTokenData?.totalFeeAmoutRead || "0";
    const { decimal } = getChainTokenMetadataBySymbol({
      chain: createData.chain,
      subChain: selectedEvmChain,
      symbol: selectedFeeTokenData.metadata.symbol,
    });
    const { status, message, depositAddress } = await createMCA({
      symbol: selectedFeeTokenData?.metadata?.symbol,
      selectedEvmChain,
      chain: createData.chain,
      identityKey: createData.identityKey,
      amount: expandToken(total_amount_read, decimal),
      outChainAccountId: createData.accountId,
    });
    if (status == "success") {
      dispatch(
        showIntentsModal({
          status: "pending",
          chain: createData.chain,
          selectedEvmChain,
        })
      );
      const { status: bridge_status } = await pollingTransactionStatus(
        depositAddress
      );
      dispatch(
        showIntentsModal({
          status: bridge_status == "success" ? "success" : "error",
          chain: createData.chain,
          selectedEvmChain,
        })
      );
      fetchMcaAndWallets({
        chain: createData.chain,
        identityKey: createData.identityKey,
      });
      updateSimgleTokenChainBalance({
        chain: createData.chain,
        subChain: selectedEvmChain,
        symbol: selectedFeeTokenData?.metadata?.symbol,
      });
    } else if (status == "error") {
      failToast({
        failText: message,
        noAutoClose: true,
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
          Create Cross-chain Account
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
        <div className="flex flex-col gap-4 rounded-xl bg-gray-80 p-4 w-full mt-4 relative z-[2]">
          <SetUpFeeSelector
            chain={createData?.chain}
            subChain={selectedEvmChain}
            setSelectedFeeTokenData={setSelectedFeeTokenData}
            selectedFeeTokenData={selectedFeeTokenData}
          />
        </div>

        {/* tip  */}
        <div className="flex items-start w-full mt-10 mb-2">
          <Alerts data={alerts} />
        </div>
        <Button
          disabled={isDisabled}
          className={`rounded-lg text-base text-black w-full h-[46px] ${
            isDisabled ? " cursor-not-allowed" : "bg-green-10"
          }`}
          onPress={doCreate}
        >
          <ButtonTextWrapper
            loading={loading}
            Text={() => disabledText || "Create"}
          />
        </Button>
      </div>
    </DefaultModal>
  );
}
