import Slidebar from "./slidebar";
import Menu from "./menu";
import NonFarmedAssets from "./NonFarmedAssets";
import { useAppStore } from "@/stores/app";
import dynamic from "next/dynamic";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isCollapse = useAppStore((s) => s.isCollapse);
  return (
    <>
      {isCollapse && <NonFarmedAssets />}
      <div className="flex items-start justify-between bg-gray-70 h-100vh">
        <Slidebar />
        <div className="flex-grow">
          {!isCollapse && <NonFarmedAssets />}
          <div
            className={`flex-grow pb-6 bg-gray-70  ${
              isCollapse ? "pt-5" : "pt-3"
            }`}
          >
            <Menu />
            <div
              className="overflow-y-auto px-6"
              style={{
                height: isCollapse
                  ? "calc(100vh - 112px)"
                  : "calc(100vh - 100px)",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
