import { DefaultModal } from "@/components/common/modal";
import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react";
import { useAppSelector, useAppDispatch } from "@/hooks/lending/useRedux";
import {
  getIntentsModalResult,
  getIntentsModalStatus,
} from "@/redux/selectors/appSelectors";
import { hideIntentsModal } from "@/redux/slice/appSlice";
import { EVM_CHAINS, SOLANA_CHAIN, BTC_CHAIN } from "@/services/chainConfig";

export default function IntentsModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(getIntentsModalStatus);
  const intentResult = useAppSelector(getIntentsModalResult);
  function onRequestClose() {
    dispatch(hideIntentsModal());
  }
  function getChainIcon() {
    const chain = intentResult?.chain;
    const selectedEvmChain = intentResult?.selectedEvmChain;
    if (chain == "evm") {
      const t = EVM_CHAINS.find(
        (item) => item.label.toLowerCase() == selectedEvmChain.toLowerCase()
      );
      return t.icon;
    } else if (chain == "solana") {
      return SOLANA_CHAIN.icon;
    } else if (chain == "btc") {
      return BTC_CHAIN.icon;
    }
    return "";
  }
  if (!isOpen) return null;
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
      <div>
        {/* waitting */}
        <div
          className={`flex flex-col items-center rounded-[20px] border border-gray-30 p-8 bg-white lg:w-[438px] max-sm:w-[98vw] ${
            intentResult?.status == "pending" ? "" : "hidden"
          }`}
        >
          <div className="relative mt-5">
            <Img path={getChainIcon()} className="w-[52px] h-[52px]" />
            <div className="absolute flex flex-col justify-center items-center  w-[54px] h-[54px] rounded-full border-[3px] border-green-10 bg-b-70 top-[30px] left-[30px]">
              <Img path="waitting-icon.svg" className="animate-waiting" />
            </div>
          </div>
          <div className="text-b-10 text-2xl mt-16">Processing Transaction</div>
          <div className="text-center text-sm text-gray-90 my-4">
            This may take a few minutes,do not close this window or refresh the
            page.
          </div>
          {/* <div className="flex items-center justify-center">
            <span className="text-gray-20 tex-sm underline cursor-pointer mt-12">
              Transaction Hash
            </span>
          </div> */}
        </div>
        {/* success or error */}
        <div
          className={`flex flex-col items-center rounded-[20px] border border-gray-30 p-8 bg-white lg:w-[438px] max-sm:w-[98vw] ${
            intentResult?.status !== "pending" ? "" : "hidden"
          }`}
        >
          <div className="relative mt-5">
            <div
              className={`flex items-center justify-center w-[54px] h-[54px] rounded-full ${
                intentResult?.status == "success" ? "bg-green-10" : "bg-red-10"
              }`}
            >
              <Icon
                icon={`${
                  intentResult?.status == "success"
                    ? "material-symbols:check-rounded"
                    : "ic:round-close"
                }`}
                className="text-black text-[38px]"
              />
            </div>
          </div>
          <div className="text-b-10 text-2xl mt-5">
            {intentResult?.status == "success"
              ? "Transaction Successful!"
              : "ransaction Failed!"}
          </div>
          {/* <div className="flex items-center justify-center">
            <span className="text-gray-20 tex-sm underline cursor-pointer mt-12">
              Transaction Hash
            </span>
          </div> */}
        </div>
      </div>
    </DefaultModal>
  );
}
