import Decimal from "decimal.js";
import _ from "lodash";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  Transaction,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  RpcResponseAndContext,
  SignatureStatus,
  SystemProgram,
} from "@solana/web3.js";
import { formatAmount } from "@/utils/chainsUtil";
import Big from "big.js";
import bs58 from "bs58";
import { sleep } from "@/utils/common";
import {
  IIntentItem,
  config_solana,
  prepare_sign_message_solana,
  process_signature_solana,
} from "@rhea-finance/cross-chain-sdk";
import { shrinkToken, expandToken } from "@/utils/numbers";

export async function transfer_solana({
  tokenAddress,
  depositAddress,
  amount,
}: {
  tokenAddress: string;
  depositAddress: string;
  amount: string;
}) {
  const { connection, publicKey } = window.solanaWallet;
  if (tokenAddress) {
    const senderATA = await getAssociatedTokenAddress(
      new PublicKey(tokenAddress),
      publicKey
    );
    const receiverATA = await getAssociatedTokenAddress(
      new PublicKey(tokenAddress),
      new PublicKey(depositAddress)
    );
    const receiverAccount = await connection.getAccountInfo(receiverATA);
    const instructions: TransactionInstruction[] = [];
    if (!receiverAccount) {
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        publicKey,
        receiverATA,
        new PublicKey(depositAddress),
        new PublicKey(tokenAddress)
      );
      instructions.push(createATAInstruction);
    }
    const transferInstruction = createTransferInstruction(
      senderATA,
      receiverATA,
      publicKey,
      BigInt(amount)
    );
    instructions.push(transferInstruction);
    const signature = await sendTransaction(instructions);
    return signature;
  } else {
    // native token
    const recipientPublicKey = new PublicKey(depositAddress);
    const transferAmount = parseFloat(amount);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipientPublicKey,
        lamports: transferAmount,
      })
    );
    const signature = await sendTransaction(transaction);
    return signature;
  }
}

export async function sign_message_solana(message: string) {
  const messageBuffer = prepare_sign_message_solana(message);
  const { signMessage } = window.solanaWallet;
  const signedMessage = await signMessage(messageBuffer);
  const result = process_signature_solana(signedMessage);
  return result;
}

export async function get_balance_solana({
  tokenAddress,
}: {
  tokenAddress: string;
}) {
  const { connection, publicKey } = window.solanaWallet;
  const tokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    publicKey
  );
  try {
    await getAccount(connection, tokenAccount);
  } catch (error) {
    return "0";
  }
  try {
    const res = await connection.getTokenAccountBalance(tokenAccount);
    return formatAmount(res.value.amount, res.value.decimals);
  } catch (error) {
    console.error(`----------solana-${tokenAddress}-balance-error`, error);
    return "0";
  }
}

type SendTransactionParams = Transaction | TransactionInstruction;
export async function sendTransaction<
  T extends SendTransactionParams = SendTransactionParams
>(transactions: T | T[], options?: { autoGasAndFee?: boolean }) {
  try {
    if (!window.solanaWallet) throw new Error("solana Wallet not found");
    const { connection, sendTransaction, publicKey } = window.solanaWallet!;
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    let transaction = transactions as any;
    if (options?.autoGasAndFee ?? true) {
      const transactionArray = Array.isArray(transactions)
        ? transactions
        : [transactions];
      transaction = new Transaction().add(...(transactionArray as any));
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;
      const priorityFee = await getPriorityFeeEstimate(transaction);
      console.log("estimated priorityFee:", priorityFee);
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 500000,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
        })
      );
    }
    const signature = await sendTransaction?.(transaction, connection, {
      skipPreflight: true,
      maxRetries: 10,
      preflightCommitment: "finalized",
    });
    if (!signature) throw new Error("sendTransaction failed");
    const confirmation = await pollForTransactionConfirmation(signature);

    console.log("confirmation", confirmation);
    if (!confirmation.value || confirmation.value?.err) {
      throw new Error(
        confirmation.value?.err
          ? `send transaction failed: ${
              typeof confirmation.value.err === "string"
                ? confirmation.value.err
                : JSON.stringify(confirmation.value.err)
            }`
          : `send transaction failed, please try again later`
      );
    }
    return signature;
  } catch (error) {
    if (error instanceof Error && error.message.includes("User")) {
      return;
    }
    throw error;
  }
}

