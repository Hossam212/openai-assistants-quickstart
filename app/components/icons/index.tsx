import { cn } from "@/app/utils/cn";
import Icons from "./icons";

export type IconName = Icons[number];

export interface IconProps extends React.ComponentProps<"span"> {
  name: IconName;
  size?: IconSize;
}

export type IconSize = keyof typeof iconSizes;

const iconSizes = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
  x: "text-3xl",
  xl: "text-[40px]",
} as const;

export function Icon({ name, className, size = "md", ...props }: IconProps) {
  return (
    <span
      className={cn(`icon icon-${name}`, className, iconSizes[size])}
      {...props}
    />
  );
}
