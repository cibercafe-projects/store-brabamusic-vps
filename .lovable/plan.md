# Footer Profissional — Adicional Sprint 0

## Escopo

Criar um rodapé global da plataforma com seção CTA logo acima, mantendo a identidade visual atual (fundo roxo profundo, neon magenta, detalhes lime, glassmorphism, tipografia `font-display`). Atualizar documentação da Sprint 0.

## Arquivos a criar

### `src/components/Footer.tsx`
Componente único exportando `<Footer />`, contendo:

1. **Seção CTA** (acima do rodapé, full-width)
   - Título: `🎵 Procurando o beat ideal?` (`font-display`, `text-gradient`)
   - Texto: `Explore o catálogo da Braba Music e conecte-se com produtoras independentes.`
   - Botão `Explorar Beats` → `<Link to="/">` (rola para o catálogo na home). Usa `Button` variant default com glow magenta.
   - Card `glass` com borda superior neon translúcida (`border-t border-primary/30`) e padding vertical generoso (`py-16`).

2. **Grid principal** — 4 colunas (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10`)
   - **Coluna 1 — BRABA MUSIC**: logo/título em `font-display text-gradient` + parágrafo institucional.
   - **Coluna 2 — Navegação**: links `<Link>` para `/` (Beats), `/produtores`, `/como-funciona`.
   - **Coluna 3 — Contato**: Instagram (`https://instagram.com/brabamusic` placeholder), WhatsApp (placeholder `https://wa.me/55...`), E-mail (`mailto:contato@brabamusic.com.br` placeholder). Ícones do `lucide-react` (Instagram, MessageCircle, Mail).
   - **Coluna 4 — Plataforma**: links para `/politica-privacidade`, `/termos-uso`, `/suporte` (placeholders — rotas não serão criadas agora; links ficam apontando, abrirão 404 customizado existente).

3. **Barra inferior** (`border-t border-white/10 mt-12 pt-6`)
   - Esquerda: `© 2026 Braba Music. Todos os direitos reservados.`
   - Direita: `Desenvolvido por Cibercafé Studio.`
   - Empilha em mobile.

4. **Estilo**
   - Container externo: `bg-gradient-to-b from-transparent to-background/80 border-t border-primary/20`
   - Links com `hover:text-primary transition-colors` e `hover:[text-shadow:0_0_8px_var(--magenta)]` (glow suave) — usar utility inline.
   - Padding: `pt-20 pb-8 px-4`.
   - Largura máx: `max-w-7xl mx-auto`.

### Configuração de contato
Constantes no topo do `Footer.tsx` (placeholders documentados como configuráveis):
```ts
const CONTACT = {
  instagram: "https://instagram.com/brabamusic",
  whatsapp: "https://wa.me/5500000000000",
  email: "contato@brabamusic.com.br",
};
```

## Arquivos a editar

### `src/routes/__root.tsx`
- Importar `Footer` e renderizar **após** `<main><Outlet /></main>` e **antes** do `<PlayerBar />`.

### `CHANGELOG.md`
- Adicionar sub-seção em **Sprint 0** chamada `### Added (adicional — Footer)` listando:
  - `src/components/Footer.tsx` — rodapé global com 4 colunas + CTA + barra inferior.
  - Edição de `__root.tsx` para montar o `Footer`.
- Nota: nenhuma flag nova; nada desativado.

### `SPRINT_0_REPORT.md`
- Adicionar nova seção `## Adicional — Footer global` descrevendo:
  - Estrutura (CTA + 4 colunas + barra inferior).
  - Placeholders configuráveis de contato (Instagram/WhatsApp/E-mail).
  - Links de Plataforma apontam para rotas ainda inexistentes (Privacidade/Termos/Suporte) — listados como dívida da Sprint 1.
  - Mantido em **Funcionalidades MANTIDAS** sem afetar flags.

## Fora de escopo

- Criação das páginas `/politica-privacidade`, `/termos-uso`, `/suporte` (apenas links placeholder).
- Tornar contatos editáveis via backoffice (vem na Sprint 1).
- Newsletter, redes sociais adicionais, mudança de paleta.

## Responsividade

- `grid-cols-1` mobile → `md:grid-cols-2` tablet → `lg:grid-cols-4` desktop.
- Barra inferior: `flex-col md:flex-row justify-between gap-2`.
- CTA: título reduz para `text-3xl` em mobile, `text-5xl` em desktop.
