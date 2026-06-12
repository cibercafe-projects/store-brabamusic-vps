export const RELEASE_GENRES = [
  "Trap",
  "Funk",
  "Rap",
  "Hip-Hop",
  "R&B",
  "Pop",
  "Sertanejo",
  "MPB",
  "Pagode",
  "Samba",
  "Forró",
  "Rock",
  "Eletrônica",
  "Reggae",
  "Gospel",
  "Bossa Nova",
  "Indie",
  "Latina",
  "Drill",
  "Afrobeat",
] as const;

export const RELEASE_MOODS = [
  "Alegre",
  "Triste",
  "Romântico",
  "Agressivo",
  "Energético",
  "Calmo",
  "Melancólico",
  "Sensual",
  "Reflexivo",
  "Festivo",
  "Nostálgico",
  "Épico",
  "Sombrio",
  "Inspirador",
] as const;

export const RELEASE_INSTRUMENTS = [
  "Voz",
  "Violão",
  "Guitarra",
  "Baixo",
  "Bateria",
  "Piano",
  "Teclado",
  "Sintetizador",
  "808",
  "Pad",
  "Cordas",
  "Sopros",
  "Percussão",
  "Cavaco",
  "Sanfona",
  "Beat eletrônico",
] as const;

export const RELEASE_TYPES = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Álbum" },
] as const;

export const RELEASE_STATUSES = [
  "recebido",
  "em_analise",
  "aprovado",
  "distribuido",
] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
export type ReleaseType = (typeof RELEASE_TYPES)[number]["value"];

export const RELEASE_STATUS_LABEL: Record<ReleaseStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  distribuido: "Distribuído",
};

export const RELEASE_TYPE_LABEL: Record<ReleaseType, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
};

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PROMO_PHOTOS = 10;