async function pollForTransactionConfirmation(
  signature: string,
  timeout = 120000
): Promise<RpcResponseAndContext<SignatureStatus | null>> {
  const startTime = Date.now();
  let done = false;
  let status: RpcResponseAndContext<SignatureStatus | null> | null = null;
  const { connection } = window.solanaWallet!;
  while (!done && Date.now() - startTime < timeout) {
    status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (
      status?.value?.confirmationStatus === "finalized" ||
      status?.value?.err
    ) {
      done = true;
    } else {
      await sleep(2000);
    }
  }
  if (!status) {
    throw new Error(
      `Transaction confirmation failed for signature ${signature}`
    );
  }
  return status;
}

async function getPriorityFeeEstimate(transaction: Transaction) {
  const defaultPriorityFee = 300000;
  const multiplier = 1;
  try {
    const res = await fetch(config_solana.nodeUrl, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getPriorityFeeEstimate",
        params: [
          {
            transaction: bs58.encode(
              transaction.serialize({ verifySignatures: false })
            ),
            options: { priorityLevel: "High" },
          },
        ],
      }),
    });
    const data = await res.json();
    const priorityFee = new Big(data?.result?.priorityFeeEstimate || 0)
      .mul(multiplier)
      .round(0)
      .toNumber();
    return priorityFee ?? defaultPriorityFee;
  } catch (error) {
    console.error(error);
    return defaultPriorityFee;
  }
}
export async function get_batch_balances_solana({
  tokens,
}: {
  tokens: IIntentItem[];
}): Promise<Record<string, IIntentItem>> {
  try {
    let map: Record<string, IIntentItem> = {};
    const { connection, publicKey } = window.solanaWallet;
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

    const ATA_list = await Promise.all(
      normalTokens.map((t) =>
        getAssociatedTokenAddress(new PublicKey(t.contractAddress), publicKey)
      )
    );
    const normalRes = await connection.getMultipleAccountsInfo(ATA_list);
    const normalResult = normalRes.reduce((acc, cur, index) => {
      const token = normalTokens[index];
      if (cur) {
        const amount = cur.data.readBigUInt64LE(64).toString();
        const amountRead = shrinkToken(amount, token.decimals);
        const balanceUSD = new Decimal(amountRead)
          .mul(token.price || 0)
          .toFixed();
        acc[token.assetId] = {
          ...token,
          balanceRaw: amount,
          balanceRead: amountRead,
          balanceUSD,
        };
      } else {
        acc[token.assetId] = {
          ...token,
          balanceRaw: "0",
          balanceRead: "0",
          balanceUSD: "0",
        };
      }
      return acc;
    }, {});
    map = { ...normalResult };
    if (!_.isEmpty(nativeToken)) {
      const _balanceRead = await get_sol_balance_solana();
      const balanceRead = new Decimal(_balanceRead).toFixed();
      const balanceRaw = expandToken(balanceRead, nativeToken.decimals);
      const balanceUSD = new Decimal(balanceRead)
        .mul(nativeToken.price || 0)
        .toFixed();
      map = {
        ...map,
        [nativeToken.assetId]: {
          ...nativeToken,
          balanceRaw,
          balanceRead,
          balanceUSD,
        },
      };
    }

    return map;
  } catch (error) {
    const result = tokens.reduce((acc, cur) => {
      acc[cur.assetId] = {
        ...cur,
        balanceRaw: "0",
        balanceRead: "0",
        balanceUSD: "0",
      };
      return acc;
    }, {});
    return result;
  }
}

export async function get_sol_balance_solana() {
  try {
    const { connection, publicKey } = window.solanaWallet;
    const lamports = await connection.getBalance(publicKey);
    return lamports / 1e9;
  } catch (error) {
    return "0";
  }
}
