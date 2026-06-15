// Helpers compartilhados para gerar links wa.me
export function waDigits(input: string | null | undefined): string {
  return (input ?? "").replace(/\D/g, "");
}

export function waLink(
  number: string | null | undefined,
  message: string,
): string | null {
  const digits = waDigits(number);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
