import { toast } from "react-toastify";
import { config_near } from "@rhea-finance/cross-chain-sdk";
import { CloseIcon } from "@/components/common/Icons";
import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react/dist/iconify.js";
import { getAccountIdUi, getJumpExporeUrl } from "@/utils/chainsUtil";
import { ITransactionStatus } from "@/interface/lending";
import { beautifyNumber } from "@/utils/beautifyNumber";
import { EVM_CHAINS, SOLANA_CHAIN, BTC_CHAIN } from "@/services/chainConfig";
const transactionToast = (params?: {
  action: any;
  accountId: string;
  token: { icon: string; symbol: string };
  amount: string;
  status: ITransactionStatus;
  chain: string;
  txHash?: string;
  noAutoClose?: boolean;
  errorMessage?: string;
}) => {
  const {
    action,
    accountId,
    token,
    amount,
    status,
    errorMessage,
    noAutoClose,
    chain,
    txHash,
  } = params || {};
  function getActionUi() {
    if (action == "Supply") return "Supplied from";
    if (action == "Repay") return "Repay from";
    if (action == "Borrow") return "Borrowed to";
    if (action == "Withdraw") return "Withdraw to";
    if (action == "Adjust") return "Adjust for";
    if (action == "Repay_from_supply") return "Adjust for";
    if (action == "Swap") return "Swap from";
    return action;
  }
  function getChainIconPath() {
    if (!chain) return "";
    if (chain.toLowerCase() == "btc") {
      return BTC_CHAIN.icon;
    } else if (chain.toLowerCase() == "solana") {
      return SOLANA_CHAIN.icon;
    } else {
      const target = EVM_CHAINS.find(
        (subChain) => subChain.label.toLowerCase() == chain.toLowerCase()
      );
      return target?.icon;
    }
  }
  function jumpToExplore() {
    let jumpUrl = "";
    if (action == "Repay_from_supply" || action == "Adjust") {
      jumpUrl = getJumpExporeUrl({ chain: "near", txHash });
    } else if (
      chain?.toLowerCase() == "solana" ||
      chain?.toLowerCase() == "btc"
    ) {
      jumpUrl = getJumpExporeUrl({ chain: chain.toLowerCase() as any, txHash });
    } else {
      const target = EVM_CHAINS.find(
        (subChain) => subChain.label.toLowerCase() == chain.toLowerCase()
      );
      if (target) {
        jumpUrl = getJumpExporeUrl({
          chain: "evm",
          subChain: chain.toLowerCase(),
          txHash,
        });
      }
    }
    window.open(jumpUrl);
  }
  const actionName = getActionUi();
  const chainPath = getChainIconPath();
  const renderDom = (
    <div className="w-full cursor-default">
      {/* action */}
      <div className="flex items-center text-xs gap-1.5">
        <span className="text-gray-40">{actionName}:</span>
        <span className="text-b-10">{getAccountIdUi(accountId || "")}</span>
        <Img path={chainPath} className="w-4 h-4 rounded-full" />
      </div>
      <div className="flex items-center justify-between w-full my-2">
        {/* action amount */}
        <div className="flex items-center gap-1.5">
          <img src={token?.icon} className="w-6 h-6 rounded-full" alt="" />
          <span className="text-black text-sm">
            {beautifyNumber({
              num: amount || "0",
              className: "text-black text-sm",
            })}{" "}
            {token?.symbol}
          </span>
        </div>
        {/* action status */}
        <div className="flex items-center gap-1.5">
          <StatusUi status={status} />
        </div>
      </div>
      {/* Tx hash */}
      <div
        className={`flex items-center text-xs ${
          errorMessage ? "justify-between" : "justify-center"
        }`}
      >
        {errorMessage ? (
          <span className="text-red-70 max-w-[200px] overflow-hidden whitespace-nowrap text-ellipsis">
            {errorMessage}
          </span>
        ) : null}
        {txHash ? (
          <div
            className="flex items-center gap-1 text-gray-90 cursor-pointer"
            onClick={jumpToExplore}
          >
            <span className="text-xs text-gray-90 underline">Tx Hash</span>
            <Icon icon="icon-park-outline:arrow-right-up" />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!toast.isActive("transactionStatusId")) {
    toast(renderDom, {
      autoClose: noAutoClose ? false : 5000,
      closeOnClick: false,
      hideProgressBar: false,
      closeButton: (
        <CloseIcon
          size="12"
          className="absolute top-2.5 right-3 text-dark-80 flex-shrink-0 cursor-pointer"
          onClick={() => {
            toast.dismiss();
          }}
        />
      ),
      progressClassName: "bg-[#00F7A5]",
      style: {
        borderRadius: "8px",
        // background: "#1B242C",
        background: "#ffffff",
        border: "1px solid rgba(151, 151, 151, 0.2)",
        padding: "14px",
      },
      toastId: "transactionStatusId",
    });
  } else {
    toast.update("transactionStatusId", {
      render: <>{renderDom}</>,
      autoClose: noAutoClose ? false : 5000,
    });
  }
};

function StatusUi({ status }: { status: ITransactionStatus }) {
  if (status == "success") {
    return (
      <div className="flex items-center gap-1 h-6 rounded-3xl p-[3px] pr-2 bg-green-10/20">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-10">
          <Icon
            icon="material-symbols:check-rounded"
            className="text-black text-xs"
          />
        </span>
        <span className="text-[13px] text-black">Successful</span>
      </div>
    );
  } else if (status == "pending") {
    return (
      <div className="flex items-center gap-1 h-6 rounded-3xl p-[3px] pr-2 bg-gray-80">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-250">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="animate-waiting"
          >
            <circle cx="8" cy="8" r="8" fill="#DBDCDE" />
            <path
              d="M11.6658 4C11.8495 4 11.9987 4.148 12 4.33199C12.0011 4.5142 11.8544 4.66292 11.6725 4.66399H11.0001V5.57601C11.0001 6.63666 10.3343 7.54403 9.36893 8C10.3343 8.45132 11.0001 9.36334 11.0001 10.424V11.336H11.6659C11.849 11.336 11.9974 11.4846 11.9974 11.668C11.9974 11.8514 11.849 12 11.6659 12H4.34084L4.2809 11.9946C4.10028 11.967 3.9762 11.7979 4.00385 11.617C4.02919 11.4511 4.17458 11.3303 4.34218 11.3359H5.01331V10.4241C5.01331 9.36343 5.67845 8.45606 6.64447 8.00009C5.67845 7.54877 5.01331 6.63675 5.01331 5.5761V4.66399H4.34218C4.15906 4.66399 4.01063 4.51536 4.01063 4.33199C4.01063 4.14862 4.15906 4 4.34218 4H11.6658ZM10.3341 4.66399H5.67703V5.57136C5.67703 6.36138 6.1744 7.08807 6.93998 7.45338C7.17172 7.57538 7.30417 7.78805 7.30417 8.00009C7.31086 8.24125 7.16485 8.46034 6.93998 8.5468C6.17903 8.91211 5.67703 9.6388 5.67765 10.4288V11.3449H6.04845V10.9582C6.04845 10.2448 6.31078 9.46284 7.12435 8.9875L7.25752 8.91479C7.56115 8.78349 7.8101 8.50545 8.00384 8.08146C8.15699 8.4741 8.41665 8.75214 8.78415 8.91479C9.7828 9.43149 9.94059 10.2081 9.94059 10.9581V11.3448H10.334V10.4334C10.334 9.64335 9.83739 8.91667 9.07172 8.55064C8.84007 8.42864 8.70752 8.2166 8.70752 8.00393C8.70752 7.76063 8.83998 7.54859 9.07172 7.45793C9.83267 7.09325 10.334 6.36656 10.334 5.57592L10.3341 4.66399ZM9.89699 5.3896C9.9988 6.17868 9.33887 6.91872 8.84221 7.12469C8.54527 7.24804 8.26564 7.47999 8.00402 7.82074C7.75632 7.48008 7.48471 7.24803 7.19107 7.12478C6.66043 6.90211 6.42562 6.62459 6.27758 6.26604L9.89699 5.3896Z"
              fill="black"
            />
          </svg>
        </span>
        <span className="text-[13px] text-black">Processing...</span>
      </div>
    );
  } else if (status == "error") {
    return (
      <div className="flex items-center gap-1 h-6 rounded-3xl p-[3px] pr-2 bg-red-70/20">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-70">
          <Icon icon="iconamoon:close-bold" className="text-white text-xs" />
        </span>
        <span className="text-[13px] text-black">Failed</span>
      </div>
    );
  }
  return;
}
export default transactionToast;
