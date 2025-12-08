import { useAccountId, useNonFarmedAssets } from "@/hooks/lending/hooks";
import { useState } from "react";
import ClaimJoinModal from "./ClaimJoinModal";

function NonFarmedAssets() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const accountId = useAccountId();
  const { hasNonFarmedAssets, hasNegativeNetLiquidity } = useNonFarmedAssets();
  const main_null = !hasNonFarmedAssets || hasNegativeNetLiquidity;
  if (!accountId) {
    return null;
  }
  if (!main_null) {
    return (
      <>
        <div className="flex max-sm:hidden items-center justify-center bg-white py-3">
          <div className="flex items-start">
            <WarnIcon className="relative top-px flex-shrink-0 text-primaryGreen" />
            <div className="text-xs text-black ml-2">
              At least one of your farms in the Mainstream has started emitting
              extra rewards. If you are seeing this warning, please click &apos;
              <span
                className="text-green-80 font-medium cursor-pointer underline"
                onClick={() => setIsOpen(true)}
              >
                Claim & Join
              </span>
              &apos; to join the new farm.
            </div>
          </div>
        </div>
        <ClaimJoinModal
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
        />
      </>
    );
  }

  return null;
}

const WarnIcon = (props: any) => {
  return (
    <svg
      {...props}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="7" cy="7" r="6.5" stroke="black" />
      <path
        d="M7.75 10.25H6.25V6.25H7.75V10.25ZM7.75 3.75V5.25H6.25V3.75H7.75Z"
        fill="black"
      />
    </svg>
  );
};

export default NonFarmedAssets;
