import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "brand" | "outline" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const map: Record<Variant, string> = {
  primary: "btn-primary",
  brand: "btn-brand",
  outline: "btn-outline",
  ghost: "btn-ghost",
};

export function Button({ variant = "primary", className, ...rest }: Props) {
  return <button className={cn(map[variant], className)} {...rest} />;
}
