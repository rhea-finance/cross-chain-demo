import { staticDomain } from "@/services/constantConfig";
export function Img({ path, className }: { path: string; className?: string }) {
  return (
    <img
      src={`${staticDomain}/images/${path}`}
      className={className || ""}
      alt=""
    />
  );
}
