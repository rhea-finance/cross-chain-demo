import Decimal from "decimal.js";
import { ethers } from "ethers";
import _ from "lodash";
import { init } from "@web3-onboard/react";
import injectedModule, { ProviderLabel } from "@web3-onboard/injected-wallets";
import binanceModule from "@binance/w3w-blocknative-connector";
import walletConnectModule from "@web3-onboard/walletconnect";
import ledgerModule from "@web3-onboard/ledger";
import {
  config_evm,
  IIntentItem,
  prepare_sign_message_evm,
  process_signature_evm,
} from "@rhea-finance/cross-chain-sdk";
import { expandToken } from "@/utils/numbers";
import { formatAmount } from "@/utils/chainsUtil";
import { IChainTokenMetadata } from "@/interface/lending/tokens";
import erc20Abi from "@/services/abi/erc20.json";
import batchQueryErc20Abi from "@/services/abi/batchQueryErc20.json";
import { CONTRACT_BATCH_QUERY_MAP } from "@/services/chainConfigV2";
const APP_HOST = "https://app.rhea.finance"; // TODOXXX

const WALLET_CONNECT_OPTION: Parameters<
  typeof walletConnectModule | typeof ledgerModule
>[number] = {
  projectId: "669d1b9f59163a92d90a3c1ff78a7326",
  requiredChains: [
    config_evm.chains.ethereum.chainId,
    config_evm.chains.arbitrum.chainId,
  ],
  dappUrl: APP_HOST,
};
// wallet init
export function setupWeb3Onboard() {
  const injected = injectedModule({
    displayUnavailable: [
      ProviderLabel.OKXWallet,
      ProviderLabel.MathWallet,
      ProviderLabel.Coinbase,
      ProviderLabel.Trust,
      ProviderLabel.Bitget,
    ],
    filter: {
      [ProviderLabel.Binance]: false,
      "Binance Wallet": false,
    },
    sort: (wallets) => {
      const [okx, ...rest] = wallets.sort((a, b) => {
        if (a.label === ProviderLabel.OKXWallet) return -1;
        if (b.label === ProviderLabel.OKXWallet) return 1;
        return 0;
      });

      return [okx, ...rest];
    },
  });
  const binance = binanceModule({ options: { lng: "en" } });
  const walletConnect = walletConnectModule(WALLET_CONNECT_OPTION);
  const ledger = ledgerModule({
    ...WALLET_CONNECT_OPTION,
    walletConnectVersion: 2,
  });

  const chains = Object.values(config_evm.chains).map(
    ({ id, token, label, rpcUrl }) => ({ id, token, label, rpcUrl })
  );

  return init({
    wallets: [binance, injected, walletConnect, ledger],
    chains,
    theme: "dark",
    appMetadata: {
      name: "Rhea Finance",
      icon: `https://img.rhea.finance/images/airdrop-thumb-rhea.svg`,
      description: "Where your DeFi journey on NEAR starts",
      explore: APP_HOST,
    },
    accountCenter: { desktop: { enabled: false }, mobile: { enabled: false } },
    connect: {
      /**
       * If set to true, the most recently connected wallet will store in
       * local storage. Then on init, onboard will try to reconnect to
       * that wallet with no modals displayed
       */
      autoConnectLastWallet: true,
    },
  });
}

function getEvmJSONProvider(chain: string) {
  const rpc = config_evm.chains[chain.toLowerCase()].rpcUrl;
  return new ethers.providers.JsonRpcProvider(rpc);
}
async function getEvmContract({
  address,
  contractInterface,
  type,
  chain,
}: {
  address: string;
  contractInterface: ethers.ContractInterface;
  type?: "view" | "call";
  chain?: string;
}) {
  if (type == "call") {
    const signer = await window.ethWeb3Provider?.getSigner();
    return new ethers.Contract(address, contractInterface, signer);
  } else {
    const provider = getEvmJSONProvider(chain || "Ethereum");
    return new ethers.Contract(address, contractInterface, provider);
  }
}
// transfer
export async function transfer_evm({
  tokenAddress,
  depositAddress,
  chain,
  amount,
}: {
  tokenAddress: string;
  depositAddress: string;
  amount: string;
  chain?: string;
}) {
  if (tokenAddress) {
    const tokenContract = await getEvmContract({
      address: tokenAddress,
      contractInterface: erc20Abi,
      type: "call",
      chain,
    });
    const transaction = await tokenContract.transfer(depositAddress, amount);
    const receipt = await transaction.wait();
    return receipt.transactionHash;
  } else {
    // native token
    const signer = await window.ethWeb3Provider?.getSigner();
    const res = await signer.sendTransaction({
      to: depositAddress,
      value: ethers.BigNumber.from(amount),
    });
    await res.wait();
    return res.hash;
  }
}
// sign
export async function sign_message_evm(message: string) {
  const _message = prepare_sign_message_evm(message);
  const signer = await window.ethWeb3Provider?.getSigner();
  const signature = await signer.signMessage(_message);
  const result = process_signature_evm(signature);
  return result;
}
// get balance
export async function get_balance_evm({
  userAddress,
  chain,
  token,
}: {
  userAddress: string;
  chain: string;
  token: IChainTokenMetadata;
}) {
  try {
    let balance = "0";
    const rpcUrl = config_evm.chains[chain.toLowerCase()].rpcUrl;
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (!token.address) {
      // native token
      const _balance = await provider.getBalance(userAddress);
      balance = ethers.utils.formatEther(_balance);
    } else {
      const contract = new ethers.Contract(token.address, erc20Abi, provider);
      const _balance = await contract.balanceOf(userAddress);
      balance = ethers.utils.formatUnits(_balance, token.decimals);
    }
    return balance;
  } catch (error) {
    console.error(
      `----------${chain}-${token.symbol}-provider-balance-error`,
      error
    );
    return "0";
  }
}

