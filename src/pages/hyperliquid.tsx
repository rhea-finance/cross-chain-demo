import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  config_evm,
  intentsQuotation,
  pollingTransactionStatus,
  view_on_near,
} from "@rhea-finance/cross-chain-sdk";
import useWalletConnect from "@/hooks/useWalletConnect";
import { INTENTS_TOKENS } from "@/services/chainConfig";
import { get_balance_evm } from "@/services/chains/evm";
import {
  get_balance_solana,
  sign_message_solana,
  transfer_solana,
} from "@/services/chains/solana";
import {
  formatErrorMessage,
  getAccountIdUi,
  parseAmount,
} from "@/utils/chainsUtil";
import failToast from "@/components/common/toast/failToast";
import { ethers } from "ethers";

const EVM_MPC_ADDR_AGENT_CONTRACT = "evm_mpc_addr_agent.stg.ref-dev-team.near";
const EVM_MPC_CALL_URL = "https://mainnet-indexer.ref-finance.com/evm_mpc_call";
const STABLEFLOW_REPORT_TX_URL = "https://api.stableflow.ai/v1/intents/trx";
const STABLEFLOW_PERMIT_URL = "https://api.stableflow.ai/v1/arb/permit";
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const HYPERLIQUID_EXCHANGE_URL = "https://api.hyperliquid.xyz/exchange";
const HYPERLIQUID_BRIDGE_SPENDER = "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7";
const ARBITRUM_CHAIN_ID = 42161;
const HYPERLIQUID_SIGNATURE_CHAIN_ID = "0xa4b1";
const HYPERLIQUID_CHAIN = "Mainnet";
const USDC_PERMIT_NAME = "USD Coin";
const USDC_PERMIT_VERSION = "2";

const SOLANA_USDC = INTENTS_TOKENS.USDC.solana;
const ARBITRUM_USDC = INTENTS_TOKENS.USDC.evm.Arbitrum;

type QuoteState = {
  depositAddress: string;
  amountIn: string;
  amountInFormatted?: string;
  amountOutFormatted?: string;
  timeEstimate?: number | string;
};

type PermitSignatureState = {
  payload: string;
  proof: string;
  response: unknown;
  nonce: string;
  deadline: string;
  nearSignature: {
    scheme: string;
    big_r: { affine_point: string };
    s: { scalar: string };
    recovery_id: number;
  };
  evmSignature: string;
};

type PermitSubmitState = {
  requestBody: Record<string, unknown>;
  response: unknown;
};

type ReportTxState = {
  requestBody: Record<string, unknown>;
  response: unknown;
  trxId: string;
};

type WithdrawAction = {
  type: "withdraw3";
  signatureChainId: string;
  hyperliquidChain: string;
  destination: string;
  amount: string;
  time: number;
};

type WithdrawSignatureState = {
  action: WithdrawAction;
  payload: string;
  proof: string;
  response: unknown;
  nearSignature: NearSecp256k1Signature;
  evmSignature: string;
};

type WithdrawSubmitState = {
  requestBody: Record<string, unknown>;
  response: unknown;
};

type WithdrawProgressState = {
  requestBody: Record<string, unknown>;
  response: unknown;
  updates: any[];
};

type NearSecp256k1Signature = {
  scheme: string;
  big_r: { affine_point: string };
  s: { scalar: string };
  recovery_id: number;
};

function nearSignatureToEvmSignatureHex(signature: NearSecp256k1Signature) {
  const r = signature.big_r.affine_point.substring(2).padStart(64, "0");
  const s = signature.s.scalar.padStart(64, "0");
  const v = (signature.recovery_id + 27).toString(16).padStart(2, "0");
  return `0x${r}${s}${v}`;
}

function extractNearSignatureFromMpcResult(
  result: any
): NearSecp256k1Signature {
  const execution = result?.data;
  const receiptsOutcome = execution?.receipts_outcome;

  if (!Array.isArray(receiptsOutcome) || receiptsOutcome.length === 0) {
    throw new Error("Missing receipts_outcome in evm_mpc_call response");
  }

  const lastReceipt = receiptsOutcome[receiptsOutcome.length - 1];
  const log = lastReceipt?.outcome?.logs?.[0];

  if (!log || typeof log !== "string") {
    throw new Error("Missing signature log in evm_mpc_call response");
  }
  const normalizedLog = log.replace("EVENT_JSON:", "");

  const parsedLog = JSON.parse(normalizedLog);
  const signature = parsedLog?.data?.signature;

  if (
    !signature?.big_r?.affine_point ||
    !signature?.s?.scalar ||
    typeof signature?.recovery_id !== "number"
  ) {
    throw new Error("Invalid NEAR signature payload in log");
  }

  return signature as NearSecp256k1Signature;
}

