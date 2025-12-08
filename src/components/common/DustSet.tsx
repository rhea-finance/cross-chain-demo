import { useEffect, useState } from "react";
import { cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAppSelector, useAppDispatch } from "@/hooks/lending/useRedux";
import { getShowDust } from "@/redux/selectors/appSelectors";
import { toggleShowDust } from "@/redux/slice/appSlice";

const Set = () => {
  const [hover, setHover] = useState<boolean>(false);
  function show() {
    setHover(true);
  }
  function hide() {
    setHover(false);
  }
  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      className="relative flex items-center justify-center w-[34px] h-[34px] border border-gray-30 bg-white rounded-md cursor-pointer max-sm:w-[28px] max-sm:h-[28px]"
    >
      <Icon
        icon="ep:setting"
        className={`text-xl max-sm:text-lg ${
          hover ? "text-black" : "text-black/50"
        }`}
      />
      <SetList hover={hover} />
    </div>
  );
};
function SetList({ hover }: { hover: boolean }) {
  const dispatch = useAppDispatch();
  const showDust = useAppSelector(getShowDust);
  const handleToggleShowDust = () => {
    dispatch(toggleShowDust());
  };
  useEffect(() => {
    const _dust = localStorage.getItem("DUST_LABEL");
    if (!_dust && showDust) {
      dispatch(toggleShowDust());
      localStorage.setItem("DUST_LABEL", "HIDDEN");
    }
  }, []);
  return (
    <Box className={`${hover ? "" : "hidden"}`}>
      <Item label="Show Dust">
        <SliderButton active={showDust} onClick={handleToggleShowDust} />
      </Item>
    </Box>
  );
}

function Box({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="absolute right-0 top-8 pt-2 z-50">
      <div
        className={cn(
          "border border-gray-30 rounded-md bg-white p-4 min-w-[200px]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
function Item({ children, label }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-black">{label}</span>
      {children}
    </div>
  );
}
function SliderButton({ active, ...rest }: { active: boolean; onClick: any }) {
  return (
    <div
      {...rest}
      className={`flex items-center h-5 w-9 rounded-xl p-0.5 cursor-pointer border border-gray-30 transition-all ${
        active ? "bg-green-10" : "bg-white"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full flex-shrink-0 ${
          active ? "bg-[#525365] shadow-100 ml-[14px]" : "bg-gray-30"
        }`}
      />
    </div>
  );
}
export default Set;
