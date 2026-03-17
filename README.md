Website URL: https://sdkdemo.rhea.finance

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## LSD Intents 功能实现细节

LSD 页面提供「纯 Intents」桥接方式（`src/components/lsd/goIntents.tsx`），用户通过 BSC 上的 USDT / lsdUSDT 与 NEAR 上的 LSD 合约交互，全程使用 Intents 报价与跨链，无需 Wormhole。核心为两个方法：`handleSupplyBridgeByIntents`（Supply）与 `handleWithdrawBridgeByIntents`（Withdraw）。

### handleSupplyBridgeByIntents（Supply：BSC USDT → lsdUSDT）

用户输入 BSC USDT 数量，最终在 BSC 钱包收到 lsdUSDT。流程如下：

| 步骤 | 说明 |
|------|------|
| Step1 | Intents 报价：BSC USDT → NEAR（`symbol: "USDT"`, `outChainToNearChain: true`, `recipient: LSD_CONTRACT_ID`），得到 `minAmountOut`（到达 NEAR 的 USDT 量）。 |
| Step2 | 用 `formatAmount(minAmountOut, NEAR_USDT_DECIMALS)` 转为可读数量，再调用 `calculateLsdFromUsdt(...)` 得到可 mint 的 lsdUSDT 数量 `lsdAmount`（raw）。 |
| Step3 | Intents 报价：NEAR lsdUSDT → BSC（`symbol: "NRUSDT"`, `outChainToNearChain: false`, `recipient: bscAccountId`），得到 `depositAddress2`（NEAR 侧「接收 lsdUSDT 并跨回 BSC」的入口）。 |
| Step4 | Intents 报价：BSC USDT → NEAR（同上 Step1），**并传入 `customRecipientMsg: depositAddress2`**，使 LSD 合约在 NEAR 收到 USDT 后，将 mint 出的 lsdUSDT 发往 `depositAddress2`，由 Intents 跨回 BSC。得到用户实际转账用的 `depositAddress`、`amountIn`。 |
| Step5 | 用户执行 BSC 转账：`transfer_evm(BSC_USDT_ADDRESS, depositAddress, amountIn)`。 |
| Step6 | `pollingTransactionStatus(depositAddress)` 轮询状态，成功后 `fetchBalances()` 刷新余额。 |

要点：`customRecipientMsg` 将「NEAR → BSC lsdUSDT」的 Intents 入口地址绑定到「BSC → NEAR USDT」这一笔，实现「用户只转一次 USDT，最终在 BSC 收到 lsdUSDT」。

### handleWithdrawBridgeByIntents（Withdraw：BSC lsdUSDT → USDT）

用户输入要赎回的 lsdUSDT 数量（`costAmount`），最终在 BSC 钱包收到 USDT。流程如下：

| 步骤 | 说明 |
|------|------|
| Step1 | `lsdAmount = parseAmount(costAmount, LSD_USDT_DECIMALS)`。Intents 报价：BSC lsdUSDT → NEAR（`symbol: "NRUSDT"`, `outChainToNearChain: true`, `recipient: LSD_CONTRACT_ID`），得到 `minAmountOut`。 |
| Step2 | 用 `formatAmount(minAmountOut, LSD_USDT_DECIMALS)` 后调用 `calculateUsdtFromLsd(...)` 得到可赎回的 USDT 数量 `usdtAmount`。 |
| Step3 | Intents 报价：NEAR USDT → BSC（`symbol: "USDT"`, `outChainToNearChain: false`, `recipient: bscAccountId`, `refundTo: LSD_CONTRACT_ID`），得到 `depositAddress2`（NEAR 侧「接收 USDT 并跨回 BSC」的入口）。 |
| Step3' | Intents 报价：BSC lsdUSDT → NEAR（同 Step1），**并传入 `customRecipientMsg: depositAddress2`**，使 LSD 合约在 NEAR 收到 lsdUSDT 并赎回为 USDT 后，将 USDT 发往 `depositAddress2`，由 Intents 跨回 BSC。得到 `depositAddress`、`amountIn`。 |
| Step4 | 用户执行 BSC 转账：`transfer_evm(BSC_LSD_USDT_ADDRESS, depositAddress, amountIn)`。 |
| Step5 | `pollingTransactionStatus(depositAddress)` 轮询状态，成功后 `fetchBalances()` 刷新余额。 |

