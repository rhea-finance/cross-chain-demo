import { view_on_near, getNearConnection } from "@rhea-finance/cross-chain-sdk";
import { safeBig } from "@/utils/numbers";
import { parseAmount, formatAmount } from "@/utils/chainsUtil";
import Big from "big.js";
import { ethers } from "ethers";

// BSC chain config
export const BSC_CHAIN_ID = "0x38"; // BSC mainnet chainId
export const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
export const BSC_LSD_USDT_ADDRESS =
  "0xc350bafb46813dd23fd298c1caef96da4a4c1f2a";
export const BSC_USDT_DECIMALS = 18;
export const LSD_USDT_DECIMALS = 18;

// NEAR config
export const LSD_CONTRACT_ID = "lsd.stg.ref-dev-team.near";
export const BURROW_CONTRACT_ID = "br.private-mainnet.ref-dev-team.near";
export const NEAR_USDT_ADDRESS = "usdt.tether-token.near";
export const NEAR_USDT_DECIMALS = 6;

// Types
export interface LsdMetadata {
  underlying_token_id: string;
  underlying_burrowland_shares: string;
  burrowland_id: string;
  rewards: Record<string, string>;
  swap_msg_template: Record<string, string>;
  protocol_fee_rate: number;
  acc_protocol_fee: string;
}

export interface BurrowAsset {
  token_id: string;
  supplied: {
    shares: string;
    balance: string;
  };
  borrowed: {
    shares: string;
    balance: string;
  };
}

// Core LSD query functions
export async function queryLsdMetadata(): Promise<LsdMetadata> {
  const res = await view_on_near({
    contractId: LSD_CONTRACT_ID,
    methodName: "get_metadata",
    args: {},
  });
  return res as LsdMetadata;
}

export async function queryLsdTotalSupply(): Promise<string> {
  const res = await view_on_near({
    contractId: LSD_CONTRACT_ID,
    methodName: "ft_total_supply",
    args: {},
  });
  return res as string;
}

export async function queryBurrowAsset(tokenId: string): Promise<BurrowAsset> {
  const res = await view_on_near({
    contractId: BURROW_CONTRACT_ID,
    methodName: "get_asset",
    args: { token_id: tokenId },
  });
  return res as BurrowAsset;
}

// Calculate required lsdUSDT for withdraw
export async function calculateLsdFromUsdt(
  usdtAmount: string
): Promise<string> {
  const [metadata, totalSupply, asset] = await Promise.all([
    queryLsdMetadata(),
    queryLsdTotalSupply(),
    queryBurrowAsset(NEAR_USDT_ADDRESS),
  ]);

  const usdtAmountRaw = parseAmount(usdtAmount, BSC_USDT_DECIMALS);

  const BA = safeBig(usdtAmountRaw)
    .mul(asset.supplied.shares)
    .div(asset.supplied.balance);

  const lsdAmount = BA.mul(totalSupply)
    .div(metadata.underlying_burrowland_shares)
    .toFixed(0, Big.roundUp);

  return lsdAmount;
}

// Format lsd amount for display
export function formatLsdAmount(lsdAmount: string): string {
  return formatAmount(lsdAmount, LSD_USDT_DECIMALS);
}

// ETH final contract address
export const ETH_FINAL_CONTRACT = "0x468fB74626aA39ddeD71F69a39D660A66108BCf1";

// Encode EVM address to hex string (without 0x prefix)
export function encodeAddress(address: string): string {
  if (!ethers.utils.isAddress(address)) {
    throw new Error("Invalid EVM address");
  }
  const encodedPayload = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [address]
  );
  return encodedPayload.slice(2);
}

// Get Wormhole token bridge address for a chain
async function getTokenBridgeAddress(chainId: number): Promise<string> {
  // Dynamic import to avoid SSR issues
  if (typeof window === "undefined") {
    return ""; // Return empty string during SSR
  }
  const wormholeSdk = await import("@certusone/wormhole-sdk");
  const chainName = wormholeSdk.coalesceChainName(chainId as any);
  const contracts = wormholeSdk.CONTRACTS.MAINNET[chainName];
  return contracts?.token_bridge || "";
}

