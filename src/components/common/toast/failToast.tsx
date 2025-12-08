import { toast } from "react-toastify";
import { CloseIcon, WalletPopupWarnIcon } from "@/components/common/Icons";
const failToast = ({
  failText,
  noAutoClose,
  toastId,
}: {
  failText: string;
  noAutoClose?: boolean;
  toastId?: string;
}) => {
  const RenderDom = (
    <div>
      <div className="flex items-center gap-1.5">
        <WalletPopupWarnIcon />
        <span className="text-white tetx-base font-bold">Error</span>
      </div>
      <div className="text-gray-60 text-sm pl-6 my-1">
        {failText || "An error occurred, please verify your wallet data."}
      </div>
    </div>
  );
  const _toastId = toastId || "failToastId";
  if (!toast.isActive(_toastId)) {
    toast(<>{RenderDom}</>, {
      autoClose: noAutoClose ? false : 5000,
      closeOnClick: true,
      hideProgressBar: false,
      closeButton: (
        <CloseIcon
          size="12"
          className="absolute top-2.5 right-3 text-dark-80 hover:text-white flex-shrink-0"
        />
      ),
      progressClassName: "bg-[#FFB018]",
      style: {
        borderRadius: "8px",
        background: "#1B242C",
        border: "1px solid rgba(151, 151, 151, 0.2)",
        padding: "10px 10px",
      },
      toastId: _toastId,
    });
  } else {
    toast.update(_toastId, {
      render: <>{RenderDom}</>,
      autoClose: noAutoClose ? false : 5000,
    });
  }
  // toast(
  //   <div>
  //     <div className="flex items-center gap-1.5">
  //       <WalletPopupWarnIcon />
  //       <span className="text-white tetx-base font-bold">Error</span>
  //     </div>
  //     <div className="text-gray-60 text-sm pl-6 mt-1">
  //       {failText || "An error occurred, please verify your wallet data."}
  //     </div>
  //   </div>,
  //   {
  //     autoClose: noAutoClose ? false : 5000,
  //     closeOnClick: true,
  //     hideProgressBar: false,
  //     closeButton: (
  //       <CloseIcon
  //         size="12"
  //         className="absolute top-2.5 right-3 text-dark-80 hover:text-white flex-shrink-0"
  //       />
  //     ),
  //     progressClassName: "bg-[#FFB018]",
  //     style: {
  //       borderRadius: "8px",
  //       background: "#1B242C",
  //       border: "1px solid rgba(151, 151, 151, 0.2)",
  //       padding: "10px 10px",
  //     },
  //   }
  // );
};
export default failToast;