要点：`customRecipientMsg` 将「NEAR USDT → BSC USDT」的 Intents 入口地址绑定到「BSC lsdUSDT → NEAR」这一笔，实现「用户只转一次 lsdUSDT，最终在 BSC 收到 USDT」。

### 依赖与符号说明

- **Intents 报价**：`intentsQuotationUi`（`src/services/lending/actions/commonAction.ts`）。
- **链与符号**：`chain: "evm"`, `selectedEvmChain: "BSC"`；`USDT` 表示 BSC/NEAR 上的 USDT，`NRUSDT` 表示 lsdUSDT（NEAR 侧 LSD 代币）。
- **数量换算**：`calculateLsdFromUsdt`、`calculateUsdtFromLsd`、`formatAmount` 见 `src/services/lsd.ts`。

## LSD Omni 功能实现细节

LSD 页面还提供「Omni + Intents 混合桥接」方式（`src/components/lsd/goOmni.tsx`）。这里不是全程只走一种桥，而是根据资产类型拆开：

- `handleSupply`：BSC 上的 `USDT` 先通过 **Intents** 到达 NEAR LSD 合约，LSD 合约 mint 出的 `lsdUSDT` 再通过 **Omni** 回到 BSC。
- `handleWithdraw`：BSC 上的 `lsdUSDT` 先通过 **Omni** 到达 NEAR LSD 合约，LSD 合约赎回出的 `USDT` 再通过 **Intents** 回到 BSC。

核心为两个方法：`handleSupply`（Supply）与 `handleWithdraw`（Withdraw）。

### handleSupply（Supply：BSC USDT → lsdUSDT）

用户输入 BSC USDT 数量，最终在 BSC 钱包收到 lsdUSDT。流程如下：

| 步骤 | 说明 |
|------|------|
| Step1 | `getSupplyFlowQuote(...)` 先做第一跳 Intents 报价：BSC USDT → NEAR LSD 合约（`symbol: "USDT"`, `outChainToNearChain: true`, `recipient: LSD_CONTRACT_ID`），拿到 `minAmountOut`。 |
| Step2 | 用 `formatAmount(minAmountOut, NEAR_USDT_DECIMALS)` 转为可读数量，再调用 `calculateLsdFromUsdt(...)` 算出 LSD 合约在 NEAR 上会产出的 `lsdUSDT` 数量 `lsdAmountRaw`。 |
| Step3 | 对第二跳 Omni 做 `getOmniBridgeFee(...)`：`sender: near:${LSD_CONTRACT_ID}`、`recipient: bnb:${bscAccountId}`、`tokenAddress: near:${LSD_CONTRACT_ID}`、`amount: lsdAmountRaw`，拿到 Omni 所需的 `fee` / `native_token_fee`。 |
| Step4 | 用 `createLsdOmniInitTransferMessage(...)` 组装第二跳 Omni 参数：`recipient`、`fee`、`native_token_fee`，再通过 `createLsdOmniRecipientMsg(...)` 包成 `{"OmniBridge":"<inner-json-string>"}`，作为第一跳 Intents 的 `customRecipientMsg`。 |
| Step5 | 再做一次第一跳 Intents 报价（与 Step1 相同），但这次带上 `customRecipientMsg`，得到真正用于转账的 `depositAddress` 和 `amountIn`。 |
| Step6 | 用户执行 BSC 转账：`transfer_evm(BSC_USDT_ADDRESS, depositAddress, amountIn)`。 |
| Step7 | `pollingTransactionStatus(depositAddress)` 轮询 Intents 状态，Intents 在 NEAR 侧把 `customRecipientMsg` 交给 LSD 合约，LSD 合约据此继续发起 Omni，把 mint 出的 `lsdUSDT` 跨回 BSC。成功后 `fetchBalances()` 刷新余额。 |

