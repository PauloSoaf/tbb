import Image from "next/image";

interface NutriOpusIconProps {
  className?: string;
  size?: number;
}

export function NutriOpusIcon({ className, size = 20 }: NutriOpusIconProps) {
  return (
    <Image
      src="/nutriopus_mini_logo_exata.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
