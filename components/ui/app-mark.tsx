import Image from "next/image";

type AppMarkProps = { size?: "default" | "large" };

// The Ấm logo; decorative because the shop name is always written next to it.
export function AppMark({ size = "default" }: AppMarkProps) {
  const pixels = size === "large" ? 56 : 40;
  return (
    <Image
      src="/am-logo.png"
      alt=""
      width={pixels}
      height={pixels}
      className={`shrink-0 ${size === "large" ? "rounded-[1.25rem]" : "rounded-[14px]"}`}
    />
  );
}