要点：`handleSupply` 的关键不是前端直接调用 Omni 发第二笔交易，而是把 Omni 的第二跳参数提前编码进第一跳 Intents 的 `customRecipientMsg`，让 LSD 合约在 NEAR 收到 USDT 后自动继续执行 `lsdUSDT -> BSC`。

### handleWithdraw（Withdraw：BSC lsdUSDT → USDT）

用户输入要赎回的 lsdUSDT 数量，最终在 BSC 钱包收到 USDT。流程如下：

| 步骤 | 说明 |
|------|------|
| Step1 | `getWithdrawFlowQuote(...)` 先做第一跳 Omni 报价：BSC `lsdUSDT` → NEAR LSD 合约（`sender: bnb:${bscAccountId}`、`recipient: near:${LSD_CONTRACT_ID}`、`tokenAddress: bnb:${BSC_LSD_USDT_ADDRESS}`），拿到 `omniQuoteToNear`。 |
| Step2 | 用 `withdrawAmountRaw - Omni token fee` 得到实际到达 NEAR 的 `lsdUSDT` 数量，再通过 `calculateUsdtFromLsd(...)` 算出 LSD 合约赎回后可得到的 NEAR `USDT` 数量。 |
| Step3 | 对第二跳 Intents 做报价：NEAR `USDT` → BSC `USDT`（`symbol: "USDT"`, `outChainToNearChain: false`, `refundTo: LSD_CONTRACT_ID`, `recipient: bscAccountId`），拿到 `depositAddress`。 |
| Step4 | 用 `createLsdNearIntentsRecipientMsg(depositAddress)` 把第二跳 Intents 入口地址包成 `{"NearIntents":"depositAddress"}`，作为第一跳 Omni 的 `message`。 |
| Step5 | 用户在 BSC 上发起 Omni：`bridgeTokenByOmniFromBsc(...)`，把 `lsdUSDT` 发到 `near:${LSD_CONTRACT_ID}`，并同时带上 `fee`、`nativeFee` 和 `message`。 |
| Step6 | `pollOmniTransferStatus({ transactionHash })` 轮询第一跳 Omni 是否已经在 NEAR 侧完成。 |
| Step7 | Omni 到达 NEAR 后，LSD 合约读取 `message` 中的 `NearIntents` 信息，把赎回得到的 USDT 发往对应的 Intents `depositAddress`。前端继续 `pollingTransactionStatus(depositAddress)` 轮询第二跳 Intents，成功后 `fetchBalances()` 刷新余额。 |

要点：`handleWithdraw` 的核心是「第一跳走 Omni，第二跳走 Intents」。前端直接发的只有第一跳 Omni 交易；第二跳 Intents 依赖前面塞进 Omni `message` 里的 `depositAddress`，由 LSD 合约在 NEAR 侧继续完成。

### Omni 相关依赖与符号说明

- **Omni 报价**：`getOmniBridgeFee`（封装 `omni-bridge-sdk` 的 `OmniBridgeAPI.getFee`）。
- **Omni 发起桥接**：`bridgeTokenByOmniFromBsc`，内部会做 ERC20 `approve` 和 BSC Omni bridge contract 的 `initTransfer(...)`。
- **Omni 状态轮询**：`pollOmniTransferStatus`。
- **Omni 消息封装**：
  - `createLsdOmniInitTransferMessage`
  - `createLsdOmniRecipientMsg`
  - `createLsdNearIntentsRecipientMsg`
- **数量换算**：`calculateLsdFromUsdt`、`calculateUsdtFromLsd`、`formatAmount`、`parseAmount` 见 `src/services/lsd.ts` 和 `src/utils/chainsUtil.ts`。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
