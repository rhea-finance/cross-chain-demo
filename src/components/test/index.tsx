import React from "react";
import { Button } from "@heroui/react";
import { useChainAccountStore } from "@/stores/chainAccount";
import {
  prepareBusinessDataOnWithdrawRewards,
  getUnclaimedRewards,
  batchViewsData,
  getSimpleWithdrawData,
  format_wallet,
  serializationObj,
  NDeposit,
  TOKEN_STORAGE_DEPOSIT_READ,
  postMultichainLendingRequests,
  pollingRelayerTransactionResult,
} from "@rhea-finance/cross-chain-sdk";

const TestPage = () => {
  const chainAccountStore = useChainAccountStore();
  const mca = chainAccountStore.getMca();
  const receiveTokenId = "zec.omft.near";
  const originAsset = "1cs_v1:near:nep141:zec.omft.near";
  const destinationAsset = "nep141:zec.omft.near";
  const recipient = "t1dsFgNR2nr99MJ7Dq2Wwk3d4EnUs43ATqY";

  async function handlePrepareBusinessDataOnWithdrawRewards() {
    const { assetsView, portfolioView, config } = await batchViewsData(mca);
    const unclaimedRewards = getUnclaimedRewards({ portfolioView, assetsView });
    const unclaimedReward = unclaimedRewards[0];
    const { simpleWithdrawData } = await getSimpleWithdrawData({
      nearStorageAmount: "0.00125",
      mca,
      assets: assetsView,
      portfolio: portfolioView,
      businessNum: 2,
    });
    const res = await prepareBusinessDataOnWithdrawRewards({
      mca,
      rewardTokenId: unclaimedReward?.rewardTokenId,
      amountBurrow: unclaimedReward?.amountBurrow,
      amountToken: unclaimedReward?.amountToken,
      config,
      simpleWithdrawData,
      receiveTokenId,
      originAsset,
      destinationAsset,
      recipient,
    });
    // if (res.status == "success") {
    //   const businessMap = res.businessMap;
    //   const businessMapExtra = res.businessMapExtra;
    //   const signedBusiness = await sign_message({
    //     message: JSON.stringify(businessMap),
    //   });
    //   const signedBusinessExtra = await sign_message({
    //     message: JSON.stringify(businessMapExtra),
    //   });

    //   const wallet = format_wallet({ chain, identityKey });
    //   const relayer_result = await postMultichainLendingRequests({
    //     mca_id: mca,
    //     wallet: serializationObj(wallet),
    //     request: [
    //       serializationObj({
    //         signer_wallet: wallet,
    //         business: businessMap,
    //         signature: signedBusiness,
    //         // if reward did not registered, attach_deposit is required
    //         attach_deposit: NDeposit(TOKEN_STORAGE_DEPOSIT_READ),
    //       }),
    //       serializationObj({
    //         signer_wallet: wallet,
    //         business: businessMapExtra,
    //         signature: signedBusinessExtra,
    //         // swap out token + intents account register deposit
    //         attach_deposit: NDeposit(TOKEN_STORAGE_DEPOSIT_READ),
    //       }),
    //     ],
    //   });

    //   // Poll transaction result
    //   if (relayer_result?.code == 0) {
    //     const { status, tx_hash } = await pollingRelayerTransactionResult(
    //       relayer_result.data,
    //       2000
    //     );
    //     console.log("Transaction status:", status);
    //     console.log("Transaction hash:", tx_hash);
    //   }
    // }
  }

  return (
    <div className="p-6">
      <div className="mt-4">
        <Button
          className="px-4 py-2 bg-green-10 text-black font-semibold rounded-lg"
          onPress={handlePrepareBusinessDataOnWithdrawRewards}
        >
          Button
        </Button>
      </div>
    </div>
  );
};

export default TestPage;
