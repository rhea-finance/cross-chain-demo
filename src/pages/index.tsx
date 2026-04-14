import React, { useMemo, useState } from "react";
import LendingPage from "../components/lending";
import { ethers } from "ethers";
type SignResult = {
  account: string;
  message: string;
  hexMessage: string;
  signature: string;
};
type OwnerResult = {
  account: string;
  nextOwnerIndex: string;
  owners: Array<{
    index: number;
    type: "address" | "passkey" | "empty" | "unknown";
    raw: string;
    value?: string;
    x?: string;
    y?: string;
    length?: number;
  }>;
};
type RequestLog = {
  id: number;
  timestamp: string;
  method: string;
  params: unknown;
  result?: unknown;
  error?: string;
};
type DebugInfo = {
  provider: {
    isCoinbaseWallet?: boolean;
    isCoinbaseBrowser?: boolean;
    selectedAddress?: string;
    chainId?: string;
    networkVersion?: string;
    hasProvidersArray: boolean;
    providersCount: number;
    providerKeys: string[];
    relayProviderType?: string;
    relayType?: string;
    diagnostic?: unknown;
  };
  request: {
    method: string;
    params: unknown[];
    message: string;
    hexMessage: string;
    account: string;
  };
  decoded: Record<string, unknown>;
};
const Lending = () => {
  const [signLoading, setSignLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [signError, setSignError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [ownerResult, setOwnerResult] = useState<OwnerResult | null>(null);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const appendLog = (log: RequestLog) => {
    setRequestLogs((prev) => [log, ...prev].slice(0, 50));
  };
  const hexToBytes = (hex: string) => {
    const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
    return Uint8Array.from(
      normalized.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
  };
  const bytesToHex = (bytes: Uint8Array) =>
    `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  const readWord = (bytes: Uint8Array, offset: number) => {
    return BigInt(bytesToHex(bytes.slice(offset, offset + 32)));
  };
  const readDynamicBytes = (bytes: Uint8Array, offsetWord: number) => {
    const relative = Number(readWord(bytes, offsetWord));
    const len = Number(readWord(bytes, relative));
    return bytes.slice(relative + 32, relative + 32 + len);
  };
  const tryDecodeInnerSignature = (signatureHex: string) => {
    try {
      const bytes = hexToBytes(signatureHex);
      const erc6492Magic =
        "6492649264926492649264926492649264926492649264926492649264926492";
      const hex = signatureHex.startsWith("0x")
        ? signatureHex.slice(2)
        : signatureHex;
      let outerBytes = bytes;
      if (hex.endsWith(erc6492Magic)) {
        outerBytes = bytes.slice(0, bytes.length - 32);
      }
      const prepareTo = bytesToHex(outerBytes.slice(12, 32));
      const prepareData = readDynamicBytes(outerBytes, 32);
      const nestedSignature = readDynamicBytes(outerBytes, 64);
      let current = nestedSignature;
      for (let i = 0; i < 4; i += 1) {
        const first = Number(readWord(current, 0));
        const second = Number(readWord(current, 32));
        if (second === 64) break;
        if (first === 32) {
          current = current.slice(32);
          continue;
        }
        const maybe = readDynamicBytes(current, 0);
        if (maybe.length === current.length) break;
        current = maybe;
      }
      const ownerIndex = Number(readWord(current, 0));
      const signatureData = readDynamicBytes(current, 32);
      let payload = signatureData;
      const payloadFirst = Number(readWord(payload, 0));
      if (payloadFirst === 32) {
        payload = payload.slice(32);
      }
      const authenticatorData = readDynamicBytes(payload, 0);
      const clientDataJSONBytes = readDynamicBytes(payload, 32);
      const challengeIndex = Number(readWord(payload, 64));
      const typeIndex = Number(readWord(payload, 96));
      const r = bytesToHex(payload.slice(128, 160));
      const s = bytesToHex(payload.slice(160, 192));
      const clientDataJSON = new TextDecoder().decode(clientDataJSONBytes);
      let observedChallenge: string | null = null;
      try {
        const parsed = JSON.parse(clientDataJSON);
        if (parsed?.challenge) {
          const b64 = parsed.challenge.replace(/-/g, "+").replace(/_/g, "/");
          const pad = "=".repeat((4 - (b64.length % 4)) % 4);
          const raw = atob(b64 + pad);
          const challengeBytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
          observedChallenge = bytesToHex(challengeBytes);
        }
      } catch {}
      return {
        prepareTo,
        prepareData: bytesToHex(prepareData),
        innerSignature: bytesToHex(current),
        ownerIndex,
        authenticatorData: bytesToHex(authenticatorData),
        clientDataJSON,
        challengeIndex,
        typeIndex,
        r,
        s,
        observedChallenge,
      };
    } catch (error: any) {
      return {
        decodeError: error?.message || String(error),
      };
    }
  };
  const getProviderDebugInfo = async (injected: any) => {
    const keys = Object.keys(injected || {}).sort();
    const diagnostic =
      typeof injected?.diagnostic === "function"
        ? await injected.diagnostic()
        : null;
    return {
      isCoinbaseWallet: injected?.isCoinbaseWallet,
      isCoinbaseBrowser: injected?.isCoinbaseBrowser,
      selectedAddress: injected?.selectedAddress,
      chainId: injected?.chainId,
      networkVersion: injected?.networkVersion,
      hasProvidersArray: Array.isArray(injected?.providers),
      providersCount: Array.isArray(injected?.providers)
        ? injected.providers.length
        : 0,
      providerKeys: keys,
      relayProviderType: injected?._relayProvider?.constructor?.name,
      relayType: injected?._relay?.constructor?.name,
      diagnostic,
    };
  };
  const trackedRequest = async ({
    injected,
    method,
    params,
  }: {
    injected: any;
    method: string;
    params?: unknown[];
  }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();
    try {
      const result = await injected.request({
        method,
        params,
      });
      appendLog({
        id,
        timestamp,
        method,
        params,
        result,
      });
      return result;
    } catch (error: any) {
      appendLog({
        id,
        timestamp,
        method,
        params,
        error: error?.message || String(error),
      });
      throw error;
    }
  };
  const getInjectedProvider = async () => {
    const injected = (window as any)?.ethereum;
    if (!injected?.request) {
      throw new Error(
        "window.ethereum is not available. Open this page inside the Base app webview and try again."
      );
    }
    const accounts = await trackedRequest({
      injected,
      method: "eth_requestAccounts",
    });
    if (!Array.isArray(accounts) || !accounts[0]) {
      throw new Error("No Base account is available.");
    }
    return {
      injected,
      account: accounts[0] as string,
      provider: new ethers.providers.Web3Provider(injected),
    };
  };
  const handlePersonalSign = async () => {
    setSignLoading(true);
    setSignError("");
    try {
      const { injected, account } = await getInjectedProvider();
      const message = "one two three";
      const hexMessage = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(message)
      );
      const signature = await trackedRequest({
        injected,
        method: "personal_sign",
        params: [hexMessage, account],
      });
      const decoded = tryDecodeInnerSignature(signature);
      setDebugInfo({
        provider: await getProviderDebugInfo(injected),
        request: {
          method: "personal_sign",
          params: [hexMessage, account],
          message,
          hexMessage,
          account,
        },
        decoded,
      });
      setSignResult({
        account,
        message,
        hexMessage,
        signature,
      });
    } catch (error: any) {
      setSignError(error?.message || "personal_sign failed");
    } finally {
      setSignLoading(false);
    }
  };
  const decodeOwner = (raw: string) => {
    if (!raw || raw === "0x") {
      return {
        type: "empty" as const,
        raw,
      };
    }
    const bytes = ethers.utils.arrayify(raw);
    const abiCoder = ethers.utils.defaultAbiCoder;
    if (bytes.length === 32) {
      const [address] = abiCoder.decode(["address"], raw);
      return {
        type: "address" as const,
        raw,
        value: address,
      };
    }
    if (bytes.length === 64) {
      const [x, y] = abiCoder.decode(["bytes32", "bytes32"], raw);
      return {
        type: "passkey" as const,
        raw,
        x,
        y,
      };
    }
    return {
      type: "unknown" as const,
      raw,
      length: bytes.length,
    };
  };
  const handleQueryOwners = async () => {
    setOwnerLoading(true);
    setOwnerError("");
    try {
      const { account, provider } = await getInjectedProvider();
      const contract = new ethers.Contract(
        account,
        [
          "function nextOwnerIndex() view returns (uint256)",
          "function ownerAtIndex(uint256) view returns (bytes)",
        ],
        provider
      );
      const nextOwnerIndexBn = await contract.nextOwnerIndex();
      const nextOwnerIndex = nextOwnerIndexBn.toNumber();
      const owners = [] as OwnerResult["owners"];
      for (let index = 0; index < nextOwnerIndex; index += 1) {
        const raw = await contract.ownerAtIndex(index);
        owners.push({
          index,
          ...decodeOwner(raw),
        });
      }
      setOwnerResult({
        account,
        nextOwnerIndex: nextOwnerIndexBn.toString(),
        owners,
      });
    } catch (error: any) {
      setOwnerError(error?.message || "Owner query failed");
    } finally {
      setOwnerLoading(false);
    }
  };
  const handleCopy = async (key: string, value: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        throw new Error("Clipboard is not available");
      }
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1500);
    } catch (error) {
      console.error("copy failed", error);
    }
  };
  const renderCopyButton = (key: string, value: string) => (
    <button
      type="button"
      onClick={() => handleCopy(key, value)}
      className="rounded-full border border-[#d8dee5] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-50 transition-colors hover:bg-white"
    >
      {copiedKey === key ? "Copied" : "Copy"}
    </button>
  );
  const prettyLogs = useMemo(
    () =>
      requestLogs.map((log) => ({
        ...log,
        params:
          typeof log.params === "undefined"
            ? undefined
            : JSON.stringify(log.params, null, 2),
        result:
          typeof log.result === "undefined"
            ? undefined
            : JSON.stringify(log.result, null, 2),
      })),
    [requestLogs]
  );
  return (
    <div className="relative">
      <LendingPage />
      <div className="hidden fixed bottom-6 right-6 z-20 h-[70vh] w-[360px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-3xl border border-[#d8dee5] bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-50">
          Base personal_sign
        </div>
        <div className="mt-2 text-sm leading-6 text-black">
          Test the Base app webview provider by calling `personal_sign` with a
          hex-encoded message.
        </div>
        <button
          type="button"
          onClick={handlePersonalSign}
          disabled={signLoading}
          className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signLoading ? "Signing..." : "Test personal_sign"}
        </button>
        <button
          type="button"
          onClick={handleQueryOwners}
          disabled={ownerLoading}
          className="mt-3 w-full rounded-2xl border border-[#d8dee5] bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ownerLoading ? "Querying owners..." : "Query Smart Wallet Owners"}
        </button>
        {signError ? (
          <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm leading-6 text-[#b91c1c]">
            {signError}
          </div>
        ) : null}
        {ownerError ? (
          <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm leading-6 text-[#b91c1c]">
            {ownerError}
          </div>
        ) : null}
        {signResult ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4 text-sm text-black h-[30vh] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Account
                </div>
                {renderCopyButton("sign-account", signResult.account)}
              </div>
              <div className="mt-1 break-all text-xs">{signResult.account}</div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Message
                </div>
                {renderCopyButton("sign-message", signResult.message)}
              </div>
              <div className="mt-1 break-all text-xs">{signResult.message}</div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Hex Message
                </div>
                {renderCopyButton("sign-hex-message", signResult.hexMessage)}
              </div>
              <div className="mt-1 break-all text-xs">
                {signResult.hexMessage}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Signature
                </div>
                {renderCopyButton("sign-signature", signResult.signature)}
              </div>
              <div className="mt-1 break-all text-xs">
                {signResult.signature}
              </div>
            </div>
          </div>
        ) : null}
        {ownerResult ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4 text-sm text-black max-h-[30vh] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  Owner Query Account
                </div>
                {renderCopyButton("owner-account", ownerResult.account)}
              </div>
              <div className="mt-1 break-all text-xs">
                {ownerResult.account}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                  nextOwnerIndex
                </div>
                {renderCopyButton(
                  "owner-next-index",
                  ownerResult.nextOwnerIndex
                )}
              </div>
              <div className="mt-1 break-all text-xs">
                {ownerResult.nextOwnerIndex}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
                Owners
              </div>
              <div className="mt-2 space-y-3">
                {ownerResult.owners.map((owner) => (
                  <div
                    key={`${owner.index}-${owner.raw}`}
                    className="rounded-2xl border border-[#edf0f3] bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-medium text-black">
                        index {owner.index} · {owner.type}
                      </div>
                      {renderCopyButton(`owner-raw-${owner.index}`, owner.raw)}
                    </div>
                    {owner.value ? (
                      <div className="mt-1 break-all text-xs text-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <span>address: {owner.value}</span>
                          {renderCopyButton(
                            `owner-value-${owner.index}`,
                            owner.value
                          )}
                        </div>
                      </div>
                    ) : null}
                    {owner.x ? (
                      <div className="mt-1 break-all text-xs text-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <span>x: {owner.x}</span>
                          {renderCopyButton(`owner-x-${owner.index}`, owner.x)}
                        </div>
                      </div>
                    ) : null}
                    {owner.y ? (
                      <div className="mt-1 break-all text-xs text-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <span>y: {owner.y}</span>
                          {renderCopyButton(`owner-y-${owner.index}`, owner.y)}
                        </div>
                      </div>
                    ) : null}
                    {typeof owner.length === "number" ? (
                      <div className="mt-1 break-all text-xs text-gray-50">
                        length: {owner.length}
                      </div>
                    ) : null}
                    <div className="mt-1 break-all text-xs text-gray-50">
                      raw: {owner.raw}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {debugInfo ? (
          <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4 text-sm text-black max-h-[30vh] overflow-y-auto">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
              <div className="flex items-center justify-between gap-3">
                <span>Debug Info</span>
                {renderCopyButton(
                  "debug-info",
                  JSON.stringify(debugInfo, null, 2)
                )}
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-all text-[11px]">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        ) : null}
        {prettyLogs.length ? (
          <div className="mt-4 rounded-2xl border border-[#edf0f3] bg-[#fafbfc] p-4 text-sm text-black max-h-[30vh] overflow-y-auto">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-50">
              Provider Request Logs
            </div>
            <div className="mt-3 space-y-3">
              {prettyLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-[#edf0f3] bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-black">
                      {log.method}
                    </div>
                    {renderCopyButton(
                      `log-all-${log.id}`,
                      JSON.stringify(log, null, 2)
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-50">
                    {log.timestamp}
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-50">
                      <span>Params</span>
                      {renderCopyButton(
                        `log-params-${log.id}`,
                        log.params ?? "undefined"
                      )}
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-all text-[11px]">
                      {log.params ?? "undefined"}
                    </pre>
                  </div>
                  {typeof log.result !== "undefined" ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-50">
                        <span>Result</span>
                        {renderCopyButton(`log-result-${log.id}`, log.result)}
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[11px]">
                        {log.result}
                      </pre>
                    </div>
                  ) : null}
                  {log.error ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#b91c1c]">
                        <span>Error</span>
                        {renderCopyButton(`log-error-${log.id}`, log.error)}
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] text-[#b91c1c]">
                        {log.error}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default Lending;