const HyperLiquidPage = () => {
  const { solana } = useWalletConnect();

  const [mappedEvmAddress, setMappedEvmAddress] = useState("");
  const [mappingLoading, setMappingLoading] = useState(false);

  const [arbUsdcBalance, setArbUsdcBalance] = useState("0");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [hyperliquidBalance, setHyperliquidBalance] = useState("0");
  const [hyperliquidBalanceLoading, setHyperliquidBalanceLoading] =
    useState(false);
  const [solanaUsdcBalance, setSolanaUsdcBalance] = useState("0");
  const [solanaBalanceLoading, setSolanaBalanceLoading] = useState(false);
  const [permitAmount, setPermitAmount] = useState("");
  const [permitLoading, setPermitLoading] = useState(false);
  const [permitStatusText, setPermitStatusText] = useState(
    "Prepare a permit signature for the mapped EVM address."
  );
  const [permitSignature, setPermitSignature] =
    useState<PermitSignatureState | null>(null);
  const [permitSubmitLoading, setPermitSubmitLoading] = useState(false);
  const [permitSubmitStatusText, setPermitSubmitStatusText] = useState(
    "Submit the generated permit signature to the reference backend."
  );
  const [permitSubmitResult, setPermitSubmitResult] =
    useState<PermitSubmitState | null>(null);
  const [reportTxStatusText, setReportTxStatusText] = useState(
    "The bridge report will be created after a successful Solana transfer."
  );
  const [reportTxResult, setReportTxResult] = useState<ReportTxState | null>(
    null
  );
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawStatusText, setWithdrawStatusText] = useState(
    "Prepare a HyperLiquid withdraw3 signature for the mapped EVM address."
  );
  const [withdrawSignature, setWithdrawSignature] =
    useState<WithdrawSignatureState | null>(null);
  const [withdrawSubmitLoading, setWithdrawSubmitLoading] = useState(false);
  const [withdrawSubmitStatusText, setWithdrawSubmitStatusText] = useState(
    "Submit the generated withdraw3 signature to HyperLiquid exchange."
  );
  const [withdrawSubmitResult, setWithdrawSubmitResult] =
    useState<WithdrawSubmitState | null>(null);
  const [withdrawProgressLoading, setWithdrawProgressLoading] = useState(false);
  const [withdrawProgressStatusText, setWithdrawProgressStatusText] = useState(
    "Query withdrawal progress after the withdraw request is submitted."
  );
  const [withdrawProgressResult, setWithdrawProgressResult] =
    useState<WithdrawProgressState | null>(null);
  const [withdrawProgressStartTime, setWithdrawProgressStartTime] = useState<
    number | null
  >(null);

  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<QuoteState | null>(null);

  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [statusText, setStatusText] = useState(
    "Connect a Solana wallet to start the deposit flow."
  );
  const [lastTxHash, setLastTxHash] = useState("");

  const isSolanaConnected = !!solana.isSignedIn;

  const fetchMappedAddress = useCallback(async () => {
    if (!solana.isSignedIn || !solana.accountId) {
      setMappedEvmAddress("");
      return;
    }

    setMappingLoading(true);
    try {
      const address = await view_on_near({
        contractId: EVM_MPC_ADDR_AGENT_CONTRACT,
        methodName: "get_evm_address",
        args: {
          wallet: {
            Solana: solana.accountId,
          },
        },
      });
      setMappedEvmAddress((address as string) || "");
    } catch (error: any) {
      setMappedEvmAddress("");
      failToast({
        failText: formatErrorMessage(
          error?.message || "Failed to load mapped EVM address"
        ),
      });
    } finally {
      setMappingLoading(false);
    }
  }, [solana.accountId, solana.isSignedIn]);

  const fetchArbUsdcBalance = useCallback(async () => {
    if (!mappedEvmAddress) {
      setArbUsdcBalance("0");
      return;
    }

    setBalanceLoading(true);
    try {
      const balance = await get_balance_evm({
        userAddress: mappedEvmAddress,
        chain: "arbitrum",
        token: {
          symbol: "USDC",
          address: ARBITRUM_USDC.contractAddress,
          decimals: ARBITRUM_USDC.decimals,
        },
      });
      setArbUsdcBalance(balance || "0");
    } finally {
      setBalanceLoading(false);
    }
  }, [mappedEvmAddress]);

  const fetchHyperliquidBalance = useCallback(async () => {
    if (!mappedEvmAddress) {
      setHyperliquidBalance("0");
      return;
    }

    setHyperliquidBalanceLoading(true);
    try {
      const response = await fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: mappedEvmAddress,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `HyperLiquid balance query failed with status ${response.status}`
        );
      }

      setHyperliquidBalance(result?.crossMarginSummary?.accountValue || "0");
    } catch (error: any) {
      setHyperliquidBalance("0");
      failToast({
        failText: formatErrorMessage(
          error?.message || "Failed to load HyperLiquid balance"
        ),
      });
    } finally {
      setHyperliquidBalanceLoading(false);
    }
  }, [mappedEvmAddress]);

  const fetchSolanaUsdcBalance = useCallback(async () => {
    if (!solana.isSignedIn || !solana.accountId) {
      setSolanaUsdcBalance("0");
      return;
    }

    setSolanaBalanceLoading(true);
    try {
      const balance = await get_balance_solana({
        tokenAddress: SOLANA_USDC.contractAddress,
      });
      setSolanaUsdcBalance(balance || "0");
    } finally {
      setSolanaBalanceLoading(false);
    }
  }, [solana.accountId, solana.isSignedIn]);

  useEffect(() => {
    fetchMappedAddress();
  }, [fetchMappedAddress]);

  useEffect(() => {
    fetchArbUsdcBalance();
  }, [fetchArbUsdcBalance]);

  useEffect(() => {
    fetchHyperliquidBalance();
  }, [fetchHyperliquidBalance]);

  useEffect(() => {
    fetchSolanaUsdcBalance();
  }, [fetchSolanaUsdcBalance]);

  useEffect(() => {
    if (!mappedEvmAddress) return;
    const timer = window.setInterval(() => {
      fetchArbUsdcBalance();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [mappedEvmAddress, fetchArbUsdcBalance]);

  useEffect(() => {
    if (!solana.isSignedIn) {
      setQuote(null);
      setAmount("");
      setLastTxHash("");
      setSolanaUsdcBalance("0");
      setHyperliquidBalance("0");
      setPermitAmount("");
      setReportTxResult(null);
      setPermitSignature(null);
      setPermitSubmitResult(null);
      setWithdrawAmount("");
      setWithdrawDestination("");
      setWithdrawSignature(null);
      setWithdrawSubmitResult(null);
      setWithdrawProgressResult(null);
      setWithdrawProgressStartTime(null);
      setReportTxStatusText(
        "The bridge report will be created after a successful Solana transfer."
      );
      setPermitStatusText(
        "Prepare a permit signature for the mapped EVM address."
      );
      setPermitSubmitStatusText(
        "Submit the generated permit signature to the reference backend."
      );
      setWithdrawStatusText(
        "Prepare a HyperLiquid withdraw3 signature for the mapped EVM address."
      );
      setWithdrawSubmitStatusText(
        "Submit the generated withdraw3 signature to HyperLiquid exchange."
      );
      setWithdrawProgressStatusText(
        "Query withdrawal progress after the withdraw request is submitted."
      );
      setStatusText("Connect a Solana wallet to start the deposit flow.");
    }
  }, [solana.accountId, solana.isSignedIn]);

  useEffect(() => {
    if (!permitAmount && arbUsdcBalance && Number(arbUsdcBalance) > 0) {
      setPermitAmount(arbUsdcBalance);
    }
  }, [arbUsdcBalance, permitAmount]);

  const quotedRouteSummary = useMemo(() => {
    if (!quote) return null;
    return {
      sendAmount: quote.amountInFormatted || amount || "-",
      receiveAmount: quote.amountOutFormatted || "-",
      depositAddress: quote.depositAddress,
      eta:
        quote.timeEstimate !== undefined
          ? `~${quote.timeEstimate}s`
          : "Pending",
    };
  }, [quote, amount]);

  const handleBridge = async () => {
    if (!solana.isSignedIn || !solana.accountId) {
      solana.open();
      return;
    }
    if (!mappedEvmAddress) {
      failToast({
        failText: "Mapped EVM address is not ready yet.",
      });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      failToast({
        failText: "Enter a valid USDC amount.",
      });
      return;
    }

    setBridgeLoading(true);
    setLastTxHash("");
    setReportTxResult(null);
    setPermitSubmitResult(null);
    setReportTxStatusText(
      "The bridge report will be created after a successful Solana transfer."
    );
    setPermitSubmitStatusText(
      "Submit the generated permit signature to the reference backend."
    );
    setStatusText("Requesting 1Click bridge quote...");

    try {
      const quoteResult = await intentsQuotation({
        originAsset: SOLANA_USDC.assetId,
        destinationAsset: ARBITRUM_USDC.assetId,
        amount: parseAmount(amount, SOLANA_USDC.decimals),
        refundTo: solana.accountId,
        recipient: mappedEvmAddress,
      });

      if (
        quoteResult?.quoteStatus !== "success" ||
        !quoteResult?.quoteSuccessResult?.quote
      ) {
        throw new Error(quoteResult?.message || "Failed to get bridge quote");
      }

      const nextQuote = quoteResult.quoteSuccessResult.quote;
      setQuote({
        depositAddress: nextQuote.depositAddress,
        amountIn: nextQuote.amountIn,
        amountInFormatted: nextQuote.amountInFormatted,
        amountOutFormatted: nextQuote.amountOutFormatted,
        timeEstimate: nextQuote.timeEstimate,
      });

      setStatusText("Quote ready. Waiting for Solana wallet transfer...");

      const txHash = await transfer_solana({
        tokenAddress: SOLANA_USDC.contractAddress,
        depositAddress: nextQuote.depositAddress,
        amount: nextQuote.amountIn,
      });

      if (!txHash) {
        throw new Error("Solana transfer was cancelled");
      }

      setLastTxHash(txHash);
      setStatusText("Bridge transfer submitted. Creating Stableflow trx_id...");

      const reportRequestBody = {
        deposit_address: nextQuote.depositAddress,
        from_hash: txHash,
        from_token: SOLANA_USDC.contractAddress,
        perp: "hyperliquid",
        sender: mappedEvmAddress,
        to_token: ARBITRUM_USDC.contractAddress,
        type: "oneclick",
        from_addr: solana.accountId,
      };

      const reportResponse = await fetch(STABLEFLOW_REPORT_TX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportRequestBody),
      });

      const reportResult = await reportResponse.json().catch(() => null);

      if (!reportResponse.ok) {
        throw new Error(
          reportResult?.msg ||
            reportResult?.message ||
            `reportTx failed with status ${reportResponse.status}`
        );
      }

      const trxId = reportResult?.data?.trx_id;

      if (!trxId) {
        throw new Error("reportTx succeeded but trx_id is missing");
      }

      setReportTxResult({
        requestBody: reportRequestBody,
        response: reportResult,
        trxId,
      });
      setReportTxStatusText(
        `Bridge report created successfully. trx_id: ${trxId}`
      );
      setStatusText(
        "Bridge transfer submitted. Waiting for Intents settlement on Arbitrum..."
      );

      const { status } = await pollingTransactionStatus(
        nextQuote.depositAddress
      );

      if (status !== "success") {
        throw new Error(`Bridge status: ${status}`);
      }

      setStatusText(
        "Bridge completed. Refreshing Arbitrum USDC balance on the mapped EVM address..."
      );
      await Promise.all([
        fetchArbUsdcBalance(),
        fetchSolanaUsdcBalance(),
        fetchHyperliquidBalance(),
      ]);
      setStatusText("Bridge completed successfully.");
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Bridge failed"
      );
      setStatusText(`Bridge failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setBridgeLoading(false);
    }
  };

  const handlePermitSignature = async () => {
    if (!solana.isSignedIn || !solana.accountId) {
      solana.open();
      return;
    }
    if (!mappedEvmAddress) {
      failToast({
        failText: "Mapped EVM address is not ready yet.",
      });
      return;
    }
    if (!permitAmount || Number(permitAmount) <= 0) {
      failToast({
        failText: "Enter a valid permit amount.",
      });
      return;
    }

    setPermitLoading(true);
    setPermitSignature(null);
    setPermitSubmitResult(null);
    setPermitSubmitStatusText(
      "Submit the generated permit signature to the reference backend."
    );
    setPermitStatusText("Reading the latest USDC permit nonce...");

    try {
      if (!window.solanaWallet?.signMessage) {
        throw new Error(
          "Current Solana wallet does not expose signMessage. Reconnect the wallet and try again."
        );
      }

      const provider = new ethers.providers.JsonRpcProvider(
        config_evm.chains.arbitrum.rpcUrl
      );
      const usdcContract = new ethers.Contract(
        ARBITRUM_USDC.contractAddress,
        ["function nonces(address) view returns (uint256)"],
        provider
      );

      const nonce = (await usdcContract.nonces(mappedEvmAddress)).toString();
      const deadline = (Math.floor(Date.now() / 1000) + 86400).toString();
      const value = parseAmount(permitAmount, ARBITRUM_USDC.decimals);

      const domain = {
        name: USDC_PERMIT_NAME,
        version: USDC_PERMIT_VERSION,
        chainId: ARBITRUM_CHAIN_ID,
        verifyingContract: ARBITRUM_USDC.contractAddress,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const values = {
        owner: mappedEvmAddress,
        spender: HYPERLIQUID_BRIDGE_SPENDER,
        value,
        nonce,
        deadline,
      };

      const payload = ethers.utils._TypedDataEncoder.hash(
        domain,
        types,
        values
      );
      const payloadHex = payload.replace(/^0x/, "");

      setPermitStatusText("Requesting Solana proof for the permit payload...");
      const proof = await sign_message_solana(payloadHex);

      setPermitStatusText(
        "Calling evm_mpc_call for the mapped EVM signature..."
      );
      const response = await fetch(EVM_MPC_CALL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: {
            Solana: solana.accountId,
          },
          payload: payloadHex,
          proof,
        }),
      });

      if (!response.ok) {
        throw new Error(`evm_mpc_call failed with status ${response.status}`);
      }
      const result = await response.json();
      const nearSignature = extractNearSignatureFromMpcResult(result);
      const evmSignature = nearSignatureToEvmSignatureHex(nearSignature);
      setPermitSignature({
        payload: payloadHex,
        proof,
        response: result,
        nonce,
        deadline,
        nearSignature,
        evmSignature,
      });
      setPermitStatusText("Permit signature generated successfully.");
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Permit signature failed"
      );
      setPermitStatusText(`Permit signature failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setPermitLoading(false);
    }
  };

  const handleSubmitPermit = async () => {
    if (!permitSignature) {
      failToast({
        failText: "Generate a permit signature first.",
      });
      return;
    }
    if (!reportTxResult?.trxId) {
      failToast({
        failText: "Missing trx_id. Bridge first so we can report the transfer.",
      });
      return;
    }

    setPermitSubmitLoading(true);
    setPermitSubmitResult(null);
    setPermitSubmitStatusText("Submitting permit signature to backend...");

    try {
      const split = ethers.utils.splitSignature(permitSignature.evmSignature);
      const requestBody = {
        deadline: permitSignature.deadline,
        owner: mappedEvmAddress,
        r: split.r,
        s: split.s,
        spender: HYPERLIQUID_BRIDGE_SPENDER,
        token: ARBITRUM_USDC.contractAddress,
        v: split.v,
        value: parseAmount(permitAmount, ARBITRUM_USDC.decimals),
        trx_id: reportTxResult.trxId,
      };

      const response = await fetch(STABLEFLOW_PERMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.msg ||
            result?.message ||
            `Permit backend failed with status ${response.status}`
        );
      }

      setPermitSubmitResult({
        requestBody,
        response: result,
      });
      setPermitSubmitStatusText("Permit request submitted successfully.");
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Permit submit failed"
      );
      setPermitSubmitStatusText(`Permit submit failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setPermitSubmitLoading(false);
    }
  };

  const handleWithdrawSignature = async () => {
    if (!solana.isSignedIn || !solana.accountId) {
      solana.open();
      return;
    }
    if (!mappedEvmAddress) {
      failToast({
        failText: "Mapped EVM address is not ready yet.",
      });
      return;
    }
    if (!withdrawAmount || Number(withdrawAmount) <= 1) {
      failToast({
        failText: "Enter a valid withdraw amount greater than 1 USDC.",
      });
      return;
    }
    if (!withdrawDestination || !ethers.utils.isAddress(withdrawDestination)) {
      failToast({
        failText: "Enter a valid EVM destination address.",
      });
      return;
    }

    setWithdrawLoading(true);
    setWithdrawSignature(null);
    setWithdrawSubmitResult(null);
    setWithdrawProgressResult(null);
    setWithdrawProgressStartTime(null);
    setWithdrawSubmitStatusText(
      "Submit the generated withdraw3 signature to HyperLiquid exchange."
    );
    setWithdrawProgressStatusText(
      "Query withdrawal progress after the withdraw request is submitted."
    );
    setWithdrawStatusText("Building withdraw3 typed data payload...");

    try {
      if (!window.solanaWallet?.signMessage) {
        throw new Error(
          "Current Solana wallet does not expose signMessage. Reconnect the wallet and try again."
        );
      }

      const action: WithdrawAction = {
        type: "withdraw3",
        signatureChainId: HYPERLIQUID_SIGNATURE_CHAIN_ID,
        hyperliquidChain: HYPERLIQUID_CHAIN,
        destination: withdrawDestination,
        amount: withdrawAmount,
        time: Date.now(),
      };

      const domain = {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: ARBITRUM_CHAIN_ID,
        verifyingContract: ethers.constants.AddressZero,
      };

      const types = {
        "HyperliquidTransaction:Withdraw": [
          { name: "hyperliquidChain", type: "string" },
          { name: "destination", type: "string" },
          { name: "amount", type: "string" },
          { name: "time", type: "uint64" },
        ],
      };

      const payload = ethers.utils._TypedDataEncoder.hash(domain, types, {
        hyperliquidChain: action.hyperliquidChain,
        destination: action.destination,
        amount: action.amount,
        time: action.time,
      });
      const payloadHex = payload.replace(/^0x/, "");

      setWithdrawStatusText("Requesting Solana proof for withdraw3 payload...");
      const proof = await sign_message_solana(payloadHex);

      setWithdrawStatusText(
        "Calling evm_mpc_call for the mapped EVM withdraw signature..."
      );
      const response = await fetch(EVM_MPC_CALL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: {
            Solana: solana.accountId,
          },
          payload: payloadHex,
          proof,
        }),
      });

      if (!response.ok) {
        throw new Error(`evm_mpc_call failed with status ${response.status}`);
      }

      const result = await response.json();
      const nearSignature = extractNearSignatureFromMpcResult(result);
      const evmSignature = nearSignatureToEvmSignatureHex(nearSignature);

      setWithdrawSignature({
        action,
        payload: payloadHex,
        proof,
        response: result,
        nearSignature,
        evmSignature,
      });
      setWithdrawStatusText("Withdraw signature generated successfully.");
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Withdraw signature failed"
      );
      setWithdrawStatusText(`Withdraw signature failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleSubmitWithdraw = async () => {
    if (!withdrawSignature) {
      failToast({
        failText: "Generate a withdraw signature first.",
      });
      return;
    }

    setWithdrawSubmitLoading(true);
    setWithdrawSubmitResult(null);
    setWithdrawProgressResult(null);
    setWithdrawSubmitStatusText(
      "Submitting withdraw3 request to HyperLiquid..."
    );

    try {
      const split = ethers.utils.splitSignature(withdrawSignature.evmSignature);
      const requestBody = {
        action: withdrawSignature.action,
        nonce: withdrawSignature.action.time,
        signature: {
          r: split.r,
          s: split.s,
          v: split.v,
        },
      };

      const response = await fetch(HYPERLIQUID_EXCHANGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `HyperLiquid exchange failed with status ${response.status}`
        );
      }

      setWithdrawSubmitResult({
        requestBody,
        response: result,
      });
      setWithdrawSubmitStatusText("Withdraw request submitted successfully.");
      setWithdrawProgressStartTime(
        withdrawSignature.action.time - 5 * 60 * 1000
      );
      setWithdrawProgressStatusText(
        "Withdraw submitted. Waiting for HyperLiquid ledger updates..."
      );
      fetchHyperliquidBalance();
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Withdraw submit failed"
      );
      setWithdrawSubmitStatusText(`Withdraw submit failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setWithdrawSubmitLoading(false);
    }
  };

  const fetchWithdrawProgress = useCallback(async () => {
    if (!mappedEvmAddress) {
      setWithdrawProgressResult(null);
      return;
    }
    if (!withdrawProgressStartTime) {
      setWithdrawProgressStatusText(
        "Submit a withdraw request first, then query its progress here."
      );
      return;
    }

    setWithdrawProgressLoading(true);
    try {
      const requestBody = {
        type: "userNonFundingLedgerUpdates",
        user: mappedEvmAddress,
        startTime: withdrawProgressStartTime,
      };

      const response = await fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `Withdraw progress query failed with status ${response.status}`
        );
      }

      const updates = Array.isArray(result) ? result : [];
      const withdrawalUpdates = updates.filter((item) =>
        JSON.stringify(item).toLowerCase().includes("withdraw")
      );

      setWithdrawProgressResult({
        requestBody,
        response: result,
        updates: withdrawalUpdates,
      });

      if (!withdrawalUpdates.length) {
        setWithdrawProgressStatusText(
          "No withdrawal ledger update found yet. HyperLiquid may still be processing it."
        );
      } else {
        setWithdrawProgressStatusText(
          `Found ${withdrawalUpdates.length} withdrawal ledger update(s).`
        );
      }
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || "Failed to query withdraw progress"
      );
      setWithdrawProgressStatusText(
        `Withdraw progress query failed: ${message}`
      );
      failToast({ failText: message });
    } finally {
      setWithdrawProgressLoading(false);
    }
  }, [mappedEvmAddress, withdrawProgressStartTime]);

  useEffect(() => {
    if (!withdrawProgressStartTime || !mappedEvmAddress) return;
    fetchWithdrawProgress();

    const timer = window.setInterval(() => {
      fetchWithdrawProgress();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [fetchWithdrawProgress, mappedEvmAddress, withdrawProgressStartTime]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-3xl border border-[#b9ece4] bg-[#effaf7] px-8 py-10">
          <div className="inline-flex rounded-full border border-[#b9ece4] bg-white px-4 py-1 text-sm font-medium text-[#156b5b]">
            HyperLiquid Deposit Demo
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-black">
            Solana USDC to HyperLiquid
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-50">
            This first step bridges Solana USDC to the mapped EVM account on
            Arbitrum. We will use that Arbitrum USDC in the next step for the
            HyperLiquid deposit flow.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  1. Mapped EVM Address
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-50">
                  The mapped Arbitrum address is derived from the connected
                  Solana wallet through the NEAR contract.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Solana Wallet
              </div>
              <div className="mt-2 text-base font-medium text-black">
                {solana.accountId ? getAccountIdUi(solana.accountId) : "-"}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                    Mapped EVM Address
                  </div>
                  <div className="mt-2 break-all text-sm font-medium text-black">
                    {mappingLoading
                      ? "Loading mapped address..."
                      : mappedEvmAddress || "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchMappedAddress}
                  disabled={!solana.accountId || mappingLoading}
                  className="rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-black">
                2. Bridge Solana USDC to Arbitrum
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-50">
                We will request a 1Click quote, send Solana USDC to the returned
                deposit address, and settle the bridged funds to the mapped EVM
                address on Arbitrum.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Route
              </div>
              <div className="mt-3 text-sm text-black">
                Solana USDC
                <span className="mx-2 text-gray-40">{"->"}</span>
                Arbitrum USDC
              </div>
              <div className="mt-2 text-xs text-gray-50">
                Origin assetId: {SOLANA_USDC.assetId}
              </div>
              <div className="mt-1 text-xs text-gray-50">
                Destination assetId: {ARBITRUM_USDC.assetId}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-black">
                  Solana USDC Amount
                </label>
                <div className="text-sm text-gray-50">
                  Balance: {solanaBalanceLoading ? "..." : solanaUsdcBalance}{" "}
                  USDC
                </div>
              </div>
              <div className="border border-b-10 rounded-2xl mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.0"
                  className="w-full  px-4 py-3 text-base outline-none transition-colors text-b-10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleBridge}
              disabled={bridgeLoading || !solana.accountId || !mappedEvmAddress}
              className="mt-5 w-full rounded-2xl bg-black px-4 py-3 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bridgeLoading ? "Bridging..." : "Bridge to Mapped EVM Address"}
            </button>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {statusText}
              </div>
              {lastTxHash ? (
                <div className="mt-3 break-all text-xs text-gray-50">
                  Solana Tx: {lastTxHash}
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-black">
                4. Permit Signature
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-50">
                With bridged USDC already on the mapped EVM address, generate
                the HyperLiquid permit signature through Solana proof and
                `evm_mpc_call`.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-black">
                  Permit Amount
                </label>
                <div className="text-sm text-gray-50">
                  Available: {balanceLoading ? "..." : arbUsdcBalance} USDC
                </div>
              </div>
              <div className="border border-b-10 rounded-2xl mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={permitAmount}
                  onChange={(event) => setPermitAmount(event.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 text-base outline-none transition-colors text-b-10"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermitAmount(arbUsdcBalance)}
                  disabled={!arbUsdcBalance || Number(arbUsdcBalance) <= 0}
                  className="rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Balance
                </button>
                <button
                  type="button"
                  onClick={handlePermitSignature}
                  disabled={
                    permitLoading ||
                    !solana.accountId ||
                    !mappedEvmAddress ||
                    Number(permitAmount || 0) <= 0
                  }
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {permitLoading ? "Signing..." : "Generate Permit Signature"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Permit Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {permitStatusText}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-black">
                    Submit Permit to Backend
                  </div>
                  <div className="mt-1 text-sm leading-6 text-gray-50">
                    This calls the reference permit endpoint with the `trx_id`
                    created by `/v1/intents/trx`.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitPermit}
                  disabled={
                    !permitSignature ||
                    !reportTxResult?.trxId ||
                    permitSubmitLoading
                  }
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {permitSubmitLoading ? "Submitting..." : "Submit Permit"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Report Tx Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {reportTxStatusText}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Permit Submit Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {permitSubmitStatusText}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-black">
                5. Withdraw from HyperLiquid
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-50">
                Generate a HyperLiquid `withdraw3` signature with Solana proof,
                then submit it to HyperLiquid exchange.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-black">
                  Withdraw Amount
                </label>
                <div className="text-sm text-gray-50">
                  HyperLiquid:{" "}
                  {hyperliquidBalanceLoading ? "..." : hyperliquidBalance}
                </div>
              </div>
              <div className="border border-b-10 rounded-2xl mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 text-base outline-none transition-colors text-b-10"
                />
              </div>

              <label className="mt-4 block text-sm font-medium text-black">
                Destination (EVM Address)
              </label>
              <div className="border border-b-10 rounded-2xl mt-2">
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={(event) =>
                    setWithdrawDestination(event.target.value)
                  }
                  placeholder="0x..."
                  className="w-full px-4 py-3 text-base outline-none transition-colors text-b-10"
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(hyperliquidBalance)}
                  disabled={
                    !hyperliquidBalance || Number(hyperliquidBalance) <= 0
                  }
                  className="rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Balance
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawSignature}
                  disabled={
                    withdrawLoading ||
                    !solana.accountId ||
                    !mappedEvmAddress ||
                    Number(withdrawAmount || 0) <= 1 ||
                    !withdrawDestination
                  }
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawLoading
                    ? "Signing..."
                    : "Generate Withdraw Signature"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitWithdraw}
                  disabled={!withdrawSignature || withdrawSubmitLoading}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawSubmitLoading ? "Submitting..." : "Submit Withdraw"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Withdraw Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {withdrawStatusText}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Withdraw Submit Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {withdrawSubmitStatusText}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-black">
                    Query Withdraw Progress
                  </div>
                  <div className="mt-1 text-sm leading-6 text-gray-50">
                    Check HyperLiquid ledger updates for the submitted withdraw.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchWithdrawProgress}
                  disabled={
                    !withdrawProgressStartTime || withdrawProgressLoading
                  }
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawProgressLoading
                    ? "Refreshing..."
                    : "Refresh Progress"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Withdraw Progress Status
              </div>
              <div className="mt-2 text-sm leading-6 text-black">
                {withdrawProgressStatusText}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
            <h2 className="text-xl font-semibold text-black">
              3. Arbitrum USDC Balance
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-50">
              Once Intents finishes the route, the bridged USDC should appear on
              the mapped EVM address on Arbitrum.
            </p>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Mapped EVM Address Balance
              </div>
              <div className="mt-3 text-4xl font-semibold text-black">
                {balanceLoading ? "..." : arbUsdcBalance}
              </div>
              <div className="mt-1 text-sm text-gray-50">USDC on Arbitrum</div>
              <button
                type="button"
                onClick={fetchArbUsdcBalance}
                disabled={!mappedEvmAddress || balanceLoading}
                className="mt-4 rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh Balance
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                HyperLiquid Balance
              </div>
              <div className="mt-3 text-4xl font-semibold text-black">
                {hyperliquidBalanceLoading ? "..." : hyperliquidBalance}
              </div>
              <div className="mt-1 text-sm text-gray-50">
                Mapped EVM address balance inside HyperLiquid
              </div>
              <button
                type="button"
                onClick={fetchHyperliquidBalance}
                disabled={!mappedEvmAddress || hyperliquidBalanceLoading}
                className="mt-4 rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh HyperLiquid Balance
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Quote
              </div>
              {quotedRouteSummary ? (
                <div className="mt-3 space-y-3 text-sm text-black">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-50">Send</span>
                    <span>{quotedRouteSummary.sendAmount} USDC</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-50">Estimated receive</span>
                    <span>{quotedRouteSummary.receiveAmount} USDC</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-50">ETA</span>
                    <span>{quotedRouteSummary.eta}</span>
                  </div>
                  <div>
                    <div className="text-gray-50">Intents deposit address</div>
                    <div className="mt-1 break-all text-xs text-black">
                      {quotedRouteSummary.depositAddress}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No quote yet. Enter an amount and bridge Solana USDC to
                  generate the first route.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Report Tx
              </div>
              {reportTxResult ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">trx_id</div>
                    <div className="mt-1 break-all text-xs">
                      {reportTxResult.trxId}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">Request Body</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(reportTxResult.requestBody, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Backend Response</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(reportTxResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No bridge report yet. A `trx_id` will appear after the Solana
                  transfer is reported.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Permit Signature
              </div>
              {permitSignature ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">Nonce</div>
                    <div className="mt-1 break-all text-xs">
                      {permitSignature.nonce}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">Deadline</div>
                    <div className="mt-1 break-all text-xs">
                      {permitSignature.deadline}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">Payload</div>
                    <div className="mt-1 break-all text-xs">
                      {permitSignature.payload}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">Solana Proof</div>
                    <div className="mt-1 break-all text-xs">
                      {permitSignature.proof}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">EVM Signature</div>
                    <div className="mt-1 break-all text-xs">
                      {permitSignature.evmSignature}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">NEAR Signature</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(permitSignature.nearSignature, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No permit signature yet. Generate one after the mapped EVM
                  address has USDC on Arbitrum.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Permit Submit
              </div>
              {permitSubmitResult ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">Request Body</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(permitSubmitResult.requestBody, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Backend Response</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(permitSubmitResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No backend permit submission yet.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Withdraw Signature
              </div>
              {withdrawSignature ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">Action</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(withdrawSignature.action, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Payload</div>
                    <div className="mt-1 break-all text-xs">
                      {withdrawSignature.payload}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">Solana Proof</div>
                    <div className="mt-1 break-all text-xs">
                      {withdrawSignature.proof}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">EVM Signature</div>
                    <div className="mt-1 break-all text-xs">
                      {withdrawSignature.evmSignature}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-50">NEAR Signature</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(withdrawSignature.nearSignature, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No withdraw signature yet.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Withdraw Submit
              </div>
              {withdrawSubmitResult ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">Request Body</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(
                        withdrawSubmitResult.requestBody,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Backend Response</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(withdrawSubmitResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No withdraw submission yet.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Latest Withdraw Progress
              </div>
              {withdrawProgressResult ? (
                <div className="mt-3 space-y-4 text-sm text-black">
                  <div>
                    <div className="text-gray-50">Request Body</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(
                        withdrawProgressResult.requestBody,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Withdrawal Updates</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(withdrawProgressResult.updates, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-gray-50">Raw Response</div>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                      {JSON.stringify(withdrawProgressResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-50">
                  No withdraw progress queried yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HyperLiquidPage;
