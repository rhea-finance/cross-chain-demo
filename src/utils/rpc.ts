export function getRpcSelectorList(
  env: string | undefined = process.env.NEXT_PUBLIC_NEAR_ENV
) {
  switch (env) {
    case "pub-testnet":
      return {
        RPC_LIST: {
          defaultRpc: {
            url: "https://rpc.testnet.near.org",
            simpleName: "official rpc",
          },
          lavaRpc: {
            url: "https://g.w.lavanet.xyz/gateway/neart/rpc-http/a6e88c7710da77f09430aacd6328efd6",
            simpleName: "lava rpc",
          },
        },
        pool_protocol: "indexer",
      };
    case "testnet":
      return {
        RPC_LIST: {
          defaultRpc: {
            url: "https://test.rpc.fastnear.com?apiKey=REFpc6qiYlxy50aFiewVsv14KWEQA2KYtbl1ZAXlh2iq",
            simpleName: "test rpc",
          },
          officialRpc: {
            url: "https://rpc.testnet.near.org",
            simpleName: "official rpc",
          },
          lavaRpc: {
            url: "https://g.w.lavanet.xyz/gateway/neart/rpc-http/a6e88c7710da77f09430aacd6328efd6",
            simpleName: "lava rpc",
          },
        },
        pool_protocol: "indexer",
      };
    default:
      return {
        RPC_LIST: {
          defaultRpc: {
            url: "https://near.lava.build",
            simpleName: "lava rpc",
          },
          deltaRpc: {
            url: "https://nearinner.deltarpc.com",
            simpleName: "delta rpc",
          },
          fastRpc: {
            url: "https://free.rpc.fastnear.com",
            simpleName: "fastnear rpc",
          },
        },
        pool_protocol: "indexer",
      };
  }
}
export function getCustomAddRpcSelectorList() {
  let customRpcMapStr: string | null = null;
  try {
    customRpcMapStr = window.localStorage.getItem("customRpcList");
  } catch (error) {}

  let customRpcMap: CustomRpcMap = {};
  if (customRpcMapStr) {
    try {
      customRpcMap = JSON.parse(customRpcMapStr);
    } catch (error) {}
  }
  return customRpcMap;
}

export const getRPCList = () => {
  const RPCLIST_system = getRpcSelectorList().RPC_LIST;
  const RPCLIST_custom = getCustomAddRpcSelectorList();
  const RPCLIST = Object.assign(RPCLIST_system, RPCLIST_custom);
  return RPCLIST;
};

export function getSelectedRpc() {
  const rpclist = getRPCList();
  let endPoint = "defaultRpc";
  try {
    endPoint = window.localStorage.getItem("endPoint") || endPoint;
    if (!rpclist[endPoint]) {
      endPoint = "defaultRpc";
      localStorage.removeItem("endPoint");
    }
  } catch (error) {}
  const urlList = Object.values(rpclist).map((rpc) => rpc.url);
  const selectedUrl = rpclist[endPoint].url;
  urlList.sort((a, b) => {
    if (a == selectedUrl) return -1;
    if (b == selectedUrl) return 1;
    return 0;
  });
  return {
    selectedRpc: rpclist[endPoint],
    rpcListSorted: urlList,
  };
}

export function getRpcKeyByUrl(url: string) {
  const rpcList = getRPCList();
  const finded = Object.entries(rpcList).find(([, o]: any) => o?.url == url);
  if (finded) {
    return finded[0];
  }
}

type CustomRpcEntry = {
  url: string;
  simpleName: string;
  custom: boolean;
};

type CustomRpcMap = Record<string, CustomRpcEntry>;
