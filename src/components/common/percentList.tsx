import { useEffect, useState } from "react";

export default function PercentList({
  onChange,
  clear,
}: {
  onChange: (v: number) => void;
  clear: number;
}) {
  const [selectedValue, setSelectedValue] = useState<number>();
  const [tabList] = useState([
    {
      id: 25,
      label: "25%",
    },
    {
      id: 50,
      label: "50%",
    },
    {
      id: 75,
      label: "75%",
    },
    {
      id: 100,
      label: "Max",
    },
  ]);
  useEffect(() => {
    if (clear > 0) {
      setSelectedValue(null);
    }
  }, [clear]);
  return (
    <div className="flex items-center gap-1">
      {tabList.map((tab) => {
        const selected = tab.id == selectedValue;
        return (
          <span
            key={tab.id}
            className={`flex items-center justify-center h-5 rounded cursor-pointer text-xs text-black  px-1 w-[36px] bg-gray-80 hover:bg-opacity-20 hover:text-opacity-80 ${
              selected ? "border border-primaryGreen" : ""
            }`}
            onClick={() => {
              onChange(tab.id);
              setSelectedValue(tab.id);
            }}
          >
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}
