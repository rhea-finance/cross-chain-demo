import { Img } from "@/components/common/img";
import { Icon } from "@iconify/react";
import { useAppStore } from "@/stores/app";
import Assets from "@/components/assets";
export default function Slidebar() {
  const appStore = useAppStore();
  const isCollapse = appStore.getIsCollapse();

  function switchEvent() {
    appStore.setIsCollapse(!isCollapse);
  }

  return (
    <div
      className={`relative h-[100vh] flex-shrink-0 px-5 py-6 transition-all ease-in-out z-[100001] overflow-y-auto ${
        isCollapse ? "w-[120px]" : "w-[300px] bg-black"
      }`}
    >
      <div className="flex items-center gap-2.5 text-white">
        <Img path={`${isCollapse ? "rhea-logo-black.svg" : "rhea-logo.svg"}`} />
        <span
          className={`text-xl paceGrotesk-Bold  ${
            isCollapse ? "text-black" : ""
          }`}
        >
          RHEA
        </span>
      </div>
      {/* collapse */}
      <div
        className={`flex flex-col absolute left-0 top-1/2  -translate-y-[120px] items-center justify-center w-[50px]  bg-black rounded-r-3xl cursor-pointer pb-4 ${
          isCollapse ? "" : "hidden"
        }`}
        onClick={switchEvent}
      >
        <div className="flex items-center gap-2 rotate-90 h-[160px]">
          <Img path="muti-wallet-icon.svg" />
          <span className="text-white text-xl whitespace-nowrap">
            YOUR ASSETS
          </span>
        </div>
      </div>
      {/* expand */}
      <div className={`${isCollapse ? "hidden" : ""}`}>
        <div className="flex items-center justify-end">
          <span
            className="flex items-center cursor-pointer gap-1"
            onClick={switchEvent}
          >
            <Icon icon="mynaui:arrow-left" className="text-green-10 text-xl" />
            <span className="text-green-10 text-sm">Hide</span>
          </span>
        </div>
        <Assets />
      </div>
    </div>
  );
}
