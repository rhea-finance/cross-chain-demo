import { useAppSelector } from "./useRedux";
import { getTotalBalance } from "@/redux/selectors/getTotalBalance";

export function useProtocolNetLiquidity(withNetTvlMultiplier?: boolean) {
  const protocolDeposited = useAppSelector(
    getTotalBalance({
      source: "supplied",
      withNetTvlMultiplier,
    })
  );
  const protocolBorrowed = useAppSelector(
    getTotalBalance({
      source: "borrowed",
      withNetTvlMultiplier,
    })
  );
  const protocolNetLiquidity = protocolDeposited - protocolBorrowed;
  return { protocolDeposited, protocolBorrowed, protocolNetLiquidity };
}