export async function get_balance_evm_signer({
  chain,
  token,
}: {
  chain: string;
  token: IChainTokenMetadata;
}) {
  try {
    let balance = "0";
    if (!window.ethProvider) return balance;
    const [sender] = await window.ethProvider?.request({
      method: "eth_requestAccounts",
    });
    if (token.symbol == "ETH") {
      balance = (await window.ethWeb3Provider?.getBalance(sender)).toString();
    } else {
      const Interface = new ethers.utils.Interface(erc20Abi);
      const data = Interface.encodeFunctionData("balanceOf", [sender]);
      const rpc = config_evm.chains[chain.toLowerCase()].rpcUrl;
      const targetProvider = new ethers.providers.JsonRpcProvider(rpc);
      const rawBalance = await targetProvider?.call({
        to: token.address,
        data,
      });
      balance = Interface.decodeFunctionResult("balanceOf", rawBalance)[0];
    }
    const formattedBalance = formatAmount(balance, token.decimals);
    return formattedBalance;
  } catch (error) {
    console.error(`----------${chain}-${token.symbol}-balance-error`, error);
    return "0";
  }
}

export async function get_batch_balances_evm({
  chain,
  userAddress,
  tokens,
}: {
  chain: string;
  userAddress;
  tokens: IIntentItem[];
}): Promise<Record<string, IIntentItem>> {
  let map = {};
  try {
    const rpcUrl = config_evm.chains[chain].rpcUrl;
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const batchContractAddress = CONTRACT_BATCH_QUERY_MAP[chain];
    const [normalTokens, nativeToken] = tokens.reduce(
      (acc, cur) => {
        if (!cur.contractAddress) {
          // native token
          acc[1] = cur;
        } else {
          acc[0].push(cur);
        }
        return acc;
      },
      [[], {}] as [IIntentItem[], IIntentItem]
    );
    // has batch contract
    if (batchContractAddress) {
      const contract = new ethers.Contract(
        batchContractAddress,
        batchQueryErc20Abi,
        provider
      );
      // get normal token balances
      const addresses = normalTokens.map((t) => t.contractAddress);
      const balances = await contract.batchTokensBalanceOf(
        userAddress,
        addresses
      );
      const normalTokenBalances = balances.reduce((acc, cur, index) => {
        const t = normalTokens[index];
        const balanceRead = ethers.utils.formatUnits(cur, t.decimals);
        const balanceRaw = ethers.utils.formatUnits(cur, 0);
        const balanceUSD = new Decimal(balanceRead).mul(t.price || 0).toFixed();
        acc[t.assetId] = {
          ...t,
          balanceRaw,
          balanceRead,
          balanceUSD,
        };
        return acc;
      }, {});
      map = { ...normalTokenBalances };
      // get native token balance
      if (!_.isEmpty(nativeToken)) {
        const nativeBalance = await get_balance_evm({
          token: {
            address: "",
            symbol: nativeToken.symbol,
            decimals: nativeToken.decimals,
          },
          chain,
          userAddress,
        });
        const balanceUSD = new Decimal(nativeBalance)
          .mul(nativeToken.price || 0)
          .toFixed();
        map = {
          ...map,
          [nativeToken.assetId]: {
            ...nativeToken,
            balanceRaw: expandToken(nativeBalance, nativeToken.decimals),
            balanceRead: nativeBalance,
            balanceUSD,
          },
        };
      }
    } else {
      // has not batch contract need config
      map = tokens.reduce((acc, cur) => {
        acc[cur.assetId] = {
          ...cur,
          balanceRaw: "0",
          balanceRead: "0",
          balanceUSD: "0",
        };
        return acc;
      }, {});
    }
  } catch (error) {
    // rpc error
    map = tokens.reduce((acc, cur) => {
      acc[cur.assetId] = {
        ...cur,
        balanceRaw: "0",
        balanceRead: "0",
        balanceUSD: "0",
      };
      return acc;
    }, {});
  }

  return map;
}
