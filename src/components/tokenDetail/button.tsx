import React from "react";

interface IButtonProps {
  children: string | React.ReactNode;
  disabled?: boolean;
  className?: string;
  [property: string]: any;
}

export function YellowSolidButton(props: IButtonProps) {
  return (
    <Button
      appearanceClass="bg-green-10 text-black cursor-pointer rounded-xl h-[52px]"
      {...props}
    />
  );
}
export function YellowLineButton(props: IButtonProps) {
  return (
    <Button
      appearanceClass="text-black cursor-pointer border border-black border-opacity-60 rounded-xl h-[52px]"
      {...props}
    />
  );
}
export function RedSolidButton(props: IButtonProps) {
  return (
    <Button
      appearanceClass="bg-red-10 text-dark-350 cursor-pointer rounded-xl h-[52px]"
      {...props}
    />
  );
}
export function RedLineButton(props: IButtonProps) {
  return (
    <Button
      appearanceClass="text-black cursor-pointer border border-black border-opacity-60 rounded-xl h-[52px]"
      {...props}
    />
  );
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
      className={`h-[42px] rounded-md text-base font-bold px-6 outline-none ${appearanceClass} ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"
      } ${className}`}
    >
      {children}
    </button>
  );
}
