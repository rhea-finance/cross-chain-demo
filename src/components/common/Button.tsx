import { BeatLoader } from "react-spinners";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
export function ButtonTextWrapper({
  Text,
  loading,
  loadingColor,
}: {
  Text: () => React.ReactNode;
  loading: boolean;
  loadingColor?: string;
}) {
  return (
    <>
      {loading ? (
        <BeatLoader size={5} color={loadingColor || "#ffffff"} />
      ) : (
        <Text />
      )}
    </>
  );
}
export function ConnectToChainBtn({ text }: { text?: string }) {
  const dispatch = useAppDispatch();
  function handleConnect() {
    dispatch(showWalletModal());
  }
  return (
    <button
      onClick={handleConnect}
      className="w-full py-3 bg-b-10 text-white rounded-xl font-medium transition-colors"
    >
      {text || "Connect Wallet"}
    </button>
  );
}
