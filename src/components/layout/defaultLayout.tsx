import React, { useEffect, useState } from "react";
import MobileLayout from "./mobileLayout";
import PcLayout from "./pcLayout";
import { isMobile } from "@/utils/device";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clientReady, setClientReady] = useState<boolean>(false);
  useEffect(() => {
    setClientReady(true);
  }, []);
  if (clientReady) {
    const mobile = isMobile();
    if (mobile) {
      return <MobileLayout>{children}</MobileLayout>;
    } else {
      return <PcLayout>{children}</PcLayout>;
    }
  }
  return null;
}
