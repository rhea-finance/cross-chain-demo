import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  SelectedButtonIcon,
  SetButtonIcon,
  ReturnArrowButtonIcon,
  DeleteButtonIcon,
} from "./icon";
import { getCustomAddRpcSelectorList, getRPCList } from "@/utils/rpc";
import { isMobile } from "@/utils/device";
import Modal from "react-modal";
import { ButtonTextWrapper } from "../common/Button";
import {
  trimStr,
  specialRpcs,
  pingChain,
  ping_gas,
  switchPoint,
  displayCurrentRpc,
} from "./rpcUtil";

const ModalAddCustomNetWork = (props: any) => {
  const { rpclist, currentEndPoint, responseTimeList, onRequestClose, isOpen } =
    props;
  const [customLoading, setCustomLoading] = useState(false);
  const [customRpcName, setCustomRpcName] = useState("");
  const [customRpUrl, setCustomRpUrl] = useState("");
  const [customShow, setCustomShow] = useState(false);
  const [unavailableError, setUnavailableError] = useState(false);
  const [testnetError, setTestnetError] = useState(false);
  const [notSupportTestnetError, setNotSupportTestnetError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [isInEditStatus, setIsInEditStatus] = useState(false);
  const cardWidth = isMobile() ? "100vw" : "350px";
  const cardHeight = isMobile() ? "40vh" : "336px";
  useEffect(() => {
    hideCustomNetWork();
  }, [isOpen]);
  async function addCustomNetWork() {
    setCustomLoading(true);
    const rpcMap = getRPCList();
    // check if has same url and same name
    const fondItem = Object.values(rpcMap).find((item: any) => {
      if (trimStr(item.simpleName) == trimStr(customRpcName)) {
        return true;
      }
    });
    if (fondItem) {
      setNameError(true);
      setCustomLoading(false);
      return;
    }
    // check network
    let responseTime;
    // special check
    if (checkContain(customRpUrl)) {
      const { status, responseTime: responseTime_gas } = await ping_gas(
        customRpUrl
      );
      if (!status) {
        setUnavailableError(true);
        setCustomLoading(false);
        return;
      }
      responseTime = responseTime_gas;
    } else {
      // common check
      const {
        status,
        responseTime: responseTime_status,
        chain_id,
      } = await pingChain(customRpUrl);
      responseTime = responseTime_status;
      if (!status) {
        setUnavailableError(true);
        setCustomLoading(false);
        return;
      }
      if (status && chain_id == "testnet") {
        setTestnetError(true);
        setCustomLoading(false);
        return;
      }
    }
    // do not support testnet
    const env = process.env.NEXT_PUBLIC_NEAR_ENV;
    if (env == "testnet" || env == "pub-testnet") {
      setNotSupportTestnetError(true);
      setCustomLoading(false);
      return;
    }
    const customRpcMap = getCustomAddRpcSelectorList();
    const key = "custom" + Object.keys(customRpcMap).length + 1;
    customRpcMap[key] = {
      url: customRpUrl,
      simpleName: trimStr(customRpcName),
      custom: true,
    };

    localStorage.setItem("customRpcList", JSON.stringify(customRpcMap));
    setCustomLoading(false);
    props.updateResponseTimeList({
      key,
      responseTime,
    });
    setCustomShow(false);
  }
  function checkContain(url: string) {
    const res = specialRpcs.find((rpc: string) => {
      if (url.indexOf(rpc) > -1) return true;
    });
    return !!res;
  }
  function changeNetName(v: string) {
    setNameError(false);
    setCustomRpcName(v);
  }
  function changeNetUrl(v: string) {
    setUnavailableError(false);
    setTestnetError(false);
    setCustomRpUrl(v);
  }
  function showCustomNetWork() {
    setCustomShow(true);
    initData();
  }
  function hideCustomNetWork() {
    setCustomShow(false);
    initData();
  }
  function closeModal() {
    setCustomShow(false);
    initData();
    onRequestClose();
  }
  function switchEditStatus() {
    setIsInEditStatus(!isInEditStatus);
  }
  function deleteCustomNetwork(key: string) {
    const customMap = getCustomAddRpcSelectorList();
    delete customMap[key];
    localStorage.setItem("customRpcList", JSON.stringify(customMap));
    if (key == currentEndPoint) {
      window.location.reload();
    } else {
      props.updateResponseTimeList({
        key,
        isDelete: true,
      });
      if (Object.keys(customMap).length == 0) {
        setIsInEditStatus(false);
      }
    }
  }
  function initData() {
    setCustomRpcName("");
    setCustomRpUrl("");
    setTestnetError(false);
    setNameError(false);
    setUnavailableError(false);
    setIsInEditStatus(false);
    setNotSupportTestnetError(false);
  }
  const submitStatus =
    trimStr(customRpcName) &&
    trimStr(customRpUrl) &&
    !unavailableError &&
    !nameError &&
    !testnetError;
  return (
    <Modal {...props}>
      <div className="relative frcc">
        <div
          className="absolute top-0 bottom-0"
          style={{
            filter: "blur(50px)",
            width: cardWidth,
          }}
        ></div>
        <div
          className="relative z-10 p-6 text-black bg-white lg:rounded-lg max-sm:rounded-t-2xl"
          style={{
            width: cardWidth,
          }}
        >
          {customShow ? (
            <div>
              <div className="flex items-center justify-between text-lg text-black">
                <div className="flex items-center">
                  <ReturnArrowButtonIcon
                    className="mr-3 cursor-pointer"
                    onClick={hideCustomNetWork}
                  ></ReturnArrowButtonIcon>
                  Add Custom Network
                </div>
                <span onClick={closeModal} className="cursor-pointer">
                  <Icon icon="mdi:close" className="text-default-500" />
                </span>
              </div>
              <div className="flex flex-col  mt-6">
                <span className="text-default-500 text-sm mb-2.5">
                  Network Name
                </span>
                <div
                  className={`overflow-hidden rounded-md ${
                    nameError ? "border border-warnRedColor" : ""
                  }`}
                >
                  <input
                    className="px-3 h-10 bg-gray-10"
                    onChange={({ target }) => changeNetName(target.value)}
                  ></input>
                </div>
                <span
                  className={`errorTip text-redwarningColor text-sm mt-2 ${
                    nameError ? "" : "hidden"
                  }`}
                >
                  The network name was already taken
                </span>
              </div>
              <div className="flex flex-col mt-6">
                <span className="text-default-500 text-sm mb-2.5">RPC URL</span>
                <div
                  className={`overflow-hidden rounded-md ${
                    unavailableError ? "border border-red-10" : ""
                  }`}
                >
                  <input
                    className="px-3 h-10 rounded-md bg-gray-10"
                    onChange={({ target }) => changeNetUrl(target.value)}
                  ></input>
                </div>
                <span
                  className={`errorTip text-red-10 text-sm mt-2 ${
                    unavailableError ? "" : "hidden"
                  }`}
                >
                  The network was invalid
                </span>
                <span
                  className={`errorTip text-red-10 text-sm mt-2 ${
                    testnetError ? "" : "hidden"
                  }`}
                >
                  RPC server&apos;s network (testnet) is different with this
                  network (mainnet)
                </span>
                <span
                  className={`errorTip text-red-10 text-sm mt-2 ${
                    notSupportTestnetError ? "" : "hidden"
                  }`}
                >
                  Testnet does not support adding custom RPC
                </span>
              </div>
              <div
                color="#fff"
                className={`w-full h-10 flex items-center justify-center text-center text-base rounded text-black mt-6 focus:outline-none bg-green-10 ${
                  submitStatus
                    ? "cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }`}
                onClick={addCustomNetWork}
                // disabled={!submitStatus}
                // loading={customLoading}
              >
                <div className={`${isInEditStatus ? "hidden" : ""}`}>
                  <ButtonTextWrapper
                    loading={customLoading}
                    Text={() => {
                      return <>Add</>;
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-lg text-black mb-5">
                RPC
                <span onClick={closeModal} className="cursor-pointer">
                  <Icon icon="mdi:close" className="text-default-500" />
                </span>
              </div>
              <div
                style={{ maxHeight: cardHeight }}
                className="overflow-y-auto overflow-x-hidden"
              >
                {Object.entries(rpclist).map(
                  ([key, data]: any, index: number) => {
                    return (
                      <div className="flex items-center" key={data.simpleName}>
                        <div
                          className={`relative flex items-center rounded h-9 px-4 border border-gray-10 ${
                            isInEditStatus && data.custom ? "w-4/5" : "w-full"
                          } ${
                            index != Object.entries(rpclist).length - 1
                              ? "mb-3"
                              : ""
                          } ${isInEditStatus ? "" : "cursor-pointer"} ${
                            isInEditStatus && !data.custom
                              ? ""
                              : "bg-gray-10 hover:bg-gray-100"
                          } justify-between text-black ${
                            currentEndPoint == key && !isInEditStatus
                              ? "bg-opacity-30"
                              : ""
                          }`}
                          onClick={() => {
                            if (!isInEditStatus) {
                              switchPoint(key);
                            }
                          }}
                        >
                          <label
                            className={`text-sm pr-5 whitespace-nowrap overflow-hidden overflow-ellipsis w-3/5`}
                          >
                            {data.simpleName}
                          </label>
                          <div className={`flex items-center text-sm w-1/5`}>
                            {displayCurrentRpc(responseTimeList, key, true)}
                          </div>
                          <div className="w-1/5 flex justify-end">
                            {currentEndPoint == key && !isInEditStatus ? (
                              <SelectedButtonIcon className=""></SelectedButtonIcon>
                            ) : null}
                          </div>
                        </div>
                        {isInEditStatus && data.custom ? (
                          <div>
                            <DeleteButtonIcon
                              className="cursor-pointer ml-4"
                              onClick={() => {
                                deleteCustomNetwork(key);
                              }}
                            ></DeleteButtonIcon>
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                )}
              </div>
              <div
                className={`flex items-center mt-8 ${
                  isInEditStatus ? "justify-end" : "justify-between"
                }`}
              >
                <div
                  color="#fff"
                  className={`flex items-center justify-center h-8 px-4 text-center text-base text-black focus:outline-none bg-green-10 rounded ${
                    isInEditStatus ? "hidden" : ""
                  }`}
                  onClick={showCustomNetWork}
                >
                  <div className={"flex items-center cursor-pointer"}>
                    {/* <AddButtonIcon
                      style={{ zoom: 1.35 }}
                      className="mr-1 text-white"
                    ></AddButtonIcon> */}
                    Add
                  </div>
                </div>
                {Object.keys(rpclist).length > 2 ? (
                  <div className="flex items-center">
                    {isInEditStatus ? (
                      <span
                        className="text-sm text-black cursor-pointer mr-2"
                        onClick={switchEditStatus}
                      >
                        Finish
                      </span>
                    ) : null}
                    <SetButtonIcon
                      className="cursor-pointer text-default-500 hover:text-black"
                      onClick={switchEditStatus}
                    ></SetButtonIcon>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ModalAddCustomNetWork;
