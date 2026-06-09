export type PublicBeat = {
  id: string;
  slug: string;
  nome: string;
  genero: string | null;
  bpm: number | null;
  tom: string | null;
  mood: string | null;
  preco: number | null;
  descricao: string | null;
  produtora_id: string;
  produtora_nome: string;
  produtora_slug: string;
  capa_url: string | null;
  preview_url: string | null;
};

export type PublicProducer = {
  id: string;
  slug: string;
  nome_artistico: string;
  cidade: string | null;
  bio: string | null;
  instagram: string | null;
  spotify: string | null;
  foto_url: string | null;
  beats_count: number;
};
