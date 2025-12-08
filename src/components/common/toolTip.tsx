import React from "react";
import { Tooltip } from "@heroui/react";
import { ReactElement, ReactNode, useState } from "react";
import { QuestionIcon, WarnIcon } from "./Icons";
import { getRandomString } from "@/utils/common";

interface DefaultToolTipProps {
  tip: string | ReactElement;
  children: string | ReactElement | ReactNode;
  bgColor?: string;
  clickable?: boolean;
  place?: "top" | "bottom" | "left" | "right";
  hidden?: boolean;
  className?: string;
  openWay?: "click" | "hover" | "all";
}

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
          color: "#6A7279",
          padding: "6px 8px",
        }}
        className="border border-white/10 bg-[#16161B] max-w-[300px]"
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
}: DefaultToolTipProps) {
  return (
    <div className={className}>
      <Tooltip
        content={<div className="text-gray-110 text-xs max-w-sm">{tip}</div>}
      >
        {children}
      </Tooltip>
    </div>
  );
}
