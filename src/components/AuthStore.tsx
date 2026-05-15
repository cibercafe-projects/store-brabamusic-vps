import { create } from "zustand";

export type AuthUser = { name: string; email: string };

type AuthState = {
  user: AuthUser | null;
  modalOpen: boolean;
  pendingAction: (() => void) | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  /** Run `action` if logged in, otherwise open modal and run after login. */
  requireAuth: (action: () => void) => void;
  closeModal: () => void;
};

const KEY = "braba-user";
const initial: AuthUser | null =
  typeof window !== "undefined" && localStorage.getItem(KEY)
    ? JSON.parse(localStorage.getItem(KEY) as string)
    : null;

export const useAuth = create<AuthState>((set, get) => ({
  user: initial,
  modalOpen: false,
  pendingAction: null,
  login: (u) => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(u));
    const pending = get().pendingAction;
    set({ user: u, modalOpen: false, pendingAction: null });
    pending?.();
  },
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    set({ user: null });
  },
  requireAuth: (action) => {
    if (get().user) action();
    else set({ modalOpen: true, pendingAction: action });
  },
  closeModal: () => set({ modalOpen: false, pendingAction: null }),
}));
