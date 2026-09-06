/**
 * Feature flags — Sprint 0 (MVP).
 *
 * Princípio: nada é deletado. Tudo que sai do MVP é desativado aqui.
 * Para reativar uma feature no futuro: trocar `false` por `true`.
 */
export const FEATURES = {
  /** Login passwordless do cliente (AuthModal, requireAuth, persistência). */
  auth: false,
  /** Promoção e links para o aplicativo BRABA. */
  appPromo: false,
  /**
   * Modo manutenção. Com `true`, todo o site público passa a mostrar a tela
   * de manutenção (/manutencao). O painel /admin continua acessível.
   */
  maintenance: false,
};
