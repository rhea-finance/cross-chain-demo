import React from "react";
import MobileMenu from "./mobileMenu";
import MobileSlidebar from "./mobileSlidebar";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-gray-70 overflow-y-hidden">
      <MobileMenu />
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-20">{children}</div>
      <MobileSlidebar />
    </div>
  );
}
