import { useAppSelector } from "./useRedux";
import { getAverageAPY } from "@/redux/selectors/getAverageAPY";

export const useAverageAPY = () => {
  const { averageSupplyApy, averageBorrowedApy } =
    useAppSelector(getAverageAPY);
  return { averageSupplyApy, averageBorrowedApy };
};
