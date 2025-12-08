import React, { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { Snippet } from "@heroui/react";
import { useRouter } from "next/router";
import { Icon } from "@iconify/react";
import { TokenAction } from "@/redux/slice/appSlice";
import { EVM_CHAINS, ALL_CHAINS } from "@/services/chainConfig";
import { IChain } from "@rhea-finance/cross-chain-sdk";
import { Img } from "@/components/common/img";
import useWalletConnect from "@/hooks/useWalletConnect";
import {
  useChainAccountStore,
  useChainAccountInstantStore,
} from "@/stores/chainAccount";
import { getChainsByTokenSymbol, formatEvmChainName } from "@/utils/chainsUtil";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
import { useSupplyChain, useBorrowChain } from "@/hooks/lending/hooks";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
import { FasterTag } from "./components";
import { CHAINS_FASTER } from "@/services/chainConfig";
import {
  ActiveCom,
  ConnectCom,
  UnconnectedCom,
  NotMatchedCom,
} from "@/components/lending/actionModal/componentsV2";

export default function ChainsSelector({
  token,
  action,
}: {
  token: {
    tokenId: string;
    symbol: string;
  };
  action: TokenAction;
}) {
  const [showList, setShowList] = useState<boolean>(false);
  const chainAccountInstantStore = useChainAccountInstantStore();
  const actionChainSeleced = chainAccountInstantStore.getActionChainSeleced();
  const { getChansStatus } = useChainsLendingStatus();
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const supportChains = useMemo(() => {
    return getChainsByTokenSymbol(token.symbol);
  }, [token.symbol]);

  // selected chain start
  const { supplyChain } = useSupplyChain();
  const { borrowChain } = useBorrowChain();
  const router = useRouter();
  const { chainIcon, chain, subChain } = useMemo(() => {
    let chain;
    let subChain;
    if (!_.isEmpty(actionChainSeleced)) {
      chain = actionChainSeleced.chain;
      subChain = actionChainSeleced.subChain || "";
    } else if (
      // for market
      ((action == "Supply" && supplyChain) ||
        (action == "Borrow" && borrowChain)) &&
      router.pathname == "/"
    ) {
      const marketSelectChain = action == "Supply" ? supplyChain : borrowChain;
      if (marketSelectChain == "bitcoin" || marketSelectChain == "btc") {
        chain = "btc";
        subChain = "";
      } else if (marketSelectChain == "solana") {
        chain = "solana";
        subChain = "";
      } else {
        chain = "evm";
        subChain = marketSelectChain;
      }
    } else {
      if (supportChains.evm) {
        chain = "evm";
        subChain = supportChains.evm.supplortChainsMeta[0].label;
      } else if (supportChains.solana) {
        chain = "solana";
        subChain = "";
      } else if (supportChains.btc) {
        chain = "btc";
        subChain = "";
      }
    }

    let chainIcon;
    if (subChain) {
      const target = EVM_CHAINS.find(
        (item) => item.label.toLowerCase() == subChain.toLowerCase()
      );
      chainIcon = target.icon;
    } else {
      chainIcon = ALL_CHAINS?.[chain]?.icon;
    }
    return {
      chain,
      subChain,
      chainIcon,
    };
  }, [actionChainSeleced, action, supportChains, router.pathname]);
  const {
    connected,
    accountId,
    mcaAccountId,
    accountIdUi,
    mcaAccountIdUi,
    binded,
    showChangeButton,
  } = getChansStatusForUi();

  useEffect(() => {
    if (_.isEmpty(actionChainSeleced)) {
      chainAccountInstantStore.setActionChainSeleced({
        chain,
        subChain: formatEvmChainName(subChain),
      });
    }
    if (actionChainSeleced?.chain == "evm") {
      if (evm.isSignedIn) {
        const target = EVM_CHAINS.find(
          (_item) =>
            _item.label.toLowerCase() ==
            actionChainSeleced.subChain.toLowerCase()
        );
        chainAccountStore.setSelectedEvmChain(actionChainSeleced.subChain);
        evm.setChain(target.id);
      }
    }
  }, [actionChainSeleced]);
  // selected chain end

  function getChansStatusForUi() {
    if (!_.isEmpty(actionChainSeleced)) {
      const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
      if (actionChainSeleced.chain == "evm") {
        return evmStatus;
      } else if (actionChainSeleced.chain == "solana") {
        return solanaStatus;
      } else if (actionChainSeleced.chain == "btc") {
        return btcStatus;
      }
    }
    return {
      connected: false,
      accountId: "",
      mcaAccountId: "",
      identityKey: "",
      accountIdUi: "",
      mcaAccountIdUi: "",
      binded: false,
      cannotUnbind: false,
      diff: false,
      isOtherMca: false,
      showChangeButton: false,
    };
  }

  function switchChainList() {
    setShowList(!showList);
  }
  if (_.isEmpty(supportChains || {})) return null;
  return (
    <div className="mb-4 relative">
      <div
        className="flex items-center justify-between border border-b-20 rounded-xl p-4 cursor-pointer transition-colors"
        onClick={switchChainList}
      >
        {chainIcon ? (
          <div className="flex items-center gap-3">
            <Img path={chainIcon} className="w-10" />
            <div className="flex flex-col text-sm font-medium text-b-10">
              <AccountStatus
                connected={connected}
                showChangeButton={showChangeButton}
                binded={binded}
                chain={actionChainSeleced?.chain}
              />
              <AccountMsg
                accountId={accountId}
                accountIdUi={accountIdUi}
                mcaAccountId={mcaAccountId}
                mcaAccountIdUi={mcaAccountIdUi}
              />
            </div>
          </div>
        ) : (
          <span className="text-gray-50">Please select a chain</span>
        )}

        <Icon
          icon={`${
            showList ? "iconamoon:arrow-up-2" : "iconamoon:arrow-down-2"
          }`}
          className="text-xl text-b-20"
        />
      </div>
      <div
        className={`flex flex-col absolute w-full z-[2] gap-3 border border-b-20 rounded-lg p-4 bg-white max-h-[360px] overflow-y-auto ${
          showList ? "" : "hidden"
        }`}
      >
        {Object.keys(supportChains).map((chain) => {
          const c = chain as IChain;
          return (
            <ChainTemplate
              key={chain}
              supportChains={supportChains}
              chain={c}
              action={action}
              symbol={token.symbol}
              setShowList={setShowList}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChainTemplate({
  chain,
  supportChains,
  action,
  symbol,
  setShowList,
}: {
  chain: IChain;
  supportChains: ReturnType<typeof getChainsByTokenSymbol>;
  action: TokenAction;
  symbol: string;
  setShowList: (v: boolean) => void;
}) {
  const [evmUnfold, setEvmUnfold] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { getChansStatus } = useChainsLendingStatus();
  const chainAccountInstantStore = useChainAccountInstantStore();
  const actionChainSeleced = chainAccountInstantStore.getActionChainSeleced();
  const chainData = supportChains[chain].chainMeta;
  const supplortChainsMetaEVM = supportChains?.evm?.supplortChainsMeta || [];
  const {
    connected,
    accountId,
    accountIdUi,
    binded,
    showChangeButton,
    mcaAccountId,
    mcaAccountIdUi,
  } = getChansStatusForUi();
  function showModal() {
    dispatch(showWalletModal());
  }
  function getChansStatusForUi() {
    const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
    if (chainData.id == "evm") {
      return evmStatus;
    } else if (chainData.id == "solana") {
      return solanaStatus;
    } else {
      return btcStatus;
    }
  }
  function selectChain({
    chain,
    subChain,
  }: {
    chain: IChain;
    subChain?: string;
  }) {
    const result = { chain };
    if (chain == "evm") {
      result["subChain"] = formatEvmChainName(subChain);
    }
    chainAccountInstantStore.setActionChainSeleced(result);
    setShowList(false);
  }
  function switchBoxStatus() {
    setEvmUnfold(!evmUnfold);
  }
  const chainTitelUi = (
    <div className="flex items-center gap-2.5">
      <Img path={chainData.icon} className="w-8 h-8" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-b-10 text-sm">{chainData.name}</span>
          <AccountStatus
            connected={connected}
            showChangeButton={showChangeButton}
            binded={binded}
            chain={chain}
          />
        </div>
        <AccountMsg
          accountId={accountId}
          accountIdUi={accountIdUi}
          mcaAccountId={mcaAccountId}
          mcaAccountIdUi={mcaAccountIdUi}
        />
      </div>
    </div>
  );
  return (
    <div
      className={`border border-gray-30 p-3.5 rounded-lg ${
        chainData.id == "evm" && !evmUnfold ? "pb-0" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        {/* EVM UI */}
        {chainData.id == "evm" ? (
          <div className="flex flex-col w-full">
            {/* chain title */}
            <div className="flex items-center justify-between">
              {chainTitelUi}
              <div className="flex items-center gap-2">
                <Icon
                  icon={`${
                    evmUnfold
                      ? "iconamoon:arrow-up-2-bold"
                      : "iconamoon:arrow-down-2-bold"
                  }`}
                  className="text-black/50 text-2xl cursor-pointer"
                  onClick={switchBoxStatus}
                />
              </div>
            </div>
            {/* evm chain list */}
            {chainData.id == "evm" ? (
              <div
                className={`flex flex-col mt-4 ${evmUnfold ? "hidden" : ""}`}
              >
                {supplortChainsMetaEVM.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between h-[60px] border-t border-gray-30 cursor-pointer w-full"
                      onClick={() => {
                        selectChain({ chain: "evm", subChain: item.label });
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <Img path={item.icon} className="w-[26px] h-[26px]" />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-b-10">
                            {item.label}
                          </span>
                          {CHAINS_FASTER.includes(
                            item?.label?.toLowerCase()
                          ) ? (
                            <FasterTag />
                          ) : null}
                        </div>
                      </div>
                      <Radio
                        checked={
                          actionChainSeleced?.subChain?.toLowerCase() ==
                          item.label?.toLowerCase()
                        }
                        onClick={() => {
                          selectChain({ chain: "evm", subChain: item.label });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {/* Solana or BTC UI */}
        {chainData.id !== "evm" ? (
          <div
            className="flex items-center justify-between w-full cursor-pointer"
            onClick={() => {
              selectChain({ chain: chainData.id });
            }}
          >
            {/* chain title */}
            {chainTitelUi}
            {/* radio */}
            <Radio
              checked={actionChainSeleced?.chain == chainData.id}
              onClick={() => {
                selectChain({ chain: chainData.id });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Radio({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-240 cursor-pointer"
    >
      {checked ? (
        <span className="w-3 h-3 rounded-full bg-green-10"></span>
      ) : null}
    </div>
  );
}

function AccountStatus({
  connected,
  showChangeButton,
  binded,
  chain,
}: {
  connected: boolean;
  showChangeButton: boolean;
  binded: boolean;
  chain: IChain;
}) {
  return (
    <>
      {connected ? (
        <ActiveCom />
      ) : showChangeButton ? (
        <NotMatchedCom chain={chain} />
      ) : binded ? (
        <ConnectCom />
      ) : (
        <UnconnectedCom />
      )}
    </>
  );
}

function AccountMsg({
  accountId,
  accountIdUi,
  mcaAccountId,
  mcaAccountIdUi,
}: {
  accountId: string;
  accountIdUi: string;
  mcaAccountId: string;
  mcaAccountIdUi: string;
}) {
  return (
    <>
      {accountId ? (
        <Snippet
          codeString={accountId}
          hideSymbol
          disableTooltip
          className="h-4 bg-transparent p-0 gap-0 text-xs text-gray-90"
        >
          <span className="text-xs text-gray-90">{accountIdUi}</span>
        </Snippet>
      ) : mcaAccountId ? (
        <Snippet
          codeString={mcaAccountId}
          hideSymbol
          disableTooltip
          className="h-4 bg-transparent p-0 gap-0 text-xs text-gray-90"
        >
          <span className="text-xs text-gray-90">{mcaAccountIdUi}</span>
        </Snippet>
      ) : (
        <span className="text-sm text-black">Not connected</span>
      )}
    </>
  );
}
