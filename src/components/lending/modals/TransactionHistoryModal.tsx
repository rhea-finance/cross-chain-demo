import React, { useState } from "react";
import { DefaultModal } from "@/components/common/modal";
import Records from "../yours/records";
import Liquidations from "../yours/liquidations";
import { CloseButton } from "../actionModal/components";

export default function TransactionHistoryModal({ isOpen, onRequestClose }) {
  const [selectedTab, setSelectedTab] = useState<string>("records");
  const [tabList] = useState([
    {
      id: "records",
      label: "Records",
    },
    {
      id: "liquidation",
      label: "Liquidation",
    },
  ]);
  function changeTab(tab: string) {
    setSelectedTab(tab);
  }
  return (
    <DefaultModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div className="bg-white rounded-2xl p-[30px] w-[800px] max-sm:w-[95vw]">
        {/* Tab */}
        <div className="flex items-start justify-between border-b border-gray-140">
          <div className="flex items-center text-base paceGrotesk-Bold space-x-6">
            {tabList.map((tab) => {
              return (
                <span
                  onClick={() => {
                    changeTab(tab.id);
                  }}
                  key={tab.id}
                  className={`pb-3 cursor-pointer ${
                    selectedTab == tab.id
                      ? "text-black border-b border-green-10"
                      : "border-b border-transparent text-gray-50"
                  }`}
                >
                  {tab.label}
                </span>
              );
            })}
          </div>
          <CloseButton onClose={onRequestClose} className="cursor-pointer" />
        </div>
        {/* content */}
        <Records hidden={selectedTab !== "records"} />
        <Liquidations hidden={selectedTab !== "liquidation"} />
      </div>
    </DefaultModal>
  );
}
