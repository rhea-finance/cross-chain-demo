import React, { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { MoreButtonIcon } from "./icon";
import { isMobile } from "@/utils/device";
import { switchPoint, displayCurrentRpc, ping } from "./rpcUtil";
import ModalAddCustomNetWork from "./modalAddCustomNetWork";
import { getRPCList } from "@/utils/rpc";

const RpcList = () => {
  const is_mobile = isMobile();
  const rpclist = getRPCList();
  const [responseTimeList, setResponseTimeList] = useState<{
    [key: string]: number;
  }>({});
  const [modalCustomVisible, setModalCustomVisible] = useState(false);
  const [currentEndPoint, setCurrentEndPoint] = useState("defaultRpc");

  useEffect(() => {
    let endPoint = localStorage.getItem("endPoint") || "defaultRpc";
    if (!(endPoint in rpclist)) {
      endPoint = "defaultRpc";
      localStorage.removeItem("endPoint");
    }
    setCurrentEndPoint(endPoint);
  }, [rpclist]);

  useEffect(() => {
    fetchPingTimes();
    // Manual storage modification is not allowed
    const handleStorageChange = (e: any) => {
      if (e.key === "customRpcList") {
        localStorage.setItem(e.key, e.oldValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function updateResponseTimeList(data: any) {
    const { key, responseTime, isDelete } = data;
    if (isDelete) {
      // delete
      delete responseTimeList[key];
      setResponseTimeList(Object.assign({}, responseTimeList));
    } else {
      // add
      responseTimeList[key] = responseTime;
      setResponseTimeList(Object.assign({}, responseTimeList));
    }
  }

  function addCustomNetwork() {
    setModalCustomVisible(true);
  }

  async function fetchPingTimes() {
    const list = getRPCList();
    Object.entries(list).forEach(([key, data]: any) => {
      ping(data.url, key).then((time) => {
        responseTimeList[key] = time;
        setResponseTimeList(Object.assign({}, responseTimeList));
      });
    });
  }

  function getSimpleName() {
    return rpclist[currentEndPoint]?.simpleName;
  }

  return (
    <>
      <div className="fixed right-0 bottom-0 right-4 px-4 flex items-center justify-between h-6">
        <Dropdown
          placement="top-start"
          classNames={{
            content: "bg-white border-none min-w-[180px] max-w-[230px]",
          }}
          triggerScaleOnOpen={false}
        >
          <DropdownTrigger>
            <Button
              className="min-w-[180px] max-w-[230px] h-[22px] bg-transparent"
              variant="flat"
              size="sm"
              radius="sm"
            >
              <div className="flex items-center w-2/3">
                <label className="text-xs w-full text-default-500 cursor-pointer pr-2 whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {getSimpleName()}
                </label>
              </div>
              <div className="flex items-center">
                {displayCurrentRpc(responseTimeList, currentEndPoint)}
                <Icon
                  icon="mdi:chevron-down"
                  className="text-default-500 transform rotate-180 cursor-pointer hover:text-greenColor"
                />
              </div>
            </Button>
          </DropdownTrigger>

          <DropdownMenu
            aria-label="RPC Selection"
            className="p-0"
            itemClasses={{
              base: "frcb px-2 py-1 text-default-500 hover:bg-gray-10 hover:text-balck data-[selected=true]:text-balck data-[selected=true]:bg-gray-10 rounded-md",
            }}
            selectedKeys={new Set([currentEndPoint])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              if (selectedKey) {
                switchPoint(selectedKey);
              }
            }}
          >
            {Object.entries(rpclist).map(([key, data]: any) => (
              <DropdownItem
                key={key}
                className="min-w-[180px] max-w-[230px]"
                textValue={data.simpleName}
              >
                <div className="flex items-center justify-between w-full">
                  <label className="text-xs pr-5 whitespace-nowrap overflow-hidden overflow-ellipsis cursor-pointer">
                    {data.simpleName}
                  </label>
                  <div className="flex items-center">
                    {displayCurrentRpc(responseTimeList, key)}
                  </div>
                </div>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        <Button
          className="bg-transparent w-[22px] h-[22px] min-w-0"
          onPress={addCustomNetwork}
          variant="flat"
          isIconOnly
          size="sm"
          radius="sm"
        >
          <MoreButtonIcon className="text-default-500 hover:text-black" />
        </Button>
      </div>
      <div className="flex items-center lg:hidden" onClick={addCustomNetwork}>
        {displayCurrentRpc(responseTimeList, currentEndPoint)}
        <Icon
          icon="mdi:chevron-down"
          className="text-default-500 transform rotate-180 cursor-pointer"
        />
      </div>

      <ModalAddCustomNetWork
        isOpen={modalCustomVisible}
        onRequestClose={() => setModalCustomVisible(false)}
        updateResponseTimeList={updateResponseTimeList}
        currentEndPoint={currentEndPoint}
        responseTimeList={responseTimeList}
        rpclist={rpclist}
        style={{
          overlay: {
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: "101",
          },
          content: {
            outline: "none",
          },
        }}
      />
    </>
  );
};

export default React.memo(RpcList);
