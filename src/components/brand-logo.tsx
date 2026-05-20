import { cn } from "@/lib/utils";

interface Props {
  /** "sm" 28px, "md" 32px, "lg" 40px. Default md. */
  size?: "sm" | "md" | "lg";
  /** Hide the "Birdie & Cause" wordmark, keep only the emblem. */
  iconOnly?: boolean;
  /** Render the wordmark in white (for dark backgrounds). */
  inverted?: boolean;
  className?: string;
}

const dims = { sm: 28, md: 32, lg: 40 };

export function BrandLogo({ size = "md", iconOnly = false, inverted = false, className }: Props) {
  const px = dims[size];
  return (
    <span className={cn("inline-flex items-center gap-2 group", className)}>
      <span
        className="inline-block rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]"
        style={{ width: px, height: px }}
        aria-hidden="true"
      >
        <BrandEmblem />
      </span>
      {!iconOnly && (
        <span
          className={cn(
            "font-display font-bold tracking-tight whitespace-nowrap",
            size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg",
            inverted ? "text-white" : "text-ink-900",
          )}
        >
          Birdie&nbsp;<span className="text-brand-500">&amp;</span>&nbsp;Cause
        </span>
      )}
    </span>
  );
}

function BrandEmblem() {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full block"
    >
      <defs>
        <linearGradient id="bc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f4d31" />
          <stop offset="55%" stopColor="#357d4d" />
          <stop offset="100%" stopColor="#d28e0c" />
        </linearGradient>
        <radialGradient id="bc-dimple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(14,24,20,0.22)" />
          <stop offset="100%" stopColor="rgba(14,24,20,0)" />
        </radialGradient>
      </defs>

      {/* rounded square background */}
      <rect width="64" height="64" rx="16" fill="url(#bc-bg)" />

      {/* golf ball */}
      <circle cx="22" cy="22" r="10" fill="#ffffff" />
      <circle cx="19" cy="20" r="1.6" fill="url(#bc-dimple)" />
      <circle cx="24" cy="19" r="1.6" fill="url(#bc-dimple)" />
      <circle cx="22" cy="24" r="1.6" fill="url(#bc-dimple)" />
      <circle cx="26" cy="24" r="1.6" fill="url(#bc-dimple)" />
      <circle cx="19" cy="25" r="1.6" fill="url(#bc-dimple)" />

      {/* heart overlapping the ball */}
      <path
        d="M40 50 C 25 41, 24 30, 32 28 C 35 27, 38 29, 40 32 C 42 29, 45 27, 48 28 C 56 30, 55 41, 40 50 Z"
        fill="#ffffff"
        opacity="0.97"
      />

      {/* tee connector */}
      <rect x="31" y="32" width="2" height="6" rx="1" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
