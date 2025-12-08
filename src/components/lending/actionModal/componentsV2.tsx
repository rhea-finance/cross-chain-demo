import { DefaultToolTip } from "@/components/common/toolTip";
import { QuestionIcon } from "@/components/common/Icons";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
import { IChain } from "@rhea-finance/cross-chain-sdk";

export function ActiveCom() {
  return (
    <div className="flex items-center gap-0.5">
      <span className="flex items-center justify-center text-xs text-green-60 bg-green-10/15 px-1 h-5 rounded  w-[max-content]">
        Activated
      </span>
      <DefaultToolTip tip="Active Cross‑Chain Account Wallet">
        <QuestionIcon className="text-b-10" />
      </DefaultToolTip>
    </div>
  );
}

export function ConnectCom() {
  const { getChansStatus } = useChainsLendingStatus();
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  const arr = [];
  if (evmStatus.mcaAccountIdUi) {
    arr.push(evmStatus.mcaAccountIdUi);
  }
  if (solanaStatus.mcaAccountIdUi) {
    arr.push(solanaStatus.mcaAccountIdUi);
  }
  if (btcStatus.mcaAccountIdUi) {
    arr.push(btcStatus.mcaAccountIdUi);
  }
  const c = arr.join(", ");
  const c_display = arr.join(", ").slice(0, c.length - 2);
  return (
    <div className="flex items-center gap-0.5">
      <span className="flex items-center justify-center text-xs text-gray-90 bg-gray-210 px-1 h-5 rounded w-[max-content]">
        Connected
      </span>
      <DefaultToolTip
        tip={
          <div className="w-[220px]">
            Accounts [{c_display}] are connected. To use a different wallet,
            please disconnect it first.
          </div>
        }
      >
        <QuestionIcon className="text-b-10" />
      </DefaultToolTip>
    </div>
  );
}

export function UnconnectedCom() {
  const { getChansStatus } = useChainsLendingStatus();
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  const arr = [];
  if (evmStatus.accountIdUi && !evmStatus.binded) {
    arr.push(evmStatus.accountIdUi);
  }
  if (solanaStatus.accountIdUi && !solanaStatus.binded) {
    arr.push(solanaStatus.accountIdUi);
  }
  if (btcStatus.accountIdUi && !btcStatus.binded) {
    arr.push(btcStatus.accountIdUi);
  }
  const c = arr.join(", ");
  const c_display = arr.join(", ").slice(0, c.length - 2);
  return (
    <div className="flex items-center gap-0.5">
      <span className="flex items-center justify-center text-xs text-gray-90 bg-gray-210 px-1 h-5 rounded w-[max-content]">
        Unconnected
      </span>
      <DefaultToolTip
        tip={
          <div className="w-[220px]">
            Connect wallets [{c_display}] to a Cross-Chain Account to share
            positions and permissions.
          </div>
        }
      >
        <QuestionIcon className="text-b-10" />
      </DefaultToolTip>
    </div>
  );
}

export function NotMatchedCom({ chain }: { chain: IChain }) {
  const { getChansStatus } = useChainsLendingStatus();
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  const arr = [];
  if (evmStatus.mcaAccountIdUi) {
    arr.push(evmStatus.mcaAccountIdUi);
  }
  if (solanaStatus.mcaAccountIdUi) {
    arr.push(solanaStatus.mcaAccountIdUi);
  }
  if (btcStatus.mcaAccountIdUi) {
    arr.push(btcStatus.mcaAccountIdUi);
  }
  const c = arr.join(", ");
  const c_display = arr.join(", ").slice(0, c.length - 2);
  const chainStatus =
    chain == "evm" ? evmStatus : chain == "solana" ? solanaStatus : btcStatus;
  const accountIdUi = chainStatus.accountIdUi;
  const mcaAccountIdUi = chainStatus.mcaAccountIdUi;
  return (
    <div className="flex items-center gap-0.5">
      <span className="flex items-center justify-center text-xs text-gray-90 bg-gray-210 px-1 h-5 rounded w-[max-content]">
        Not Matched
      </span>
      <DefaultToolTip
        tip={
          <div className="w-[280px]">
            Wallet [{accountIdUi}] has not been connected with [{c_display}].
            Please switch to wallet [{mcaAccountIdUi}], or disconnect [
            {accountIdUi}] first, then connect [{mcaAccountIdUi}].
          </div>
        }
      >
        <QuestionIcon className="text-b-10" />
      </DefaultToolTip>
    </div>
  );
}
