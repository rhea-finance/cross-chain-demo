import { useState, useEffect } from "react";

export const isMobile = (): boolean => {
  if (typeof window !== "undefined" && window.document) {
    return window.document.documentElement.clientWidth <= 1023;
  }
  // need useagent
  return false;
};

export const isPC = (): boolean => {
  return document.documentElement.clientWidth > 1023;
};

export const isLargeScreen = (): boolean => {
  return document.documentElement.clientWidth > 2000;
};

export const isClientMobie = (): boolean => {
  return document.documentElement.clientWidth <= 1023;
};

export const useLargeScreen = () => {
  const [largeWindow, setLargeWindow] = useState<boolean>(isLargeScreen());

  const handleResize = () => setLargeWindow(isLargeScreen());

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return largeWindow;
};

export const useMobile = () => {
  const [mobileWindow, setMobileWindow] = useState<boolean>(isMobile());

  const handleResize = () => setMobileWindow(isMobile());

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return mobileWindow;
};

export const useClientMobile = () => {
  const [mobileWindow, setMobileWindow] = useState<boolean>(isClientMobie());

  const handleResize = () => setMobileWindow(isClientMobie());

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return mobileWindow;
};

export enum ExplorerType {
  Chrome = "Chrome",
  Firefox = "Firefox",
  Opera = "Opera",
  Safari = "Safari",
}

export const getExplorer = () => {
  if (typeof window == "undefined") {
    return ExplorerType.Chrome;
  }
  const explorer = window.navigator.userAgent;
  if (explorer.indexOf("MSIE") >= 0) {
    return "ie";
  } else if (explorer.indexOf("Firefox") >= 0) {
    return ExplorerType.Firefox;
  } else if (explorer.indexOf("Chrome") >= 0) {
    return ExplorerType.Chrome;
  } else if (explorer.indexOf("Opera") >= 0) {
    return ExplorerType.Opera;
  } else if (explorer.indexOf("Safari") >= 0) {
    return ExplorerType.Safari;
  }
};

export const isMobileExplorer = () =>
  /Mobi|Android|iPhone/i.test(window.navigator.userAgent);
