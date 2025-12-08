import Decimal from "decimal.js";
import _ from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { Snippet, Button } from "@heroui/react";
import { useDebounce } from "react-use";
import { Icon } from "@iconify/react";
import { IActionChainSeleced } from "@/interface/lending/chains";
import { EVM_CHAINS, ALL_CHAINS } from "@/services/chainConfig";
import {
  IChain,
  pollingTransactionStatus,
} from "@rhea-finance/cross-chain-sdk";
import { Img } from "@/components/common/img";
import useWalletConnect from "@/hooks/useWalletConnect";
import { useChainAccountStore } from "@/stores/chainAccount";
import { getChainsByTokenSymbol, formatEvmChainName } from "@/utils/chainsUtil";
import { useAppDispatch } from "@/hooks/lending/useRedux";
import { showWalletModal } from "@/redux/slice/appSlice";
import useChainsLendingStatus from "@/hooks/useChainsLendingStatus";
import {
  FasterTag,
  Alerts,
  Receive,
} from "@/components/lending/actionModal/components";
import { CHAINS_FASTER } from "@/services/chainConfig";
import { ConnectToChainBtn } from "@/components/common/Button";
import { withdrawFromNearWallet } from "@/services/lending/actions/withdrawFromNearWallet";
import transactionToast from "@/components/common/toast/transactionToast";
import useRelayerConfigGasFee from "@/hooks/useRelayerGasFee";
import { ISelectWithdrawToken } from "@/interface/lending/tokens";
import { intentsQuotationUi } from "@/services/lending/actions/commonAction";
import { ButtonTextWrapper } from "@/components/common/Button";
import { useFetchData } from "@/hooks/lending/useFetchData";
import { useUpdateTokenChainBalance } from "@/hooks/useChainsLendingBalance";
import {
  ActiveCom,
  ConnectCom,
  UnconnectedCom,
} from "@/components/lending/actionModal/componentsV2";

