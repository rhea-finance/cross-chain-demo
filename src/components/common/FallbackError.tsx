import { Alert, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

const FallbackError = ({ error }: any) => {
  const resetSession = () => {
    localStorage.removeItem("_cached_chain_account");
    localStorage.removeItem("persist:root");
    window.location.reload();
  };
  return (
    <div className="flex items-center justify-center w-100vw h-screen text-black text-base">
      <div className="flex flex-col gap-4 items-center justify-center lg:w-[460px] max-sm:w-100vw max-sm:mx-6 bg-gray-80 rounded-xl p-5 ">
        <Icon
          icon="fluent:cloud-error-48-filled"
          className="text-[80px] text-red-80"
        />
        <span>Ooops! Something went wrong.</span>
        <div
          onClick={resetSession}
          className="border border-black text-black px-4 py-2 rounded-md cursor-pointer"
        >
          Click here to reload your session
        </div>
        <Alert color="warning" title={error.error.message} />
      </div>
    </div>
  );
};

export default FallbackError;
