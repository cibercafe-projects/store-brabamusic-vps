type Props = {
  name: string;
  className?: string;
};

// Stylized placeholder cover inspired by the Braba Beats neon mockups.
// Big graffiti-style name over a purple/magenta gradient with glow + scanlines.
export function BeatCoverFallback({ name, className = "" }: Props) {
  const label = (name || "Beat").trim().toUpperCase();
  const len = label.length;
  const sizeClass =
    len <= 4
      ? "text-[56%]"
      : len <= 8
        ? "text-[44%]"
        : len <= 14
          ? "text-[32%]"
          : len <= 22
            ? "text-[22%]"
            : "text-[16%]";

  return (
    <div
      className={`relative h-full w-full overflow-hidden isolate ${className}`}
      style={{
        background:
          "radial-gradient(120% 90% at 20% 10%, oklch(0.38 0.22 320) 0%, oklch(0.22 0.15 295) 45%, oklch(0.12 0.09 285) 100%)",
      }}
      aria-label={`Capa estilizada de ${label}`}
    >
      {/* Neon glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 85%, oklch(0.72 0.32 340 / 0.55), transparent 55%), radial-gradient(circle at 10% 90%, oklch(0.65 0.28 300 / 0.4), transparent 60%), radial-gradient(circle at 50% 0%, oklch(0.9 0.2 130 / 0.18), transparent 55%)",
        }}
      />
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Big ghost name (background echo) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-display leading-[0.85] tracking-tight ${sizeClass} text-center px-2 break-words select-none`}
          style={{
            color: "transparent",
            WebkitTextStroke: "1px oklch(0.85 0.18 340 / 0.35)",
            transform: "scale(1.35)",
            filter: "blur(0.3px)",
          }}
        >
          {label}
        </span>
      </div>

      {/* Foreground name with neon glow */}
      <div className="relative z-10 flex h-full w-full items-center justify-center p-2 text-center">
        <span
          className={`font-display leading-[0.9] tracking-tight ${sizeClass} break-words text-center select-none`}
          style={{
            color: "oklch(0.97 0.05 330)",
            textShadow:
              "0 0 6px oklch(0.78 0.3 340 / 0.9), 0 0 18px oklch(0.65 0.28 320 / 0.7), 0 2px 0 oklch(0.25 0.15 300)",
          }}
        >
          {label}
        </span>
      </div>

      {/* Bottom vignette */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(to top, oklch(0.08 0.06 285 / 0.7), transparent)",
        }}
      />
    </div>
  );
}
