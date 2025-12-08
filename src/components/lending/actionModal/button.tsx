import React from "react";

interface IButtonProps {
  children: string | React.ReactNode;
  disabled?: boolean;
  className?: string;
  [property: string]: any;
}

export function EnterSolidSubmitButton(props: IButtonProps) {
  return <Button appearanceClass="bg-green-10 text-b-40" {...props} />;
}
export function OutSolidSubmitButton(props: IButtonProps) {
  return <Button appearanceClass="bg-red-10 text-white" {...props} />;
}

function Button({
  appearanceClass,
  children,
  disabled,
  className,
  ...rest
}: any) {
  return (
    <button
      {...rest}
      type="button"
      disabled={disabled}
      className={`h-[46px] rounded-md text-base font-bold px-6 w-full ${appearanceClass} ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:opacity-80"
      } ${className}`}
    >
      {children}
    </button>
  );
}
