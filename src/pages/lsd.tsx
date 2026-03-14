import React, { useState } from "react";
import LSDPage from "../components/lsd/goWormhole";
import LSDPageIntents from "../components/lsd/goIntents";

type TabId = "wormhole" | "intents";

const LSD = () => {
  const [tab, setTab] = useState<TabId>("wormhole");

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-4 max-w-2xl">
        <div className="flex gap-2 mb-4 rounded-xl bg-gray-80 p-1">
          <button
            type="button"
            onClick={() => setTab("wormhole")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "wormhole"
                ? "bg-white text-black shadow-sm"
                : "text-gray-50 hover:text-black"
            }`}
          >
            Wormhole
          </button>
          <button
            type="button"
            onClick={() => setTab("intents")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "intents"
                ? "bg-white text-black shadow-sm"
                : "text-gray-50 hover:text-black"
            }`}
          >
            Intents
          </button>
        </div>
      </div>
      {tab === "wormhole" ? <LSDPage /> : <LSDPageIntents />}
    </div>
  );
};

export default LSD;
