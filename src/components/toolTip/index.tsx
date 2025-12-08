import React, { ReactElement, ReactNode, useState } from "react";
import { Tooltip, PlacesType } from "react-tooltip";
import { QuestionIcon, WarnIcon } from "@/components/common/Icons";
import { getRandomString } from "@/utils/common";

export function TagToolTip({ title, type }: { title: any; type?: string }) {
  const [toolTipId] = useState(getRandomString());
  return (
    <div>
      <span data-tooltip-id={toolTipId}>
        {type === "warn" ? <WarnIcon /> : <QuestionIcon />}
      </span>
      <Tooltip
        id={toolTipId}
        style={{
          borderRadius: "6px",
          color: "#5C5C5C",
          padding: "6px 8px",
          backgroundColor: "#ffffff",
        }}
        clickable
        className="border border-[#D8DCE4] max-w-[300px]"
        noArrow
      >
        {title}
      </Tooltip>
    </div>
  );
}

export function DefaultToolTip({
  tip,
  children,
  bgColor,
  clickable,
  place,
  hidden,
  className,
  openWay = "all",
}: {
  tip: string | ReactElement;
  children: string | ReactElement | ReactNode;
  bgColor?: string;
  clickable?: boolean;
  place?: PlacesType;
  hidden?: boolean;
  className?: string;
  openWay?: "click" | "hover" | "all";
}) {
  const [toolTipId] = useState(getRandomString());
  return (
    <div className={className}>
      <div data-tooltip-id={toolTipId}>{children}</div>
      <Tooltip
        id={toolTipId}
        style={{
          borderRadius: "6px",
          color: "#ffffff",
          padding: "6px 8px",
          ...(bgColor ? { backgroundColor: bgColor } : {}),
        }}
        openEvents={{
          click: openWay == "all" || openWay == "click" ? true : false,
          mouseover: openWay == "all" || openWay == "hover" ? true : false,
        }}
        className="border border-b-10 z-50"
        noArrow
        clickable={!!clickable}
        place={place}
        hidden={!!hidden}
      >
        {tip}
      </Tooltip>
    </div>
  );
}
