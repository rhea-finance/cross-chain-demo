import { DefaultModal } from "@/components/common/modal";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import { IWalletData } from "@/interface/lending/chains";
import { Button } from "@heroui/react";
import { getAccountIdUi } from "@/utils/chainsUtil";

export default function SetUpModal({
  isOpen,
  onRequestClose,
  walletData,
  setShowCreateModal,
  setCreateData,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  walletData: {
    chain: IChain;
    accountId: string;
    identityKey: string;
  };
  setShowCreateModal: (v: boolean) => void;
  setCreateData: (v: IWalletData) => void;
}) {
  function showCreateModal() {
    onRequestClose();
    setShowCreateModal(true);
    setCreateData({
      chain: walletData.chain,
      accountId: walletData.accountId,
      identityKey: walletData.identityKey,
    });
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
        <span className="text-[54px]">🤝</span>
        <span className="text-2xl text-b-10">Setup Cross-chain Account</span>
        <div className="text-center text-sm text-gray-40 my-7">
          You have successfully connected your wallet (
          <span className="text-black">
            {getAccountIdUi(walletData?.accountId || "")}
          </span>
          ), and you are a new user, you can click the &quot;Create Now&quot;
          button to create your Cross-chain Account
        </div>
        <div className="flex items-center gap-3 w-full">
          <Button
            className="rounded-lg border border-black bg-white text-base text-black w-full h-[46px]"
            onPress={onRequestClose}
          >
            Create Later
          </Button>
          <Button
            className="rounded-lg bg-green-10 text-base text-black w-full h-[46px]"
            onPress={showCreateModal}
          >
            Create Now
          </Button>
        </div>
      </div>
    </DefaultModal>
  );
}
