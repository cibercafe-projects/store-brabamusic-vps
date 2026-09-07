export interface PendingPurchase {
  token: string;
  beatSlug: string;
  beatName: string;
  valor: number | null;
  createdAt: string;
}

const KEY = "braba.pending-purchase";
const MAX_ENTRIES = 5;

function read(): PendingPurchase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingPurchase[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingPurchase[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore quota/security errors
  }
}

export function addPendingPurchase(p: PendingPurchase) {
  const items = read().filter((x) => x.token !== p.token);
  items.push(p);
  write(items.slice(-MAX_ENTRIES));
}

export function getPendingPurchaseBySlug(slug: string): PendingPurchase | undefined {
  return read().find((x) => x.beatSlug === slug);
}

export function getPendingPurchaseByToken(token: string): PendingPurchase | undefined {
  return read().find((x) => x.token === token);
}

export function removePendingPurchase(token: string) {
  write(read().filter((x) => x.token !== token));
}
