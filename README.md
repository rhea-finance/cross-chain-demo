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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
