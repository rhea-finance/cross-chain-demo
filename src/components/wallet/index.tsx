import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { Icon } from "@iconify/react";
import { DefaultModal } from "@/components/common/modal";
import { Img } from "@/components/common/img";
import useWalletConnect from "@/hooks/useWalletConnect";
import SetUpModal from "./setUpModal";
import BindModal from "./bindModal";
import UnbindModal from "./unbindModal";
import CreateModal from "./createModal";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import {
  IBindData,
  IUnBindData,
  IWalletData,
} from "@/interface/lending/chains";
import { wait } from "@/utils/chainsUtil";
import { useChainAccountStore } from "@/stores/chainAccount";
import { EVM_CHAINS } from "@/services/chainConfig";
import { DefaultToolTip } from "@/components/toolTip";
import { IChainData } from "@/interface/lending/chains";
import { getWalletModalStatus } from "@/redux/selectors/appSelectors";
import { useAppDispatch, useAppSelector } from "@/hooks/lending/useRedux";
import { hideWalletModal } from "@/redux/slice/appSlice";
import { ALL_CHAINS } from "@/services/chainConfig";
import { getTotalAccountBalance } from "@/redux/selectors/accountSelectors";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
import { FasterTag } from "@/components/lending/actionModal/components";
import { CHAINS_FASTER } from "@/services/chainConfig";
import CopyText from "@/components/common/CopyText";
import { useChainsLendingLoginOut } from "@/hooks/useChainsLendingLoginOut";
import { useChainsLendingLoginIn } from "@/hooks/useChainsLendingLoginIn";
import {
  ActiveCom,
  ConnectCom,
} from "@/components/lending/actionModal/componentsV2";
const tip_1 =
  "The account does not match the bound account, please reconnect to a valid account";
const tip_2 =
  "This account has been bound to a cross-chain account. please reconnect to a valid account";
