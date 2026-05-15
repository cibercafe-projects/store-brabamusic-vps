import beat1 from "@/assets/beat-1.jpg";
import beat2 from "@/assets/beat-2.jpg";
import beat3 from "@/assets/beat-3.jpg";
import beat4 from "@/assets/beat-4.jpg";
import beat5 from "@/assets/beat-5.jpg";
import beat6 from "@/assets/beat-6.jpg";

export type Beat = {
  slug: string;
  title: string;
  producerSlug: string;
  producer: string;
  genre: string;
  bpm: number;
  key: string;
  duration: string;
  price: number;
  mood: string[];
  cover: string;
};

export type Producer = {
  slug: string;
  name: string;
  bio: string;
  city: string;
  socials: { instagram?: string; soundcloud?: string };
};

export const PRODUCERS: Producer[] = [
  { slug: "dj-nyx", name: "DJ NYX", bio: "Produtor de trap e drill com passagem por hits do BH underground.", city: "Belo Horizonte", socials: { instagram: "@djnyx" } },
  { slug: "mc-prod", name: "MC PROD", bio: "Funk 150 e mandelão direto da Baixada.", city: "Rio de Janeiro", socials: { instagram: "@mcprod" } },
  { slug: "kira-beats", name: "KIRA BEATS", bio: "Melodic trap, R&B e fusões com MPB.", city: "São Paulo", socials: { instagram: "@kira.beats" } },
  { slug: "808-favela", name: "808 FAVELA", bio: "Boom bap, phonk e samples raros.", city: "Salvador", socials: { instagram: "@808favela" } },
];

export const BEATS: Beat[] = [
  { slug: "tigre-de-rua", title: "Tigre de Rua", producerSlug: "dj-nyx", producer: "DJ NYX", genre: "Trap", bpm: 142, key: "F#m", duration: "2:48", price: 199, mood: ["dark", "agressivo"], cover: beat1 },
  { slug: "favela-neon", title: "Favela Neon", producerSlug: "mc-prod", producer: "MC PROD", genre: "Funk 150", bpm: 150, key: "Am", duration: "2:30", price: 149, mood: ["dançante", "festa"], cover: beat2 },
  { slug: "drill-da-quebrada", title: "Drill da Quebrada", producerSlug: "dj-nyx", producer: "DJ NYX", genre: "Drill", bpm: 138, key: "Cm", duration: "3:02", price: 219, mood: ["sombrio", "punchy"], cover: beat3 },
  { slug: "boom-bap-90", title: "Boom Bap 90", producerSlug: "808-favela", producer: "808 FAVELA", genre: "Boom Bap", bpm: 92, key: "Dm", duration: "3:20", price: 179, mood: ["nostálgico", "lyrical"], cover: beat4 },
  { slug: "rosas-violetas", title: "Rosas Violetas", producerSlug: "kira-beats", producer: "KIRA BEATS", genre: "Melodic Trap", bpm: 128, key: "G#m", duration: "2:55", price: 229, mood: ["melódico", "romântico"], cover: beat5 },
  { slug: "phonk-da-pista", title: "Phonk da Pista", producerSlug: "808-favela", producer: "808 FAVELA", genre: "Phonk", bpm: 130, key: "Em", duration: "2:40", price: 189, mood: ["drift", "agressivo"], cover: beat6 },
  { slug: "trap-do-asfalto", title: "Trap do Asfalto", producerSlug: "dj-nyx", producer: "DJ NYX", genre: "Trap", bpm: 145, key: "Bm", duration: "2:50", price: 199, mood: ["dark", "club"], cover: beat1 },
  { slug: "baile-da-laje", title: "Baile da Laje", producerSlug: "mc-prod", producer: "MC PROD", genre: "Funk", bpm: 130, key: "Am", duration: "2:20", price: 139, mood: ["festa", "verão"], cover: beat2 },
];

export const GENRES = ["Todos", "Trap", "Funk", "Funk 150", "Drill", "Boom Bap", "Melodic Trap", "Phonk"] as const;

export const LICENSES = [
  { name: "Lease", price: 199, includes: ["MP3 + WAV", "Streams ilimitados (não-comercial)", "1 distribuição", "Crédito ao produtor"], highlight: false },
  { name: "Premium", price: 499, includes: ["MP3 + WAV + Trackouts", "Streams comerciais ilimitados", "Distribuição em DSPs", "Vídeo-clipe permitido"], highlight: true },
  { name: "Exclusiva", price: 2499, includes: ["Todos os arquivos + stems", "Direitos exclusivos", "Beat removido do catálogo", "Contrato registrado"], highlight: false },
];

export const WHATSAPP_NUMBER = "5500000000000"; // placeholder
