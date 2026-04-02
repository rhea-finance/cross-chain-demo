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
  amountOut?: string;
  minAmountOut?: string;
  amountInFormatted?: string;
  amountOutFormatted?: string;
  timeEstimate?: number | string;
};

type DepositStepKey =
  | "bridge"
  | "settlement"
  | "permitSignature"
  | "permitSubmit"
  | "history";

type DepositStepStatus = "pending" | "loading" | "success" | "error";

type DepositStep = {
  key: DepositStepKey;
  title: string;
  description: string;
  status: DepositStepStatus;
  detail: string;
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

type DepositHistoryState = {
  requestBody: Record<string, unknown>;
  response: unknown;
  item: any;
  status: string;
};

type WithdrawStepKey = "signature" | "submit" | "progress";

type WithdrawStepStatus = "pending" | "loading" | "success" | "error";

type WithdrawStep = {
  key: WithdrawStepKey;
  title: string;
  description: string;
  status: WithdrawStepStatus;
  detail: string;
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

  for (const receipt of receiptsOutcome) {
    const logs = receipt?.outcome?.logs;
    if (!Array.isArray(logs)) continue;

    for (const log of logs) {
      if (!log || typeof log !== "string") continue;
      if (!log.startsWith("EVENT_JSON:")) continue;

      try {
        const parsedLog = JSON.parse(log.replace("EVENT_JSON:", ""));
        const signature = parsedLog?.data?.signature;
        const eventName = parsedLog?.event;

        if (
          eventName === "signature_detail" &&
          signature?.big_r?.affine_point &&
          signature?.s?.scalar &&
          typeof signature?.recovery_id === "number"
        ) {
          return signature as NearSecp256k1Signature;
        }
      } catch {
        // keep scanning other logs
      }
    }
  }

  throw new Error("Missing signature log in evm_mpc_call response");
}

function createInitialDepositSteps(): DepositStep[] {
  return [
    {
      key: "bridge",
      title: "Starting Bridge Task",
      description: "Requesting route, opening wallet, and creating trx_id",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "settlement",
      title: "Waiting for Bridge Settlement",
      description: "Checking 1Click route status",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "permitSignature",
      title: "Generating Permit Signature",
      description: "Solana proof + mapped EVM signature",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "permitSubmit",
      title: "Submitting Permit",
      description: "Calling Stableflow permit endpoint",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "history",
      title: "Confirming Deposit Status",
      description: "Polling Stableflow history",
      status: "pending",
      detail: "Waiting to start",
    },
  ];
}

function formatStableflowHistoryStatus(item: any) {
  if (!item) return "PENDING_DEPOSIT";
  if (item.status === "refunded") return "FAILED";
  if (item.status === "bridged") return "WAITING_FOR_TRANSFER";
  if (item.status === "signing") return "TRANSFERING";
  if (item.status === "success") return "TRANSFER_SUCCESS";
  if (item.permit_id && item.status === "init") return "WAITING_FOR_TRANSFER";
  if (item.status === "permit_failed") return "TRANSFER_FAILED";
  return "PENDING_DEPOSIT";
}

function createInitialWithdrawSteps(): WithdrawStep[] {
  return [
    {
      key: "signature",
      title: "Generating Withdraw Signature",
      description: "Preparing withdraw3 payload and Solana proof",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "submit",
      title: "Submitting Withdraw Request",
      description: "Sending withdraw3 action to HyperLiquid exchange",
      status: "pending",
      detail: "Waiting to start",
    },
    {
      key: "progress",
      title: "Checking Withdrawal Progress",
      description: "Polling HyperLiquid ledger updates",
      status: "pending",
      detail: "Waiting to start",
    },
  ];
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
  const [depositSteps, setDepositSteps] = useState<DepositStep[]>(
    createInitialDepositSteps()
  );
  const [depositHistoryLoading, setDepositHistoryLoading] = useState(false);
  const [depositHistoryStatusText, setDepositHistoryStatusText] = useState(
    "After permit submission, we will query Stableflow history for the final deposit status."
  );
  const [depositHistoryResult, setDepositHistoryResult] =
    useState<DepositHistoryState | null>(null);
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
  const [withdrawSteps, setWithdrawSteps] = useState<WithdrawStep[]>(
    createInitialWithdrawSteps()
  );
  const [activeWithdrawStep, setActiveWithdrawStep] =
    useState<WithdrawStepKey | null>(null);

  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<QuoteState | null>(null);

  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [statusText, setStatusText] = useState(
    "Connect a Solana wallet to start the deposit flow."
  );
  const [lastTxHash, setLastTxHash] = useState("");
  const [activeDepositStep, setActiveDepositStep] =
    useState<DepositStepKey | null>(null);

  const isSolanaConnected = !!solana.isSignedIn;

  const updateDepositStep = useCallback(
    (
      key: DepositStepKey,
      status: DepositStepStatus,
      detail?: string,
      description?: string
    ) => {
      setDepositSteps((prev) =>
        prev.map((step) =>
          step.key === key
            ? {
                ...step,
                status,
                detail: detail ?? step.detail,
                description: description ?? step.description,
              }
            : step
        )
      );
    },
    []
  );

  const resetDepositFlow = useCallback(() => {
    setDepositSteps(createInitialDepositSteps());
    setActiveDepositStep(null);
    setQuote(null);
    setReportTxResult(null);
    setPermitSignature(null);
    setPermitSubmitResult(null);
    setDepositHistoryResult(null);
    setReportTxStatusText(
      "The bridge report will be created after a successful Solana transfer."
    );
    setPermitStatusText(
      "Prepare a permit signature for the mapped EVM address."
    );
    setPermitSubmitStatusText(
      "Submit the generated permit signature to the reference backend."
    );
    setDepositHistoryStatusText(
      "After permit submission, we will query Stableflow history for the final deposit status."
    );
  }, []);

  const updateWithdrawStep = useCallback(
    (key: WithdrawStepKey, status: WithdrawStepStatus, detail?: string) => {
      setWithdrawSteps((prev) =>
        prev.map((step) =>
          step.key === key
            ? {
                ...step,
                status,
                detail: detail ?? step.detail,
              }
            : step
        )
      );
    },
    []
  );

  const resetWithdrawFlow = useCallback(() => {
    setWithdrawSteps(createInitialWithdrawSteps());
    setActiveWithdrawStep(null);
    setWithdrawSignature(null);
    setWithdrawSubmitResult(null);
    setWithdrawProgressResult(null);
    setWithdrawProgressStartTime(null);
    setWithdrawStatusText(
      "Prepare a HyperLiquid withdraw3 signature for the mapped EVM address."
    );
    setWithdrawSubmitStatusText(
      "Submit the generated withdraw3 signature to HyperLiquid exchange."
    );
    setWithdrawProgressStatusText(
      "Query withdrawal progress after the withdraw request is submitted."
    );
  }, []);

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
      setDepositHistoryResult(null);
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
      setDepositHistoryStatusText(
        "After permit submission, we will query Stableflow history for the final deposit status."
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
      setDepositSteps(createInitialDepositSteps());
      setActiveDepositStep(null);
      setWithdrawSteps(createInitialWithdrawSteps());
      setActiveWithdrawStep(null);
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

  const generatePermitSignatureWithRawValue = useCallback(
    async (rawValue: string) => {
      if (!solana.isSignedIn || !solana.accountId) {
        throw new Error("Solana wallet is not connected");
      }
      if (!mappedEvmAddress) {
        throw new Error("Mapped EVM address is not ready yet");
      }
      if (!window.solanaWallet?.signMessage) {
        throw new Error(
          "Current Solana wallet does not expose signMessage. Reconnect the wallet and try again."
        );
      }

      setPermitLoading(true);
      setPermitSignature(null);
      setPermitSubmitResult(null);
      setPermitAmount(
        ethers.utils.formatUnits(rawValue, ARBITRUM_USDC.decimals)
      );
      setPermitSubmitStatusText(
        "Submit the generated permit signature to the reference backend."
      );
      setPermitStatusText("Reading the latest USDC permit nonce...");

      try {
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
          value: rawValue,
          nonce,
          deadline,
        };

        const payload = ethers.utils._TypedDataEncoder.hash(
          domain,
          types,
          values
        );
        const payloadHex = payload.replace(/^0x/, "");

        setPermitStatusText(
          "Requesting Solana proof for the permit payload..."
        );
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
        const signatureState = {
          payload: payloadHex,
          proof,
          response: result,
          nonce,
          deadline,
          nearSignature,
          evmSignature,
        };

        setPermitSignature(signatureState);
        setPermitStatusText("Permit signature generated successfully.");
        return signatureState;
      } finally {
        setPermitLoading(false);
      }
    },
    [mappedEvmAddress, solana.accountId, solana.isSignedIn]
  );

  const submitPermitToBackend = useCallback(
    async (
      signatureState: PermitSignatureState,
      rawValue: string,
      trxId: string
    ) => {
      if (!mappedEvmAddress) {
        throw new Error("Mapped EVM address is not ready yet");
      }

      setPermitSubmitLoading(true);
      setPermitSubmitResult(null);
      setPermitSubmitStatusText("Submitting permit signature to backend...");

      try {
        const split = ethers.utils.splitSignature(signatureState.evmSignature);
        const requestBody = {
          deadline: signatureState.deadline,
          owner: mappedEvmAddress,
          r: split.r,
          s: split.s,
          spender: HYPERLIQUID_BRIDGE_SPENDER,
          token: ARBITRUM_USDC.contractAddress,
          v: split.v,
          value: rawValue,
          trx_id: trxId,
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

        const submitState = {
          requestBody,
          response: result,
        };
        setPermitSubmitResult(submitState);
        setPermitSubmitStatusText("Permit request submitted successfully.");
        return submitState;
      } finally {
        setPermitSubmitLoading(false);
      }
    },
    [mappedEvmAddress]
  );

  const fetchDepositHistoryOnce = useCallback(
    async (depositAddress: string) => {
      if (!mappedEvmAddress) {
        throw new Error("Mapped EVM address is not ready yet");
      }

      const params = new URLSearchParams({
        addr: mappedEvmAddress,
        deposit_address: depositAddress,
      });
      const requestBody = {
        addr: mappedEvmAddress,
        deposit_address: depositAddress,
      };

      const response = await fetch(
        `https://api.stableflow.ai/v1/intents/history?${params.toString()}`
      );
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.msg ||
            result?.message ||
            `History query failed with status ${response.status}`
        );
      }

      const item = result?.data?.results?.[0] || null;
      const status = formatStableflowHistoryStatus(item);
      const nextState = {
        requestBody,
        response: result,
        item,
        status,
      };
      setDepositHistoryResult(nextState);
      return nextState;
    },
    [mappedEvmAddress]
  );

  const pollDepositHistoryUntilFinal = useCallback(
    async (depositAddress: string) => {
      setDepositHistoryLoading(true);
      setDepositHistoryStatusText(
        "Polling Stableflow history for the final deposit status..."
      );

      try {
        for (let index = 0; index < 60; index += 1) {
          const result = await fetchDepositHistoryOnce(depositAddress);
          const status = result.status;

          if (status === "TRANSFER_SUCCESS") {
            setDepositHistoryStatusText(
              "Deposit confirmed successfully by Stableflow."
            );
            return result;
          }

          if (status === "FAILED" || status === "TRANSFER_FAILED") {
            setDepositHistoryStatusText(
              `Deposit failed with status: ${status}`
            );
            return result;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 5000));
        }

        throw new Error("Timed out while waiting for Stableflow history");
      } finally {
        setDepositHistoryLoading(false);
      }
    },
    [fetchDepositHistoryOnce]
  );

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
    resetDepositFlow();
    setLastTxHash("");
    setStatusText("Preparing the automatic deposit flow...");
    let currentDepositStep: DepositStepKey = "bridge";

    try {
      setActiveDepositStep("bridge");
      updateDepositStep("bridge", "loading", "Requesting 1Click quote...");
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
        amountOut: nextQuote.amountOut,
        minAmountOut: nextQuote.minAmountOut,
        amountInFormatted: nextQuote.amountInFormatted,
        amountOutFormatted: nextQuote.amountOutFormatted,
        timeEstimate: nextQuote.timeEstimate,
      });
      updateDepositStep(
        "bridge",
        "loading",
        "Quote ready. Please confirm the bridge transfer in your Solana wallet."
      );

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
      updateDepositStep(
        "bridge",
        "loading",
        "Transfer sent. Creating trx_id..."
      );

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
      updateDepositStep(
        "bridge",
        "success",
        `Bridge task created successfully. trx_id: ${trxId}`
      );
      setReportTxStatusText(
        `Bridge report created successfully. trx_id: ${trxId}`
      );
      setStatusText(
        "Bridge transfer submitted. Waiting for Intents settlement on Arbitrum..."
      );
      currentDepositStep = "settlement";
      setActiveDepositStep("settlement");
      updateDepositStep(
        "settlement",
        "loading",
        "Polling 1Click status for bridge settlement..."
      );

      const { status } = await pollingTransactionStatus(
        nextQuote.depositAddress
      );

      if (status !== "success") {
        throw new Error(`Bridge status: ${status}`);
      }
      updateDepositStep(
        "settlement",
        "success",
        "Bridge settled to the mapped EVM address."
      );

      if (!nextQuote.amountOut) {
        throw new Error("Quote is missing amountOut");
      }
      if (ethers.BigNumber.from(nextQuote.amountOut).lt("5000000")) {
        throw new Error(
          `Bridge amountOut is below HyperLiquid minimum deposit: ${ethers.utils.formatUnits(
            nextQuote.amountOut,
            ARBITRUM_USDC.decimals
          )} USDC`
        );
      }

      setStatusText("Bridge settled. Generating permit signature...");
      currentDepositStep = "permitSignature";
      setActiveDepositStep("permitSignature");
      updateDepositStep(
        "permitSignature",
        "loading",
        `Signing permit for ${ethers.utils.formatUnits(
          nextQuote.amountOut,
          ARBITRUM_USDC.decimals
        )} USDC...`
      );
      const signatureState = await generatePermitSignatureWithRawValue(
        nextQuote.amountOut
      );
      updateDepositStep(
        "permitSignature",
        "success",
        "Permit signature generated successfully."
      );

      setStatusText("Submitting permit transaction to Stableflow...");
      currentDepositStep = "permitSubmit";
      setActiveDepositStep("permitSubmit");
      updateDepositStep(
        "permitSubmit",
        "loading",
        "Calling Stableflow permit endpoint..."
      );
      await submitPermitToBackend(signatureState, nextQuote.amountOut, trxId);
      updateDepositStep(
        "permitSubmit",
        "success",
        "Permit submitted. Waiting for final deposit confirmation."
      );

      setStatusText("Permit submitted. Polling Stableflow history...");
      currentDepositStep = "history";
      setActiveDepositStep("history");
      updateDepositStep(
        "history",
        "loading",
        "Checking Stableflow history for the final deposit status..."
      );
      const historyState = await pollDepositHistoryUntilFinal(
        nextQuote.depositAddress
      );

      if (historyState.status !== "TRANSFER_SUCCESS") {
        throw new Error(
          `Stableflow history returned status ${historyState.status}`
        );
      }
      updateDepositStep(
        "history",
        "success",
        "Deposit confirmed successfully."
      );

      setStatusText("Deposit confirmed. Refreshing balances...");
      await Promise.all([
        fetchArbUsdcBalance(),
        fetchSolanaUsdcBalance(),
        fetchHyperliquidBalance(),
      ]);
      setStatusText("Deposit completed successfully.");
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Bridge failed"
      );
      const loadingStep = currentDepositStep || "bridge";
      updateDepositStep(loadingStep, "error", message);
      setStatusText(`Deposit failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setActiveDepositStep(null);
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

    try {
      await generatePermitSignatureWithRawValue(
        parseAmount(permitAmount, ARBITRUM_USDC.decimals)
      );
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

    try {
      await submitPermitToBackend(
        permitSignature,
        parseAmount(permitAmount, ARBITRUM_USDC.decimals),
        reportTxResult.trxId
      );
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

  const fetchWithdrawProgressOnce = useCallback(
    async (startTime: number) => {
      if (!mappedEvmAddress) {
        throw new Error("Mapped EVM address is not ready yet");
      }

      const requestBody = {
        type: "userNonFundingLedgerUpdates",
        user: mappedEvmAddress,
        startTime,
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

      const progressState = {
        requestBody,
        response: result,
        updates: withdrawalUpdates,
      };
      setWithdrawProgressResult(progressState);
      return progressState;
    },
    [mappedEvmAddress]
  );

  const pollWithdrawProgressUntilFound = useCallback(
    async (startTime: number) => {
      setWithdrawProgressLoading(true);
      setWithdrawProgressStatusText(
        "Withdraw submitted. Waiting for HyperLiquid ledger updates..."
      );

      try {
        for (let index = 0; index < 60; index += 1) {
          const progressState = await fetchWithdrawProgressOnce(startTime);
          if (progressState.updates.length) {
            setWithdrawProgressStatusText(
              `Found ${progressState.updates.length} withdrawal ledger update(s).`
            );
            return progressState;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 10000));
        }
        throw new Error("Timed out while waiting for withdrawal progress");
      } finally {
        setWithdrawProgressLoading(false);
      }
    },
    [fetchWithdrawProgressOnce]
  );

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

  const handleWithdraw = async () => {
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

    resetWithdrawFlow();
    setWithdrawLoading(true);
    setWithdrawStatusText("Preparing automatic withdraw flow...");
    let currentWithdrawStep: WithdrawStepKey = "signature";

    try {
      setActiveWithdrawStep("signature");
      updateWithdrawStep(
        "signature",
        "loading",
        "Requesting Solana proof and mapped EVM signature..."
      );

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
      const signatureResponse = await fetch(EVM_MPC_CALL_URL, {
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

      if (!signatureResponse.ok) {
        throw new Error(
          `evm_mpc_call failed with status ${signatureResponse.status}`
        );
      }

      const signatureResult = await signatureResponse.json();
      const nearSignature = extractNearSignatureFromMpcResult(signatureResult);
      const evmSignature = nearSignatureToEvmSignatureHex(nearSignature);

      const signatureState = {
        action,
        payload: payloadHex,
        proof,
        response: signatureResult,
        nearSignature,
        evmSignature,
      };
      setWithdrawSignature(signatureState);
      updateWithdrawStep(
        "signature",
        "success",
        "Withdraw signature generated successfully."
      );

      currentWithdrawStep = "submit";
      setActiveWithdrawStep("submit");
      setWithdrawStatusText("Submitting withdraw3 request to HyperLiquid...");
      updateWithdrawStep(
        "submit",
        "loading",
        "Sending withdraw request to HyperLiquid exchange..."
      );

      const split = ethers.utils.splitSignature(signatureState.evmSignature);
      const submitRequestBody = {
        action: signatureState.action,
        nonce: signatureState.action.time,
        signature: {
          r: split.r,
          s: split.s,
          v: split.v,
        },
      };

      const submitResponse = await fetch(HYPERLIQUID_EXCHANGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitRequestBody),
      });

      const submitResult = await submitResponse.json().catch(() => null);

      if (!submitResponse.ok) {
        throw new Error(
          submitResult?.message ||
            submitResult?.error ||
            `HyperLiquid exchange failed with status ${submitResponse.status}`
        );
      }

      setWithdrawSubmitResult({
        requestBody: submitRequestBody,
        response: submitResult,
      });
      setWithdrawSubmitStatusText("Withdraw request submitted successfully.");
      updateWithdrawStep(
        "submit",
        "success",
        "Withdraw request submitted successfully."
      );

      const progressStartTime = signatureState.action.time - 5 * 60 * 1000;
      setWithdrawProgressStartTime(progressStartTime);
      currentWithdrawStep = "progress";
      setActiveWithdrawStep("progress");
      updateWithdrawStep(
        "progress",
        "loading",
        "Polling HyperLiquid ledger updates..."
      );
      const progressState = await pollWithdrawProgressUntilFound(
        progressStartTime
      );
      updateWithdrawStep(
        "progress",
        "success",
        `Found ${progressState.updates.length} withdrawal ledger update(s).`
      );

      setWithdrawStatusText("Withdraw flow completed successfully.");
      fetchHyperliquidBalance();
    } catch (error: any) {
      const message = formatErrorMessage(
        error?.message || error?.error || "Withdraw failed"
      );
      const currentStep = currentWithdrawStep || "signature";
      updateWithdrawStep(currentStep, "error", message);
      setWithdrawStatusText(`Withdraw failed: ${message}`);
      failToast({ failText: message });
    } finally {
      setActiveWithdrawStep(null);
      setWithdrawLoading(false);
      setWithdrawSubmitLoading(false);
      setWithdrawProgressLoading(false);
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-6 py-6">
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-black">
                  Account Overview
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-50">
                  Connected wallet, mapped EVM address, and current balances.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchMappedAddress}
                disabled={!solana.accountId || mappingLoading}
                className="rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh Address
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Connected Solana Wallet
              </div>
              <div className="mt-2 text-base font-medium text-black">
                {solana.accountId ? getAccountIdUi(solana.accountId) : "-"}
              </div>
              <div className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Mapped EVM Address
              </div>
              <div className="mt-2 break-all text-sm font-medium text-black">
                {mappingLoading
                  ? "Loading mapped address..."
                  : mappedEvmAddress || "-"}
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Mapped EVM Address Balance
                </div>
                <div className="mt-3 text-4xl font-semibold text-black">
                  {balanceLoading ? "..." : arbUsdcBalance}
                </div>
                <div className="mt-1 text-sm text-gray-50">
                  USDC on Arbitrum
                </div>
                <button
                  type="button"
                  onClick={fetchArbUsdcBalance}
                  disabled={!mappedEvmAddress || balanceLoading}
                  className="mt-4 rounded-xl border border-[#d8dee5] px-3 py-2 text-sm text-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refresh Balance
                </button>
              </div>

              <div className="rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-5">
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
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-black">Deposit</h2>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-black">
                  Solana USDC Amount
                </label>
                <div className="text-sm text-gray-50">
                  Balance: {solanaBalanceLoading ? "..." : solanaUsdcBalance}{" "}
                  USDC
                </div>
              </div>
              <div className="mt-2 rounded-2xl border border-black">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-2xl px-4 py-3 text-base outline-none text-b-10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleBridge}
              disabled={bridgeLoading || !solana.accountId || !mappedEvmAddress}
              className="mt-5 w-full rounded-2xl bg-black px-4 py-3 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bridgeLoading ? "Depositing..." : "Deposit"}
            </button>

            <div className="mt-5 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Deposit Status
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

            <div className="mt-6 rounded-3xl border border-[#edf0f3] p-5">
              <div className="text-2xl font-semibold text-black">
                Deposit ongoing
              </div>
              <div className="mt-6 space-y-0">
                {depositSteps.map((step, index) => {
                  const isLast = index === depositSteps.length - 1;
                  const isSuccess = step.status === "success";
                  const isLoading = step.status === "loading";
                  const isError = step.status === "error";

                  return (
                    <div
                      key={step.key}
                      className="grid grid-cols-[56px_1fr] gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-semibold",
                            isSuccess
                              ? "border-[#12d6a0] bg-[#ecfff8] text-[#12d6a0]"
                              : "",
                            isLoading
                              ? "border-[#12d6a0] bg-[#ecfff8] text-[#12d6a0]"
                              : "",
                            isError
                              ? "border-[#ef4444] bg-[#fff1f2] text-[#ef4444]"
                              : "",
                            step.status === "pending"
                              ? "border-[#d8dee5] bg-white text-[#94a3b8]"
                              : "",
                          ].join(" ")}
                        >
                          {isSuccess ? (
                            "✓"
                          ) : isError ? (
                            "!"
                          ) : isLoading ? (
                            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#12d6a0] border-t-transparent" />
                          ) : (
                            <span className="inline-block h-5 w-5 rounded-full border-2 border-[#94a3b8] border-t-transparent" />
                          )}
                        </div>
                        {!isLast ? (
                          <div
                            className={[
                              "min-h-[44px] w-px",
                              isSuccess || isLoading
                                ? "bg-[#12d6a0]"
                                : "border-l border-dashed border-[#d8dee5]",
                            ].join(" ")}
                          />
                        ) : null}
                      </div>
                      <div className="pb-8">
                        <div className="text-[18px] font-semibold text-black">
                          {step.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-gray-50">
                          {step.description}
                        </div>
                        <div
                          className={[
                            "mt-1 text-sm",
                            isError ? "text-[#ef4444]" : "text-gray-50",
                          ].join(" ")}
                        >
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
            <div>
              <h2 className="text-2xl font-semibold text-black">Withdraw</h2>
              <p className="mt-1 text-sm leading-6 text-gray-50">
                Generate a HyperLiquid `withdraw3` signature with Solana proof,
                submit it, then poll the withdrawal progress automatically.
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
                  onClick={handleWithdraw}
                  disabled={
                    withdrawLoading ||
                    !solana.accountId ||
                    !mappedEvmAddress ||
                    Number(withdrawAmount || 0) <= 1 ||
                    !withdrawDestination
                  }
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawLoading ? "Withdrawing..." : "Withdraw"}
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

            <div className="mt-6 rounded-3xl border border-[#edf0f3] p-5">
              <div className="text-2xl font-semibold text-black">
                Withdraw ongoing
              </div>
              <div className="mt-6 space-y-0">
                {withdrawSteps.map((step, index) => {
                  const isLast = index === withdrawSteps.length - 1;
                  const isSuccess = step.status === "success";
                  const isLoading = step.status === "loading";
                  const isError = step.status === "error";

                  return (
                    <div
                      key={step.key}
                      className="grid grid-cols-[56px_1fr] gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-semibold",
                            isSuccess
                              ? "border-[#12d6a0] bg-[#ecfff8] text-[#12d6a0]"
                              : "",
                            isLoading
                              ? "border-[#12d6a0] bg-[#ecfff8] text-[#12d6a0]"
                              : "",
                            isError
                              ? "border-[#ef4444] bg-[#fff1f2] text-[#ef4444]"
                              : "",
                            step.status === "pending"
                              ? "border-[#d8dee5] bg-white text-[#94a3b8]"
                              : "",
                          ].join(" ")}
                        >
                          {isSuccess ? (
                            "✓"
                          ) : isError ? (
                            "!"
                          ) : isLoading ? (
                            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#12d6a0] border-t-transparent" />
                          ) : (
                            <span className="inline-block h-5 w-5 rounded-full border-2 border-[#94a3b8] border-t-transparent" />
                          )}
                        </div>
                        {!isLast ? (
                          <div
                            className={[
                              "min-h-[44px] w-px",
                              isSuccess || isLoading
                                ? "bg-[#12d6a0]"
                                : "border-l border-dashed border-[#d8dee5]",
                            ].join(" ")}
                          />
                        ) : null}
                      </div>
                      <div className="pb-8">
                        <div className="text-[18px] font-semibold text-black">
                          {step.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-gray-50">
                          {step.description}
                        </div>
                        <div
                          className={[
                            "mt-1 text-sm",
                            isError ? "text-[#ef4444]" : "text-gray-50",
                          ].join(" ")}
                        >
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <details className="rounded-3xl border border-[#e5e7eb] bg-white group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-black">
                  Transaction Status
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-50">
                  Raw requests and responses for deposit and withdraw debugging.
                </p>
              </div>
              <div className="text-2xl text-gray-50 transition-transform group-open:rotate-180">
                ˅
              </div>
            </summary>

            <div className="border-t border-[#edf0f3] px-6 pb-6 pt-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#edf0f3] p-5">
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
                        <div className="text-gray-50">
                          Intents deposit address
                        </div>
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

                <div className="rounded-2xl border border-[#edf0f3] p-5">
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
                      No bridge report yet. A `trx_id` will appear after the
                      Solana transfer is reported.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#edf0f3] p-5">
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
                          {JSON.stringify(
                            permitSignature.nearSignature,
                            null,
                            2
                          )}
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

                <div className="rounded-2xl border border-[#edf0f3] p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                    Latest Permit Submit
                  </div>
                  {permitSubmitResult ? (
                    <div className="mt-3 space-y-4 text-sm text-black">
                      <div>
                        <div className="text-gray-50">Request Body</div>
                        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                          {JSON.stringify(
                            permitSubmitResult.requestBody,
                            null,
                            2
                          )}
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

                <div className="rounded-2xl border border-[#edf0f3] p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                    Latest Deposit History
                  </div>
                  {depositHistoryResult ? (
                    <div className="mt-3 space-y-4 text-sm text-black">
                      <div>
                        <div className="text-gray-50">Mapped Status</div>
                        <div className="mt-1 break-all text-xs">
                          {depositHistoryResult.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-50">Request Params</div>
                        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                          {JSON.stringify(
                            depositHistoryResult.requestBody,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      <div>
                        <div className="text-gray-50">Matched Record</div>
                        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                          {JSON.stringify(depositHistoryResult.item, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-gray-50">Raw Response</div>
                        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                          {JSON.stringify(
                            depositHistoryResult.response,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-50">
                      No Stableflow history yet.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#edf0f3] p-5">
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
                          {JSON.stringify(
                            withdrawSignature.nearSignature,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-50">
                      No withdraw signature yet.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#edf0f3] p-5">
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
                          {JSON.stringify(
                            withdrawSubmitResult.response,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-50">
                      No withdraw submission yet.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#edf0f3] p-5 lg:col-span-2">
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
                          {JSON.stringify(
                            withdrawProgressResult.updates,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      <div>
                        <div className="text-gray-50">Raw Response</div>
                        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#fafbfc] p-3 text-xs text-black">
                          {JSON.stringify(
                            withdrawProgressResult.response,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-50">
                      No withdraw progress queried yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default HyperLiquidPage;