export default function WalletModal() {
  const [showSetModal, setShowSetModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tipWalletData, setTipWalletData] = useState<IWalletData>();
  const [showBindModal, setShowBindModal] = useState<boolean>(false);
  const [showUnBindModal, setShowUnBindModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showMutiDetail, setShowMutiDetail] = useState<boolean>(false);
  const [createData, setCreateData] = useState<IWalletData>();
  const [bindData, setBindData] = useState<IBindData>();
  const [unBindData, setUnBindData] = useState<IUnBindData>();
  const { evm, solana, btc } = useWalletConnect();
  const { getChansStatus } = useChainsLendingStatus();
  const dispatch = useAppDispatch();
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const mcaWallets = chainAccountStore.getMcaWallets();
  const isOpen = useAppSelector(getWalletModalStatus);
  const totalNearMca = useAppSelector(getTotalAccountBalance);
  const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
  // add test log TODOXXX
  useEffect(() => {
    if (mca) {
      console.log(`*******mca:${mca}**near:${totalNearMca}*****************`);
    }
  }, [mca]);

  // for login in logic
  useChainsLendingLoginIn({ setLoading, setShowSetModal, setTipWalletData });

  // for login out logic
  useChainsLendingLoginOut();

  const { activeIcons, inActiveIcons } = useMemo(() => {
    const activeIcons = [];
    const inActiveIcons = [];
    mcaWallets.forEach((item) => {
      const [key] = Object.entries(item)[0];
      if (key == "EVM") {
        if (evmStatus.connected) {
          activeIcons.push("ethereum-chain-icon.svg");
        } else {
          inActiveIcons.push("ethereum-chain-icon.svg");
        }
      } else if (key == "Solana") {
        if (solanaStatus.connected) {
          activeIcons.push("solana-chain-icon.svg");
        } else {
          inActiveIcons.push("solana-chain-icon.svg");
        }
      } else if (key == "Bitcoin") {
        if (btcStatus.connected) {
          activeIcons.push("btc-chain-icon.svg");
        } else {
          inActiveIcons.push("btc-chain-icon.svg");
        }
      }
    });
    return {
      activeIcons,
      inActiveIcons,
    };
  }, [mcaWallets, evmStatus, solanaStatus, btcStatus]);

  function switchMuti() {
    setShowMutiDetail((pre) => !pre);
  }
  function closeSetUpModal() {
    setShowSetModal(false);
  }
  function openBindModal(chain: IChain) {
    const signerWallet = getSingerWallet(chain);
    const { identityKey, accountId } = getIdentityKeyByChain(chain);
    setBindData({
      signerWallet,
      newWallet: {
        chain,
        identityKey,
        accountId,
      },
    });
    setShowBindModal(true);
  }
  function openUnBindModal(
    chain: IChain,
    unBindAccount?: { accountId: string; identityKey: string }
  ) {
    const signerWallet = getSingerWallet(chain);
    const { identityKey, accountId } = getIdentityKeyByChain(chain);
    setUnBindData({
      signerWallet,
      deleteWallet: {
        chain,
        identityKey: identityKey || unBindAccount?.identityKey,
        accountId: accountId || unBindAccount?.accountId,
      },
    });
    setShowUnBindModal(true);
  }
  function openCreateModal(chain: IChain) {
    const { identityKey, accountId } = getIdentityKeyByChain(chain);
    setCreateData({
      chain,
      accountId,
      identityKey,
    });
    setShowCreateModal(true);
  }
  function closeUnBindModal() {
    setShowUnBindModal(false);
  }
  function closeBindModal() {
    setShowBindModal(false);
  }
  function closeCreateModal() {
    setShowCreateModal(false);
  }
  function getIdentityKeyByChain(chain: IChain) {
    if (chain == "evm") {
      return {
        identityKey: evm.accountId,
        accountId: evm.accountId,
      };
    } else if (chain == "solana") {
      return {
        identityKey: solana.accountId,
        accountId: solana.accountId,
      };
    } else if (chain == "btc") {
      return {
        identityKey: btc.publicKey,
        accountId: btc.accountId,
      };
    }
    return {};
  }
  function getSingerWallet(addOrDeleteChain?: IChain): {
    chain: IChain;
    identityKey: string;
  } {
    for (const item of mcaWallets) {
      const [key, value]: any = Object.entries(item)[0];
      if (key === "EVM" && evm.isSignedIn && addOrDeleteChain !== "evm") {
        return {
          chain: "evm",
          identityKey: "0x" + value,
        };
      } else if (
        key == "Solana" &&
        solana.isSignedIn &&
        addOrDeleteChain !== "solana"
      ) {
        return {
          chain: "solana",
          identityKey: value,
        };
      } else if (
        key == "Bitcoin" &&
        btc.isSignedIn &&
        addOrDeleteChain !== "btc"
      ) {
        return {
          chain: "btc",
          identityKey: value,
        };
      }
    }
  }
  function onRequestClose() {
    dispatch(hideWalletModal());
  }
  return (
    <DefaultModal
      onRequestClose={onRequestClose}
      isOpen={isOpen}
      style={{
        overlay: {
          zIndex: 9,
        },
      }}
    >
      <div className="relative rounded-[20px]">
        <div
          className={`rounded-[20px] border border-gray-30 p-6 bg-white lg:w-[438px] max-sm:w-[98vw] max-h-[60vh] ${
            loading ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {/* Title */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <span className="text-2xl text-b-10 paceGrotesk-Bold">
              Connect Wallets
            </span>
          </div>
          {/* Multchain account */}
          {mca ? (
            <div className="border-2 border-green-10 rounded-xl bg-green-10/15  mt-[34px] p-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-[34px] h-[34px] rounded-xl bg-black">
                    <Img path="rhea-inner-icon.svg" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xl text-b-10">
                      Cross-chain Account
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center justify-center w-[22px] h-[22px] rounded border border-black/10 cursor-pointer"
                  onClick={switchMuti}
                >
                  <Icon
                    icon={`${
                      showMutiDetail
                        ? "iconamoon:arrow-up-2"
                        : "iconamoon:arrow-down-2"
                    }`}
                    className="text-black text-xl"
                  />
                </div>
              </div>
              <div
                className={`flex items-center justify-between h-[38px] rounded-lg bg-green-40/15 mt-2.5 p-2 ${
                  showMutiDetail ? "" : "hidden"
                }`}
              >
                {/* active chains */}
                <div className="flex items-center gap-1.5">
                  {activeIcons?.map((icon) => {
                    return <Img path={icon} key={icon} className="w-6 h-6" />;
                  })}
                </div>
                {/* inactive chains*/}
                <div className="flex items-center gap-1.5 grayscale">
                  {inActiveIcons?.map((icon) => {
                    return <Img path={icon} key={icon} className="w-6 h-6" />;
                  })}
                </div>
              </div>
              <div className="text-xs text-black mt-3.5">
                One Account, All Chains — manage your lending seamlessly.
              </div>
              <span
                className="inline-flex items-center cursor-pointer text-gray-90 text-xs mt-2"
                onClick={() =>
                  window.open(
                    "https://guide.rhea.finance/docs/rhea-finance-cross-chain-lending-litepaper",
                    "_blank"
                  )
                }
              >
                Learn More{" "}
                <Icon
                  icon="radix-icons:arrow-top-right"
                  className="text-gray-90 text-base"
                />
              </span>
            </div>
          ) : (
            <div className="text-xs text-gray-130 text-center mt-4 mb-6">
              One Account, All Chains — manage your lending seamlessly.
            </div>
          )}

          {/* wallets list */}
          <div className="flex flex-col gap-3 mt-4">
            {Object.values(ALL_CHAINS).map((chain) => {
              return (
                <ChainTemplate
                  key={chain.id}
                  data={chain}
                  openBindModal={openBindModal}
                  openUnBindModal={openUnBindModal}
                  openCreateModal={openCreateModal}
                />
              );
            })}
          </div>
          <div className="text-center text-xs text-gray-130  w-2/3 mx-auto mt-4">
            If you had a Cross-Chain Account before, please connect the wallet
            you used to link with it..
          </div>
        </div>
        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center absolute left-0 right-0 top-0 bottom-0 h-full rounded-[20px] bg-black/40 z-10">
            <Icon icon="svg-spinners:gooey-balls-1" className="text-[80px]" />
          </div>
        ) : null}
      </div>
      {/* create muti account tip */}
      <SetUpModal
        isOpen={showSetModal}
        onRequestClose={closeSetUpModal}
        walletData={tipWalletData}
        setShowCreateModal={setShowCreateModal}
        setCreateData={setCreateData}
      />
      {/* create muti account */}
      <CreateModal
        isOpen={showCreateModal}
        onRequestClose={closeCreateModal}
        createData={createData}
      />
      {/* bind muti account for chain */}
      <BindModal
        isOpen={showBindModal}
        onRequestClose={closeBindModal}
        bindData={bindData}
      />
      {/* unBind muti account for chain */}
      <UnbindModal
        isOpen={showUnBindModal}
        onRequestClose={closeUnBindModal}
        unBindData={unBindData}
      />
    </DefaultModal>
  );
}

function ChainTemplate({
  data,
  openBindModal,
  openUnBindModal,
  openCreateModal,
}: {
  data: IChainData;
  openBindModal: (chain: IChain) => void;
  openUnBindModal: (chain: IChain, { accountId, identityKey }: any) => void;
  openCreateModal: (chain: IChain) => void;
}) {
  const [evmUnfold, setEvmUnfold] = useState<boolean>(false);
  const [hoverOn, setHoverOn] = useState<boolean>(false);
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const selectedEvmChain = chainAccountStore.getSelectedEvmChain();
  const mca = chainAccountStore.getMca();
  const { getChansStatus } = useChainsLendingStatus();
  const {
    connected,
    accountId,
    mcaAccountId,
    identityKey,
    accountIdUi,
    mcaAccountIdUi,
    binded,
    cannotUnbind,
    diff,
    isOtherMca,
  } = getChansStatusForUi();
  // switch chain
  useEffect(() => {
    if (data.id == "evm" && evm?.accountId && selectedEvmChain) {
      const target = EVM_CHAINS.find(
        (item) => item.label.toLowerCase() == selectedEvmChain.toLowerCase()
      );
      if (target) {
        evm.setChain(target.id);
      } else {
        console.error(
          `switch to ${selectedEvmChain}------ evm ------- chain ------ error1`
        );
      }
    }
  }, [data.id, evm?.accountId, selectedEvmChain]);
  useEffect(() => {
    if (evm.connectedChainData?.label) {
      evm.setChain(evm.connectedChainData.id);
      chainAccountStore.setSelectedEvmChain(evm.connectedChainData.label);
    }
  }, [evm.connectedChainData?.id]);
  function getChansStatusForUi() {
    const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
    if (data.id == "evm") {
      return evmStatus;
    } else if (data.id == "solana") {
      return solanaStatus;
    } else {
      return btcStatus;
    }
  }
  function login() {
    if (data.id == "evm") {
      evm.open();
    } else if (data.id == "btc") {
      btc.open();
    } else if (data.id == "solana") {
      solana.open();
    }
  }
  function evmLogin(name: string) {
    chainAccountStore.setSelectedEvmChain(name);
    if (evm.isSignedIn) {
      const target = EVM_CHAINS.find(
        (item) => item.label.toLowerCase() == name.toLowerCase()
      );
      if (target) {
        evm.setChain(target.id);
      } else {
        console.error(
          `switch to ${selectedEvmChain}------ evm ------- chain ------ error2`
        );
      }
    } else {
      evm.open();
    }
  }
  async function loginOut() {
    if (data.id == "evm") {
      await evm.disconnect();
    } else if (data.id == "btc") {
      await btc.disconnect();
    } else if (data.id == "solana") {
      await solana.disconnect();
    }
  }
  async function change() {
    await loginOut();
    wait(500);
    login();
  }
  function bindMutiAccount() {
    openBindModal(data.id);
  }
  function unBindMutiAccount() {
    openUnBindModal(data.id, { accountId, identityKey });
  }
  function createMutiAccount() {
    openCreateModal(data.id);
  }
  function switchBoxStatus() {
    setEvmUnfold(!evmUnfold);
  }
  return (
    <div
      className={`border border-gray-30 bg-while rounded-2xl pl-5 pr-2.5 ${
        connected ? "bg-w-10" : ""
      }`}
    >
      <div className="flex items-center justify-between min-h-[72px] py-4">
        {/* account status */}
        <div className="flex items-start gap-2">
          {/* chain */}
          <div className="flex items-center gap-2">
            {/* checkbox */}
            {connected ? (
              // login && binded
              <DefaultToolTip
                tip={`${
                  cannotUnbind
                    ? "The only bounded or connected account cannot be unbound"
                    : "Unbind account"
                }`}
                place="top-end"
              >
                <div
                  className={`flex items-center justify-center w-[22px] h-[22px] rounded border border-gray-30 ${
                    cannotUnbind ? "cursor-not-allowed" : "cursor-pointer"
                  } ${hoverOn ? "bg-gray-150" : "bg-green-10"}`}
                  onMouseEnter={() => {
                    setHoverOn(true);
                  }}
                  onMouseLeave={() => {
                    setHoverOn(false);
                  }}
                  onClick={() => {
                    if (!cannotUnbind) {
                      unBindMutiAccount();
                    }
                  }}
                >
                  {hoverOn ? (
                    <Img path="disconnected-8-icon.svg" />
                  ) : (
                    <Img path="connected-8-icon.svg" />
                  )}
                </div>
              </DefaultToolTip>
            ) : diff || isOtherMca ? (
              // login && not matched
              <DefaultToolTip tip="Please change your wallet" place="top-end">
                <div className="w-[22px] h-[22px] rounded border border-gray-30 bg-w-20 cursor-not-allowed flex-shrink-0" />
              </DefaultToolTip>
            ) : accountId ? (
              // login (bind or create)
              <DefaultToolTip
                tip={`${
                  mca
                    ? "Bind the account to the cross-chain account"
                    : "Create cross-chain account"
                }`}
                place="top-end"
              >
                <div
                  className="w-[22px] h-[22px] rounded border border-gray-30 bg-while-20 cursor-pointer"
                  onClick={() => {
                    if (mca) {
                      bindMutiAccount();
                    } else {
                      createMutiAccount();
                    }
                  }}
                />
              </DefaultToolTip>
            ) : !accountId && binded ? (
              // unLogin and binded
              cannotUnbind ? (
                <DefaultToolTip
                  tip="Please connect your wallet first"
                  place="top-end"
                >
                  <div className="w-[22px] h-[22px] rounded border border-gray-30 bg-while-20 cursor-not-allowed bg-gray-150">
                    <Img path="connected-8-icon.svg" />
                  </div>
                </DefaultToolTip>
              ) : (
                <DefaultToolTip tip="Unbind account" place="top-end">
                  <div
                    className={`flex items-center justify-center w-[22px] h-[22px] rounded border border-gray-30 bg-gray-150 cursor-pointer`}
                    onMouseEnter={() => {
                      setHoverOn(true);
                    }}
                    onMouseLeave={() => {
                      setHoverOn(false);
                    }}
                    onClick={() => {
                      unBindMutiAccount();
                    }}
                  >
                    {hoverOn ? (
                      <Img path="disconnected-8-icon.svg" />
                    ) : (
                      <Img path="connected-8-icon.svg" />
                    )}
                  </div>
                </DefaultToolTip>
              )
            ) : !accountId ? (
              <DefaultToolTip
                tip="Please connect your wallet first"
                place="top-end"
              >
                <div className="w-[22px] h-[22px] rounded border border-gray-30 bg-w-20 cursor-not-allowed flex-shrink-0" />
              </DefaultToolTip>
            ) : null}

            {/* chain Icon */}
            <Img path={data.icon} className="flex-shrink-0" />
          </div>
          {/* chain Account */}
          <div className="flex flex-col relative -top-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-b-10 text-sm">{data.name}</span>
              {connected ? <ActiveCom /> : null}
              {!connected && binded && !diff ? <ConnectCom /> : null}
            </div>
            <div className="">
              {accountIdUi ? (
                <div className="flex items-center gap-1">
                  <CopyText text={accountId}>
                    <span
                      className={`text-xs underline ${
                        isOtherMca ? "text-red-100" : "text-gray-90"
                      }`}
                    >
                      {accountIdUi}
                    </span>
                  </CopyText>
                  {diff || isOtherMca ? (
                    <DefaultToolTip
                      tip={
                        <div className="w-[150px] text-xs cursor-pointer">
                          {isOtherMca ? tip_2 : tip_1}
                        </div>
                      }
                    >
                      <Icon
                        icon="material-symbols:error-rounded"
                        className="text-red-90 text-sm"
                      />
                    </DefaultToolTip>
                  ) : null}
                </div>
              ) : null}
              {mcaAccountIdUi && mcaAccountIdUi !== accountIdUi ? (
                <div className="flex items-center gap-1">
                  <CopyText text={mcaAccountId}>
                    <span className="text-xs text-gray-90 underline">
                      {mcaAccountIdUi}
                    </span>
                  </CopyText>
                  {diff ? <ConnectCom /> : null}
                </div>
              ) : null}
              {!accountId && !mcaAccountId ? (
                <span className="text-xs text-gray-90">Not connected</span>
              ) : null}
            </div>
          </div>
        </div>
        {/* action */}
        <div
          className={`flex items-center gap-1 ${
            data.id !== "evm" ? "pr-7" : ""
          }`}
        >
          {diff || isOtherMca ? (
            <div className="flex items-center gap-1.5">
              <span className="w-[8px] h-[8px] rounded-full bg-green-30"></span>
              <span
                className=" cursor-pointer underline text-sm text-black"
                onClick={change}
              >
                Change
              </span>
            </div>
          ) : accountId ? (
            <div className="flex items-center gap-1.5">
              <span className="w-[8px] h-[8px] rounded-full bg-green-30"></span>
              <span
                className=" cursor-pointer underline text-sm text-black"
                onClick={loginOut}
              >
                Disconnect
              </span>
            </div>
          ) : (
            <span
              className=" cursor-pointer underline text-sm text-black"
              onClick={login}
            >
              Connect
            </span>
          )}
          {data.id == "evm" ? (
            <Icon
              icon={`${
                evmUnfold
                  ? "iconamoon:arrow-up-2-bold"
                  : "iconamoon:arrow-down-2-bold"
              }`}
              className="text-black/50 text-2xl cursor-pointer"
              onClick={switchBoxStatus}
            />
          ) : null}
        </div>
      </div>
      <div className={`pr-3 ${evmUnfold ? "" : "hidden"}`}>
        {EVM_CHAINS.map((item) => {
          const connected =
            _.toLower(selectedEvmChain || "") == _.toLower(item.label) &&
            evm.isSignedIn;

          return (
            <div
              key={item.id}
              onClick={() => {
                evmLogin(item.label);
              }}
              className="flex items-center justify-between h-[66px] border-t border-gray-30 cursor-pointer w-full pl-7"
            >
              <div className="flex items-center gap-4">
                <Img path={item.icon} className="w-[26px] h-[26px]" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-b-10">{item.label}</span>
                  {CHAINS_FASTER.includes(item?.label?.toLowerCase()) ? (
                    <FasterTag />
                  ) : null}
                </div>
              </div>
              {connected ? (
                <span className="text-xs text-black/50">Connected</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
