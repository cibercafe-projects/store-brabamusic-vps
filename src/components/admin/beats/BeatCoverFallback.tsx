type Props = {
  name: string;
  className?: string;
  textClassName?: string;
};

// Stylized placeholder cover that uses the brand display font and gradient
// when a beat has no uploaded cover image.
export function BeatCoverFallback({ name, className = "", textClassName = "" }: Props) {
  const label = (name || "Beat").trim();
  // Rough size adjustment based on label length so it fits the square.
  const len = label.length;
  const auto =
    len <= 6
      ? "text-[28%]"
      : len <= 12
        ? "text-[20%]"
        : len <= 20
          ? "text-[14%]"
          : "text-[10%]";

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, oklch(0.32 0.18 320) 0%, oklch(0.25 0.14 290) 55%, oklch(0.45 0.22 340) 100%)",
      }}
      aria-label={`Capa estilizada de ${label}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, oklch(0.68 0.28 340 / 0.45), transparent 55%), radial-gradient(circle at 85% 90%, oklch(0.92 0.22 130 / 0.25), transparent 60%)",
        }}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-2 text-center">
        <span
          className={`font-display leading-tight text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] break-words ${auto} ${textClassName}`}
          style={{ fontSize: textClassName ? undefined : undefined }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