// Get NEAR block hash
export async function getNearBlockHash(): Promise<string> {
  const accountConnection = await getNearConnection();
  const { hash: blockHash } = (
    await accountConnection.connection.provider.block({ finality: "final" })
  ).header;
  return blockHash;
}

// Approve LSD token for Wormhole bridge
export async function approveTokenForWormhole(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: string,
  decimals: number
) {
  // Dynamic import to avoid SSR issues
  const { approveEth, getAllowanceEth } = await import(
    "@certusone/wormhole-sdk"
  );

  const tokenBridgeAddress = await getTokenBridgeAddress(4); // 4 = BSC in Wormhole
  if (!tokenBridgeAddress) {
    throw new Error("Failed to get token bridge address");
  }

  const transferAmountParsed = ethers.utils
    .parseUnits(amount, decimals)
    .toBigInt();

  const allowance = await getAllowanceEth(
    tokenBridgeAddress,
    tokenAddress,
    signer
  ).then(
    (result) => result.toBigInt(),
    (error) => {
      console.error("Unable to retrieve allowance", error);
      return BigInt(0);
    }
  );

  if (allowance && transferAmountParsed && allowance >= transferAmountParsed) {
    console.log("Token already approved", { allowance: allowance.toString() });
    return;
  }

  console.log("Approving Token", { amount, tokenAddress });
  const receipt = await approveEth(
    tokenBridgeAddress,
    tokenAddress,
    signer,
    ethers.BigNumber.from(transferAmountParsed),
    {}
  );
  console.log("Token Approved", { txHash: receipt.transactionHash });
  return receipt;
}

// Bridge LSD token from BSC to NEAR via Wormhole
export async function bridgeTokenToNear(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: string,
  decimals: number,
  payload: string
) {
  // Dynamic import to avoid SSR issues
  const { CHAIN_ID_NEAR, transferFromEth, hexToUint8Array } = await import(
    "@certusone/wormhole-sdk"
  );

  const tokenBridge = await getTokenBridgeAddress(4); // BSC
  if (!tokenBridge) {
    throw new Error("Failed to get BSC token bridge address");
  }

  const WORMHOLE_TOKEN_BRIDGE_CONTRACT_ID = await getTokenBridgeAddress(
    CHAIN_ID_NEAR
  );
  if (!WORMHOLE_TOKEN_BRIDGE_CONTRACT_ID) {
    throw new Error("Failed to get NEAR token bridge address");
  }

  // Get account hash from NEAR contract
  const near = await getNearConnection();
  const account = await near.account("dontcare");
  const account_hash = await account.viewFunction({
    contractId: WORMHOLE_TOKEN_BRIDGE_CONTRACT_ID,
    methodName: "hash_account",
    args: { account: payload ? LSD_CONTRACT_ID : "" },
  });

  const recipientAddress = hexToUint8Array(account_hash[1]);
  const recipientChain = CHAIN_ID_NEAR;
  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const feeParsed = ethers.utils.parseUnits("0", decimals);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  const payloadObject = Buffer.from(payload);

  console.log("Bridging Token to NEAR", {
    tokenAddress,
    amount,
    recipientChain: CHAIN_ID_NEAR,
    payloadLength: payloadObject.length,
    accountHash: account_hash,
  });

  const receipt = await transferFromEth(
    tokenBridge,
    signer,
    tokenAddress,
    transferAmountParsed,
    recipientChain,
    recipientAddress,
    feeParsed,
    {},
    payloadObject
  );

  console.log("Bridge Transaction Completed", {
    txHash: receipt.transactionHash,
  });

  return receipt;
}

// Create custom recipient message for LSD supply
export async function createLsdSupplyRecipientMsg(
  bscAccountId: string
): Promise<string> {
  const blockHash = await getNearBlockHash();
  const createTxMsg = {
    block_hash: blockHash,
    msg: JSON.stringify({
      chain: 4, // BSC chain ID in Wormhole
      fee: "0",
      message_fee: 0,
      payload: encodeAddress(bscAccountId),
      receiver: encodeAddress(ETH_FINAL_CONTRACT),
    }),
  };
  return JSON.stringify(createTxMsg);
}
