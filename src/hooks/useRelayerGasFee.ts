import _ from "lodash";
import { useChainAppStore } from "@/stores/chainApp";
import { useAppSelector } from "@/hooks/lending/useRedux";
import { shrinkToken } from "@/utils/numbers";
import {
  getTotalAccountBalance,
  getAccountBalance,
} from "@/redux/selectors/accountSelectors";

export default function useRelayerConfigGasFee() {
  const chainAppStore = useChainAppStore();
  const relayerGasFees = chainAppStore.getRelayerGasFees();
  const totalNearMca = useAppSelector(getTotalAccountBalance);
  const availableNearMca = useAppSelector(getAccountBalance);
  const relayer_near_gas_fee_amount = relayerGasFees["near"];
  const relayer_near_gas_fee_amount_read = shrinkToken(
    relayer_near_gas_fee_amount,
    24
  );
  return {
    totalNearMca,
    availableNearMca,
    relayerGasFees,
    relayer_near_gas_fee_amount_read,
    relayer_near_gas_fee_amount,
  };
}
