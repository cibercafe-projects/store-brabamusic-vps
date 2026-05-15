import { create } from "zustand";
import type { Beat } from "@/data/beats";

type PlayerState = {
  current: Beat | null;
  playing: boolean;
  play: (b: Beat) => void;
  toggle: () => void;
  stop: () => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  current: null,
  playing: false,
  play: (b) => {
    const { current, playing } = get();
    if (current?.slug === b.slug) set({ playing: !playing });
    else set({ current: b, playing: true });
  },
  toggle: () => set((s) => ({ playing: !s.playing })),
  stop: () => set({ current: null, playing: false }),
}));

type InterestState = {
  items: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
  clear: () => void;
};

export const useInterests = create<InterestState>((set, get) => ({
  items: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("braba-interests") || "[]") : [],
  toggle: (slug) => {
    const items = get().items.includes(slug) ? get().items.filter((s) => s !== slug) : [...get().items, slug];
    if (typeof window !== "undefined") localStorage.setItem("braba-interests", JSON.stringify(items));
    set({ items });
  },
  has: (slug) => get().items.includes(slug),
  clear: () => {
    if (typeof window !== "undefined") localStorage.setItem("braba-interests", "[]");
    set({ items: [] });
  },
}));
