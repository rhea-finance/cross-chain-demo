import { useState } from "react";
import { DefaultToolTip } from "@/components/toolTip";
const CopyText = ({ text, children }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error("Copied failed:", err);
    }
  };

  return (
    <DefaultToolTip
      tip={
        <span className="text-xs">{copied ? "Copied" : "Copy address"}</span>
      }
    >
      <button onClick={copyToClipboard}>{children}</button>
    </DefaultToolTip>
  );
};

export default CopyText;
