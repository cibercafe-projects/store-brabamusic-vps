/**
 * Feature flags — Sprint 0 (MVP).
 *
 * Princípio: nada é deletado. Tudo que sai do MVP é desativado aqui.
 * Para reativar uma feature no futuro: trocar `false` por `true`.
 */
export const FEATURES = {
  /** Login passwordless do cliente (AuthModal, requireAuth, persistência). */
  auth: false,
  /** Favoritos / "Meus interesses" (coração, contador, página, envio consolidado). */
  interests: false,
  /** Promoção e links para o aplicativo BRABA. */
  appPromo: false,
};