export default function InnerWithdrawChainsAction({
  selectedToken,
  onRequestClose,
}: {
  selectedToken: ISelectWithdrawToken;
  onRequestClose: () => void;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [receiveAmount, setReceiveAmount] = useState("0");
  const [intentsQuoteErrorMesssage, setIntentsQuoteErrorMesssage] =
    useState("");
  const { tokenId, icon, symbol, amountRead, amountToken } =
    selectedToken || {};
  const [showList, setShowList] = useState<boolean>(false);
  const [chainSeleced, setChainSeleced] = useState<IActionChainSeleced>();
  const { getChansStatus } = useChainsLendingStatus();
  const { relayer_near_gas_fee_amount } = useRelayerConfigGasFee();
  const { evm, solana, btc } = useWalletConnect();
  const { fetchData } = useFetchData();
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const { updateSimgleTokenChainBalance } = useUpdateTokenChainBalance();
  const supportChains = useMemo(() => {
    return getChainsByTokenSymbol(symbol);
  }, [symbol]);

  // selected chain start
  useEffect(() => {
    setChainSeleced(null);
  }, [supportChains]);

  const { chainIcon, chain, subChain } = useMemo(() => {
    let chain;
    let subChain;
    if (!_.isEmpty(chainSeleced)) {
      chain = chainSeleced.chain;
      subChain = chainSeleced.subChain || "";
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
  }, [chainSeleced]);

  useEffect(() => {
    if (_.isEmpty(chainSeleced)) {
      setChainSeleced({
        chain,
        subChain: formatEvmChainName(subChain),
      });
    }
    if (chainSeleced?.chain == "evm") {
      if (evm.isSignedIn) {
        const target = EVM_CHAINS.find(
          (_item) =>
            _item.label.toLowerCase() == chainSeleced.subChain.toLowerCase()
        );
        chainAccountStore.setSelectedEvmChain(chainSeleced.subChain);
        evm.setChain(target.id);
      }
    }
  }, [chainSeleced]);
  // selected chain end

  // clear
  useEffect(() => {
    setReceiveAmount("0");
    setLoading(false);
    setIntentsQuoteErrorMesssage("");
  }, [tokenId, chain, subChain]);

  // intents quote
  useDebounce(
    () => {
      doIntentsQuote();
    },
    500,
    [tokenId, chain, subChain]
  );

  const {
    binded,
    connected,
    accountId,
    accountIdUi,
    identityKey,
    showConnectButton,
    showBindButton,
  } = getChansStatusForUi();

  function getChansStatusForUi() {
    if (!_.isEmpty(chainSeleced)) {
      const { evmStatus, solanaStatus, btcStatus } = getChansStatus();
      if (chainSeleced.chain == "evm") {
        return evmStatus;
      } else if (chainSeleced.chain == "solana") {
        return solanaStatus;
      } else if (chainSeleced.chain == "btc") {
        return btcStatus;
      }
    }
    return {
      binded: false,
      connected: false,
      accountId: "",
      accountIdUi: "",
      showConnectButton: false,
      showBindButton: false,
      identityKey: "",
    };
  }
  async function doIntentsQuote() {
    if (symbol && chain && amountToken && mca && accountId) {
      setLoading(true);
      const quoteResult = await intentsQuotationUi({
        symbol,
        chain,
        selectedEvmChain: subChain,
        amount: amountToken,
        refundTo: mca,
        recipient: accountId,
        outChainToNearChain: false,
      });
      if (quoteResult?.quoteSuccessResult?.quote?.depositAddress) {
        setReceiveAmount(
          quoteResult?.quoteSuccessResult?.quote.amountOutFormatted
        );
      } else {
        setIntentsQuoteErrorMesssage(quoteResult?.message);
      }
      setLoading(false);
    }
  }
  function switchChainList() {
    setShowList(!showList);
  }
  if (_.isEmpty(supportChains || {})) return null;

  async function doWithdraw() {
    setLoading(true);
    const { status, message, depositAddress, tx_hash } =
      await withdrawFromNearWallet({
        mca,
        tokenId,
        symbol,
        amountToken,
        chain,
        identityKey,
        selectedEvmChain: subChain,
        outChainAccountId: accountId,
        relayerNearGasAmount: relayer_near_gas_fee_amount,
      });
    const baseData = {
      action: "withdraw" as any,
      accountId,
      token: {
        icon,
        symbol,
      },
      chain: subChain ? subChain : chain,
      amount: new Decimal(amountRead || 0).toFixed(),
      noAutoClose: true,
    };
    onRequestClose();
    if (status == "success") {
      transactionToast({
        ...baseData,
        status: "pending",
        txHash: tx_hash,
      });
      const { status: bridge_status } = await pollingTransactionStatus(
        depositAddress
      );
      transactionToast({
        ...baseData,
        status: bridge_status == "success" ? "success" : "error",
        txHash: tx_hash,
        errorMessage: bridge_status == "failed" ? "" : "",
        noAutoClose: false,
      });
    } else if (status == "error") {
      transactionToast({
        ...baseData,
        status: "error",
        errorMessage: message,
        txHash: tx_hash,
      });
    }
    setLoading(false);
    // fetch lending data
    fetchData({
      accountId: mca,
      tokenIds: [tokenId],
    });
    updateSimgleTokenChainBalance({ chain, subChain, symbol });
  }
  return (
    <div>
      {/* Chain selector */}
      <div className="mb-8 relative">
        <div
          className="flex items-center justify-between border border-b-20 rounded-xl p-3 cursor-pointer transition-colors"
          onClick={switchChainList}
        >
          {chainIcon ? (
            <div className="flex items-center gap-3">
              <Img path={chainIcon} className="w-10" />
              <div className="flex flex-col text-sm font-medium text-b-10">
                {binded && connected ? <ActiveCom /> : null}
                {binded && !connected ? <ConnectCom /> : null}
                {!binded && connected ? <UnconnectedCom /> : null}
                {accountIdUi ? (
                  <Snippet
                    codeString={accountId}
                    hideSymbol
                    disableTooltip
                    className="h-4 bg-transparent p-0 gap-0 text-xs text-gray-90"
                  >
                    <span className="text-xs text-gray-90">{accountIdUi}</span>
                  </Snippet>
                ) : (
                  "Not connected"
                )}
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
          className={`flex flex-col absolute w-full z-[1] gap-3 border border-b-20 rounded-lg p-4 bg-white max-h-[360px] overflow-y-auto ${
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
                symbol={symbol}
                setShowList={setShowList}
                chainSeleced={chainSeleced}
                setChainSeleced={setChainSeleced}
              />
            );
          })}
        </div>
      </div>

      <div className="my-2">
        <Receive value={receiveAmount} />
      </div>

      {/* Tip */}
      {intentsQuoteErrorMesssage ? (
        <div className="my-2">
          <Alerts
            data={{
              intentsError: {
                title: intentsQuoteErrorMesssage,
                severity: "warning",
              },
            }}
          />
        </div>
      ) : null}

      {/* Action Button */}
      {showConnectButton || showBindButton ? (
        <ConnectToChainBtn text={`${showBindButton ? "Connect Wallet" : ""}`} />
      ) : (
        <Button
          className="w-full bg-green-10 text-black rounded-xl h-12 text-base"
          onPress={doWithdraw}
          isDisabled={
            !!intentsQuoteErrorMesssage || Decimal(receiveAmount || 0).lte(0)
          }
        >
          <ButtonTextWrapper
            loading={loading}
            Text={() => <>Withdraw</>}
            loadingColor="#000000"
          ></ButtonTextWrapper>
        </Button>
      )}
    </div>
  );
}
function ChainTemplate({
  chain,
  supportChains,
  symbol,
  setShowList,
  chainSeleced,
  setChainSeleced,
}: {
  chain: IChain;
  supportChains: ReturnType<typeof getChainsByTokenSymbol>;
  symbol: string;
  chainSeleced: IActionChainSeleced;
  setChainSeleced: (chainSeleced: IActionChainSeleced) => void;
  setShowList: (v: boolean) => void;
}) {
  const [evmUnfold, setEvmUnfold] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { getChansStatus } = useChainsLendingStatus();
  const { evm, solana, btc } = useWalletConnect();
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const mca_wallets = chainAccountStore.getMcaWallets();
  const chainBalances = chainAccountStore.getBalances();
  const chainData = supportChains[chain].chainMeta;
  const supplortChainsMetaEVM = supportChains?.evm?.supplortChainsMeta || [];
  const { connected, accountId, accountIdUi, binded } = getChansStatusForUi();
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
    setChainSeleced(result);
    setShowList(false);
  }
  function switchBoxStatus() {
    setEvmUnfold(!evmUnfold);
  }
  // common share ui start
  const chainTitelUi = (
    <div className="flex items-center gap-2.5">
      <Img path={chainData.icon} className="w-8 h-8" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-b-10 text-sm">{chainData.name}</span>
          {binded && connected ? <ActiveCom /> : null}
          {binded && !connected ? <ConnectCom /> : null}
          {!binded && connected ? <UnconnectedCom /> : null}
        </div>
        {accountIdUi ? (
          <Snippet
            codeString={accountId}
            hideSymbol
            disableTooltip
            className="h-4 bg-transparent p-0 gap-0 text-xs text-gray-90"
          >
            <span className="text-xs text-gray-90">{accountIdUi}</span>
          </Snippet>
        ) : (
          <span className="text-xs text-gray-90">Not connected</span>
        )}
      </div>
    </div>
  );
  // common share ui end
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
                          chainSeleced?.subChain?.toLowerCase() ==
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
              checked={chainSeleced?.chain == chainData.id}
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
