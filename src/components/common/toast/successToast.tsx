import { toast } from "react-toastify";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import { CloseIcon, PopSuccessfulIcon } from "@/components/common/Icons";
const successToast = (params?: {
  successText?: string;
  txHash?: string;
  title?: string;
}) => {
  const { successText, txHash, title } = params || {};
  toast(
    <div>
      <div className="flex items-center gap-1.5">
        <PopSuccessfulIcon />
        <span className="text-white tetx-base font-bold">
          {title || "Transaction successful"}
        </span>
      </div>
      {successText ? (
        <div className="text-gray-60 text-sm pl-6 mt-1">{successText}</div>
      ) : null}
      {txHash ? (
        <span
          className="inline-flex decoration-1 hover:text-white text-base text-gray-60  mt-1 cursor-pointer underline"
          style={{
            textDecorationThickness: "1px",
            paddingLeft: "24px",
          }}
          onClick={() => {
            window.open(`${config_near.explorerUrl}/txns/${txHash}`);
          }}
        >
          Click to view
        </span>
      ) : null}
    </div>,
    {
      autoClose: 5000,
      closeOnClick: true,
      hideProgressBar: false,
      closeButton: (
        <CloseIcon
          size="12"
          className="absolute top-2.5 right-3 text-dark-80 hover:text-white flex-shrink-0"
        />
      ),
      progressClassName: "bg-[#00F7A5]",
      style: {
        borderRadius: "8px",
        background: "#1B242C",
        border: "1px solid rgba(151, 151, 151, 0.2)",
        padding: "6px 10px 8px 6px",
      },
    }
  );
};
export default successToast;
