import React from "react";
import { CircleIcon, CircleIconLarge, BeatLoading } from "./icon";
import { getRPCList } from "@/utils/rpc";
export const MAXELOADTIMES = 3;

export const switchPoint = (chooseEndPoint: string) => {
  localStorage.setItem("endPoint", chooseEndPoint);
  window.location.reload();
};
export const displayCurrentRpc = (
  responseTimeList: any,
  key: any,
  inBox?: boolean
) => {
  if (responseTimeList[key] == -1) {
    return (
      <>
        <span className={`cursor-pointer text-red-10`}>
          {inBox ? (
            <CircleIconLarge></CircleIconLarge>
          ) : (
            <CircleIcon></CircleIcon>
          )}
        </span>
        <label className="text-xs ml-1.5 mr-2.5 cursor-pointer text-red-10 whitespace-nowrap">
          time out
        </label>
      </>
    );
  } else if (responseTimeList[key]) {
    return (
      <>
        <span className="cursor-pointer text-green-10">
          {inBox ? (
            <CircleIconLarge></CircleIconLarge>
          ) : (
            <CircleIcon></CircleIcon>
          )}
        </span>
        <label className="text-xs text-default-500 ml-1.5 mr-2.5 cursor-pointer whitespace-nowrap">
          {responseTimeList[key]}ms
        </label>
      </>
    );
  } else {
    return (
      <label className="mr-2.5 whitespace-nowrap">
        <BeatLoading />
      </label>
    );
  }
};
export const specialRpcs: string[] = [
  "https://near-mainnet.infura.io/v3",
  "https://gynn.io",
];
export async function ping(url: string, key: string) {
  const RPCLIST = getRPCList();
  const start = new Date().getTime();
  const businessRequest = fetch(url, {
    method: "POST",
    headers: { "Content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "gas_price",
      params: [null],
    }),
  });
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(-1);
    }, 8000);
  });
  const responseTime = await Promise.race([businessRequest, timeoutPromise])
    .then(() => {
      const end = new Date().getTime();
      return end - start;
    })
    .catch((result) => {
      if (result == -1) {
        // timeout
        return -1;
      } else {
        // other exception
        const currentRpc = localStorage.getItem("endPoint") || "defaultRpc";
        if (currentRpc != key) {
          return -1;
        } else {
          const availableRpc =
            Object.keys(RPCLIST).find((item) => item != key) || "defaultRpc";
          let reloadedTimes = Number(
            localStorage.getItem("rpc_reload_number") || 0
          );
          setTimeout(() => {
            reloadedTimes = reloadedTimes + 1;
            if (reloadedTimes > MAXELOADTIMES) {
              localStorage.setItem("endPoint", "defaultRpc");
              localStorage.setItem("rpc_reload_number", "");
              return -1;
            } else {
              localStorage.setItem("endPoint", availableRpc);
              window.location.reload();
              localStorage.setItem(
                "rpc_reload_number",
                reloadedTimes.toString()
              );
            }
          }, 1000);
        }
      }
    });
  return responseTime;
}
export async function pingChain(url: string) {
  const start = new Date().getTime();
  let status;
  let responseTime;
  let chain_id;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "status",
        params: [],
      }),
    })
      .then((res) => {
        return res.json();
      })
      .catch(() => {
        return {};
      });
    if (res?.result?.chain_id) {
      const end = new Date().getTime();
      responseTime = end - start;
      status = true;
      chain_id = res.result.chain_id;
    }
  } catch {
    status = false;
  }
  return {
    status,
    responseTime,
    chain_id,
  };
}
export function trimStr(str: string = "") {
  return str.replace(/(^\s*)|(\s*$)/g, "");
}
export async function ping_gas(url: string) {
  const start = new Date().getTime();
  const businessRequest = fetch(url, {
    method: "POST",
    headers: { "Content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "gas_price",
      params: [null],
    }),
  });
  let r;
  try {
    r = await businessRequest;
    if (r?.status == 200) {
      r = true;
    } else {
      r = false;
    }
  } catch (error) {
    r = false;
  }
  const end = new Date().getTime();
  const responseTime = end - start;
  return {
    status: !!r,
    responseTime,
  };
}
